import { timingSafeEqual } from 'node:crypto'
import { combinedDescription, coveredAtReport, productSummary, type IssueItem } from '@/lib/issues'

/**
 * ยืนยันตัวตนสำหรับ "เครื่องคุยกับเครื่อง" — ใช้โดย /api/service/* ซึ่งระบบแจ้งซ่อม (PHP) เรียกเข้ามา
 *
 * แยกจาก requireAdmin() โดยเจตนา: ตรงนั้นเป็น JWT ใน cookie ของ "คน" ที่ล็อกอินหน้าเว็บ
 * ส่วนตรงนี้เป็นระบบอื่นเรียกมา ไม่มี session ไม่มีเบราว์เซอร์ จึงใช้ key คงที่ใน env แทน
 *
 * ไม่ตั้ง SERVICE_API_KEY = ปิดช่องทางนี้ทั้งหมด (ตอบ 503) — ค่าเริ่มต้นจึงปลอดภัยเสมอ
 * deploy ที่ยังไม่ได้ใช้ API จะไม่มีทางเปิดรูไว้โดยไม่ตั้งใจ
 */

/** ความยาวขั้นต่ำของ key — สั้นกว่านี้เดาได้ง่ายเกินไป */
const MIN_KEY_LENGTH = 32

/**
 * ฟิลด์ประกันที่ต้องตอบไว้ในเคสของ /api/service/issues* ทั้งที่เลิกใช้ระบบประกันแล้ว — ค่าคงที่ ไม่ได้อ่านจาก DB
 *
 * ระบบแจ้งซ่อม tjc-api (PHP) ยังอ่าน 3 ฟิลด์นี้อยู่ (warranty_inbox.php, service_dashboard.php, ServiceRequest.php)
 * และแก้ฝั่งนั้นไม่ได้เพราะ ASCENT ซึ่งยังใช้ระบบประกันใช้ repo ร่วมกัน — ถ้าฟิลด์หายไป PHP ขึ้น Warning
 * ค่าชุดนี้ทำให้ `!empty($issue['warranty_end'])` เป็น false ป้ายประกันฝั่งนั้นจึงซ่อนเอง
 * ห้ามถอดออกจนกว่า tjc-api จะเลิกอ่านฟิลด์เหล่านี้
 */
export const LEGACY_WARRANTY_FIELDS = {
  in_warranty: 0,
  warranty_start: null,
  warranty_end: null,
} as const

/** คอลัมน์ของ issue_reports ที่ /api/service/issues* อ่าน — ใช้ร่วมกันทั้งหน้ารายการและเคสเดียว */
export const SERVICE_ISSUE_COLUMNS = `ir.id, ir.description, ir.status, ir.created_at,
  ir.reporter_name, ir.reporter_phone, ir.reporter_email,
  ir.org_name, ir.org_province, ir.project_ref_id, ir.project_name, ir.project_code, ir.contract_no,
  ir.project_warranty_start, ir.project_warranty_end, ir.project_year`

export type ServiceIssueRow = {
  id: number
  description: string
  status: string
  created_at: string
  reporter_name: string | null
  reporter_phone: string | null
  reporter_email: string | null
  org_name: string | null
  org_province: string | null
  project_ref_id: number | null
  project_name: string | null
  project_code: string | null
  contract_no: string | null
  project_warranty_start: string | null
  project_warranty_end: string | null
  project_year: number | null
}

/**
 * ฟิลด์ประกันที่ส่งให้ระบบงาน — เคสที่เลือกโครงการซึ่งมีวันรับประกัน ส่งวันจริงของโครงการ
 * (in_warranty นับ ณ วันที่ลูกค้าแจ้ง: ยังไม่เริ่มนับหรือยังไม่หมด = 1) กล่องแจ้งเตือนฝั่งนั้นจึงขึ้นป้ายอยู่ใน/หมดประกันได้
 * เคสที่ไม่มีข้อมูลประกันส่งค่าคงที่ LEGACY_WARRANTY_FIELDS แบบเดิม
 */
function warrantyFields(row: ServiceIssueRow) {
  const start = row.project_warranty_start
  const end = row.project_warranty_end
  if (!start || !end) return LEGACY_WARRANTY_FIELDS
  return {
    in_warranty: coveredAtReport(start, end, row.created_at) ? 1 : 0,
    warranty_start: start,
    warranty_end: end,
  }
}

/**
 * รูปแบบเคสที่ส่งให้ระบบงาน — ฟิลด์ชุดเดิม (customer_name, phone, sn, product_name, description ...) ชื่อและความหมายเดิม
 * ให้ระบบงานรุ่นที่ยังไม่รู้จัก items ทำงานต่อได้ ส่วนข้อมูลใหม่อยู่ในฟิลด์ที่เพิ่มต่อท้าย:
 *
 * - description = อาการทั้งหมดรวมเป็นข้อความเดียว (combinedDescription) · note = รายละเอียดเพิ่มเติมที่ลูกค้าเขียนเอง
 * - customer_name / phone / email = ผู้แจ้ง · org_* = หน่วยงาน · project_* / contract_no = โครงการที่ลูกค้าเลือก (project_id = projects.id)
 * - project_year = ปีของโครงการ (พ.ศ.) · 0 = ลูกค้าเลือก "ไม่แน่ใจ" · null = เคสก่อนมีช่องนี้
 * - sn = SN แรกที่มี (null ถ้าไม่มีเลย) · product_name / model = สินค้าเดียว หรือสรุป "… และอีก n รายการ"
 * - items = สินค้าทุกรายการพร้อม SN และอาการของแต่ละรายการ
 */
export function toServiceIssue(row: ServiceIssueRow, items: IssueItem[], companyName: string | null) {
  const single = items.length === 1 ? items[0] : null
  // เคสยุคก่อน (db:init คัดลอกสินค้ามาให้ ไม่มีอาการรายสินค้า) — อาการของเคสคืออาการของสินค้าชิ้นนั้น ไม่ใช่ "รายละเอียดเพิ่มเติม"
  const legacy = items.every((item) => item.description === null)
  return {
    id: row.id,
    description: combinedDescription(row.description, items),
    status: row.status,
    created_at: row.created_at,
    customer_name: row.reporter_name,
    phone: row.reporter_phone,
    email: row.reporter_email,
    sn: items.find((item) => item.sn)?.sn ?? null,
    product_name: single ? single.product_name : productSummary(items),
    brand: null,
    model: single ? single.model : null,
    note: legacy ? '' : row.description,
    org_name: row.org_name,
    org_province: row.org_province,
    // projects.id ของระบบงาน — ฝั่งนั้นอ่านงบประมาณ/วันสัญญาจากฐานตัวเองด้วย id นี้ (ไม่ส่งผ่านเว็บนี้เพราะหน้าค้นหาเป็นสาธารณะ)
    project_id: row.project_ref_id,
    project_name: row.project_name,
    project_code: row.project_code,
    contract_no: row.contract_no,
    // ปีของโครงการ (พ.ศ.) ที่ลูกค้าเลือก — 0 = ลูกค้าไม่แน่ใจ · null = เคสที่แจ้งก่อนมีช่องนี้
    project_year: row.project_year,
    items: items.map((item, index) => ({
      product_name: item.product_name,
      model: item.model,
      sn: item.sn,
      description: legacy && index === 0 ? row.description : item.description,
    })),
    company_name: companyName,
    ...warrantyFields(row),
  }
}

export type ServiceAuthResult = { ok: true } | { ok: false; response: Response }

function unauthorized(): Response {
  // ไม่บอกว่าผิดเพราะไม่มี header หรือ key ไม่ตรง — กันคนเดาว่าเดามาถูกทางแล้ว
  return Response.json({ error: 'ไม่ได้รับอนุญาต' }, { status: 401 })
}

/** เทียบ key แบบใช้เวลาเท่ากันทุกกรณี กันเดาทีละตัวอักษรจากเวลาที่ตอบกลับ */
function keysMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  if (a.length !== b.length) {
    // ยาวไม่เท่ากันก็ยังต้องเทียบให้เสียเวลาพอ ๆ กัน ไม่ใช่ตอบกลับทันที
    timingSafeEqual(a, a)
    return false
  }
  return timingSafeEqual(a, b)
}

export function requireServiceKey(request: Request): ServiceAuthResult {
  const expected = process.env.SERVICE_API_KEY

  if (!expected) {
    return {
      ok: false,
      response: Response.json(
        { error: 'ช่องทางนี้ยังไม่เปิดใช้งาน — ผู้ดูแลระบบต้องตั้งค่า SERVICE_API_KEY ก่อน' },
        { status: 503 }
      ),
    }
  }

  if (expected.length < MIN_KEY_LENGTH) {
    // ตั้ง key สั้นเกินไป = อันตรายกว่าปิดไว้ ให้ถือว่ายังไม่เปิดใช้งาน และบอกให้ไปแก้
    console.error(
      `SERVICE_API_KEY สั้นเกินไป (${expected.length} ตัวอักษร) — ต้องอย่างน้อย ${MIN_KEY_LENGTH} ตัว จึงยังไม่เปิดใช้งานช่องทางนี้`
    )
    return {
      ok: false,
      response: Response.json({ error: 'ช่องทางนี้ยังไม่เปิดใช้งาน' }, { status: 503 }),
    }
  }

  const header = request.headers.get('authorization') ?? ''
  const given = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!given || !keysMatch(given, expected)) {
    return { ok: false, response: unauthorized() }
  }

  return { ok: true }
}
