import { unlink } from 'node:fs/promises'
import path from 'node:path'
import type { ResultSetHeader } from 'mysql2'
import { withTransaction } from '@/lib/db'
import { reportSchema, firstIssueMessage, UPLOAD_LIMITS, type ReportInput } from '@/lib/validations'
import { saveUpload, UploadError, UPLOAD_ROOT, type SavedUpload } from '@/lib/uploads'
import { getCustomerProjects } from '@/lib/tjc-api'
import { caseNumber, thaiYearOf } from '@/lib/display'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * แจ้งปัญหาหน้าเดียวจบ — หน่วยงาน (+ โครงการ) + สินค้าหลายรายการ + ผู้แจ้ง + ไฟล์แนบ มาในคำขอเดียว (multipart)
 *
 * ข้อมูลฟอร์มทั้งหมดอยู่ในช่อง `payload` (JSON ตาม reportSchema) เพราะมีรายการสินค้าซ้อนอยู่ข้างใน
 * ส่วนรูป/วิดีโอแยกตามรายการสินค้า: ช่อง `images_<i>` / `video_<i>` (i = ลำดับใน payload.items เริ่มที่ 0)
 * ตรงกับใบงานของระบบงานที่เก็บไฟล์แนบแยกตามรายการ — จำนวนนับต่อรายการ ขนาดรวมนับทั้งคำขอ
 *
 * เคสไม่ผูกกับ registration / SN แล้ว — ผู้แจ้ง หน่วยงาน โครงการ เก็บในเคส สินค้าแต่ละรายการเก็บใน issue_items
 * (SN ไม่บังคับ และ SN เดียวกันแจ้งซ้ำกี่ครั้งกี่เบอร์ก็ได้ — เช็คสถานะต้องรู้เบอร์ที่แจ้งเคสนั้นอยู่ดี)
 */
/** เผื่อหัว multipart + ช่องข้อความ นอกเหนือจากไฟล์ (UPLOAD_LIMITS.totalMaxSize) */
const REQUEST_OVERHEAD = 2 * 1024 * 1024
/** ช่อง payload (JSON ของฟอร์ม) — ข้อความทุกช่องรวมกันตาม reportSchema ไม่มีทางถึงขนาดนี้ */
const MAX_PAYLOAD_CHARS = 256 * 1024

export async function POST(request: Request) {
  const limited = checkRateLimit(request, 'issues', 5, 60_000)
  if (limited) return limited

  // ตัดคำขอที่ใหญ่เกินตั้งแต่ก่อนอ่าน body — request.formData() บัฟเฟอร์ทั้งก้อนเข้าหน่วยความจำ
  // (Cloudflare หน้าเว็บจริงตัดที่ 100MB แต่คำขอที่ยิงตรง/ในวง LAN ไม่ผ่านตรงนั้น)
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > UPLOAD_LIMITS.totalMaxSize + REQUEST_OVERHEAD) {
    return Response.json(
      { error: `ไฟล์แนบใหญ่เกินกำหนด — ${UPLOAD_LIMITS.totalLabel} กรุณาลดจำนวนรูปหรือใช้คลิปที่สั้นลง` },
      { status: 413 }
    )
  }

  let form: FormData
  let payload: unknown
  try {
    form = await request.formData()
    const raw = String(form.get('payload') ?? '')
    if (raw.length > MAX_PAYLOAD_CHARS) {
      return Response.json({ error: 'ข้อมูลฟอร์มใหญ่เกินกำหนด' }, { status: 413 })
    }
    payload = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'อ่านข้อมูลฟอร์มไม่สำเร็จ' }, { status: 400 })
  }

  const parsed = reportSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 })
  }

  // ไฟล์ของแต่ละรายการ — ช่องที่ไม่ตรงกับรายการไหน (เกินจำนวน items) ไม่ถูกอ่านเลย
  const filesOf = (key: string) => form.getAll(key).filter((f): f is File => f instanceof File && f.size > 0)
  const itemFiles = parsed.data.items.map((_, index) => ({
    images: filesOf(`images_${index}`),
    videos: filesOf(`video_${index}`),
  }))

  for (const [index, files] of itemFiles.entries()) {
    if (files.images.length > UPLOAD_LIMITS.image.maxCount) {
      return Response.json({ error: `รายการที่ ${index + 1}: ${UPLOAD_LIMITS.image.label}` }, { status: 400 })
    }
    if (files.videos.length > UPLOAD_LIMITS.video.maxCount) {
      return Response.json({ error: `รายการที่ ${index + 1}: ${UPLOAD_LIMITS.video.label}` }, { status: 400 })
    }
  }

  // เพดานรวมให้ต่ำกว่าที่ Cloudflare รับได้ (ดู UPLOAD_LIMITS.totalMaxSize) — หน้าเว็บกันไว้แล้ว ตรงนี้กันคำขอที่ยิงตรงมา
  // และตัดตั้งแต่ก่อนเริ่มเขียนดิสก์ เพราะ saveUpload() อ่านไฟล์เข้าหน่วยความจำทั้งก้อน
  const totalSize = itemFiles
    .flatMap((files) => [...files.images, ...files.videos])
    .reduce((sum, f) => sum + f.size, 0)
  if (totalSize > UPLOAD_LIMITS.totalMaxSize) {
    return Response.json(
      { error: `ไฟล์แนบใหญ่เกินกำหนด — ${UPLOAD_LIMITS.totalLabel} กรุณาลดจำนวนรูปหรือใช้คลิปที่สั้นลง` },
      { status: 400 }
    )
  }

  // ตรวจหน่วยงาน/โครงการกับระบบงานก่อนเขียนไฟล์ลงดิสก์
  const report = await resolveReferences(parsed.data)
  if ('error' in report) {
    return Response.json({ error: report.error }, { status: 400 })
  }

  // ไฟล์ที่เขียนลงดิสก์แล้ว พร้อมลำดับรายการที่เป็นเจ้าของ — ใช้ผูก issue_item_id ตอนบันทึก และลบทิ้งถ้าบันทึกไม่สำเร็จ
  const saved: (SavedUpload & { itemIndex: number })[] = []
  try {
    for (const [itemIndex, files] of itemFiles.entries()) {
      for (const file of files.images) saved.push({ ...(await saveUpload(file, 'image')), itemIndex })
      for (const file of files.videos) saved.push({ ...(await saveUpload(file, 'video')), itemIndex })
    }
  } catch (err) {
    await cleanup(saved)
    if (err instanceof UploadError) {
      return Response.json({ error: err.message }, { status: 400 })
    }
    console.error('upload failed:', err)
    return Response.json({ error: 'อัปโหลดไฟล์ไม่สำเร็จ' }, { status: 500 })
  }

  try {
    const issueId = await withTransaction(async (conn) => {
      const [inserted] = await conn.execute<ResultSetHeader>(
        `INSERT INTO issue_reports
           (reporter_name, reporter_phone, reporter_email,
            org_customer_id, org_name, org_province,
            project_ref_id, project_name, project_code, contract_no,
            project_warranty_start, project_warranty_end, project_year, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          report.reporter_name,
          report.phone,
          report.email,
          report.org_customer_id,
          report.org_name,
          report.org_province,
          report.project_ref_id,
          report.project_name,
          report.project_code,
          report.contract_no,
          report.warranty?.start ?? null,
          report.warranty?.end ?? null,
          report.project_year,
          report.description,
        ]
      )
      const itemIds: number[] = []
      for (const item of report.items) {
        const [insertedItem] = await conn.execute<ResultSetHeader>(
          `INSERT INTO issue_items (issue_report_id, project_item_id, product_name, model, sn, description)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [inserted.insertId, item.project_item_id, item.product_name, item.model, item.sn, item.description]
        )
        itemIds.push(insertedItem.insertId)
      }
      for (const file of saved) {
        await conn.execute(
          `INSERT INTO issue_attachments (issue_report_id, issue_item_id, file_type, file_path, original_name, file_size)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [inserted.insertId, itemIds[file.itemIndex], file.fileType, file.filePath, file.originalName, file.fileSize]
        )
      }
      return inserted.insertId
    })

    return Response.json(
      {
        issue: {
          id: issueId,
          case_number: caseNumber(issueId),
          org_name: report.org_name,
          project_name: report.project_name,
          project_year: report.project_year,
          warranty: report.warranty,
          items: report.items.map((item) => ({ product_name: item.product_name, model: item.model, sn: item.sn })),
          attachments: saved.length,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    await cleanup(saved)
    console.error('create issue failed:', err)
    return Response.json({ error: 'บันทึกเคสไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 })
  }
}

type ResolvedReport = Omit<
  ReportInput,
  'org_province' | 'project_name' | 'project_code' | 'contract_no' | 'project_year' | 'items' | 'description'
> & {
  org_province: string | null
  project_name: string | null
  project_code: string | null
  contract_no: string | null
  /** ปีของโครงการ (พ.ศ.) · 0 = ลูกค้าเลือก "ไม่แน่ใจ" · null = หน้าเว็บรุ่นก่อนที่ไม่มีช่องนี้ */
  project_year: number | null
  /** วันรับประกันของโครงการ — มาจากระบบงานเท่านั้น (ไม่รับค่าที่หน้าเว็บส่งมา) */
  warranty: { start: string; end: string } | null
  description: string
  items: {
    project_item_id: number | null
    product_name: string
    model: string | null
    sn: string | null
    description: string
  }[]
}

const blank = (value: string | undefined) => value?.trim() || null

/**
 * ยืนยันหน่วยงาน / โครงการ / สินค้าที่ลูกค้าเลือกกับระบบงาน แล้วใช้ชื่อจากระบบงานแทนที่หน้าเว็บส่งมา
 * (กันคนยิงคำขอเองแล้วใส่ id ของหน่วยงานหนึ่งคู่กับชื่ออีกหน่วยงาน — เคสจะไปเปิดใบงานผิดหน้างาน)
 *
 * - พิมพ์หน่วยงานเอง (ไม่มี id) → ไม่มีโครงการให้อ้างอิง เก็บตามที่พิมพ์
 * - ระบบงานติดต่อไม่ได้ชั่วคราว → ไม่ปิดทางแจ้ง เก็บค่าที่หน้าเว็บส่งมา (ซึ่งมาจากผลค้นหาเดียวกันนี้) ไว้ก่อน
 *   ยกเว้นวันรับประกัน — ไม่มีให้ส่งมาจากหน้าเว็บเลย เพราะเจ้าหน้าที่ใช้ตัดสินว่าอยู่ในประกันไหม
 * - สินค้าที่ id ไม่อยู่ในโครงการ → ถือว่าพิมพ์เอง (ล้าง id ทิ้ง เก็บชื่อตามที่ส่งมา)
 */
async function resolveReferences(input: ReportInput): Promise<ResolvedReport | { error: string }> {
  const typed: ResolvedReport = {
    ...input,
    org_customer_id: null,
    org_province: blank(input.org_province),
    project_ref_id: null,
    project_name: null,
    project_code: null,
    contract_no: null,
    // ไม่ส่งมา (หน้าเว็บรุ่นก่อน) = NULL · ส่ง null มา = ลูกค้าเลือก "ไม่แน่ใจ" เก็บเป็น 0 ให้แยกออกจากกันได้
    project_year: input.project_year === undefined ? null : (input.project_year ?? 0),
    warranty: null,
    description: input.description?.trim() ?? '',
    items: input.items.map((item) => ({
      project_item_id: null,
      product_name: item.product_name,
      model: blank(item.model),
      sn: blank(item.sn),
      description: item.description,
    })),
  }
  if (input.org_customer_id === null) return typed

  const lookup = await getCustomerProjects(input.org_customer_id)
  if (!lookup.ok) {
    if (lookup.status === 404) {
      return { error: 'ไม่พบหน่วยงานที่เลือก กรุณาค้นหาและเลือกหน่วยงานใหม่' }
    }
    console.warn(`report: verify org ${input.org_customer_id} skipped (${lookup.error}) — เก็บค่าตามที่หน้าเว็บส่งมา`)
    return {
      ...typed,
      org_customer_id: input.org_customer_id,
      project_ref_id: input.project_ref_id,
      project_name: input.project_ref_id === null ? null : blank(input.project_name),
      project_code: input.project_ref_id === null ? null : blank(input.project_code),
      contract_no: input.project_ref_id === null ? null : blank(input.contract_no),
      items: typed.items.map((item, index) => ({
        ...item,
        project_item_id: input.project_ref_id === null ? null : input.items[index].project_item_id,
      })),
    }
  }

  const { customer, projects } = lookup.data
  const project = input.project_ref_id === null ? null : projects.find((p) => p.id === input.project_ref_id)
  if (input.project_ref_id !== null && !project) {
    return { error: 'โครงการที่เลือกไม่ตรงกับหน่วยงาน กรุณาเลือกโครงการใหม่' }
  }
  const projectItems = new Map(project?.items.map((item) => [item.id, item]))

  return {
    ...typed,
    org_customer_id: customer.id,
    org_name: customer.name,
    org_province: customer.province,
    project_ref_id: project?.id ?? null,
    project_name: project?.name ?? null,
    project_code: project?.code ?? null,
    contract_no: project?.contract_no ?? null,
    // เลือกโครงการจากระบบงาน = ปีของโครงการนั้น (ไม่เชื่อปีที่หน้าเว็บส่งมา) · ไม่ได้เลือกโครงการ = ปีที่ลูกค้าเลือก
    project_year: thaiYearOf(project?.date) ?? typed.project_year,
    warranty: project?.warranty ? { start: project.warranty.start, end: project.warranty.end } : null,
    items: typed.items.map((item, index) => {
      const known = projectItems.get(input.items[index].project_item_id ?? 0)
      return known
        ? { ...item, project_item_id: known.id, product_name: known.name, model: item.model ?? known.model }
        : item
    }),
  }
}

async function cleanup(files: SavedUpload[]) {
  await Promise.all(
    files.map((f) => unlink(path.join(UPLOAD_ROOT, f.filePath)).catch(() => {}))
  )
}
