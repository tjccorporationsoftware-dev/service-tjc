import { query, type SqlParams } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { parsePagination, meta } from '@/lib/pagination'
import { caseNumber } from '@/lib/display'
import {
  WARRANTY_SQL,
  coveredAtReport,
  loadIssueAttachments,
  loadIssueItems,
  type WarrantyFilter,
} from '@/lib/issues'

type Row = {
  id: number
  description: string
  status: string
  admin_note: string | null
  created_at: string
  updated_at: string
  reporter_name: string | null
  reporter_phone: string | null
  reporter_email: string | null
  org_name: string | null
  org_province: string | null
  project_name: string | null
  project_code: string | null
  contract_no: string | null
  project_warranty_start: string | null
  project_warranty_end: string | null
}

const STATUSES = ['pending', 'in_progress', 'resolved', 'closed'] as const

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const params = new URL(request.url).searchParams
  const page = parsePagination(params)

  // เงื่อนไขที่ไม่รวมสถานะ — ใช้นับจำนวนต่อสถานะให้แท็บ แล้วค่อยต่อเงื่อนไขสถานะตอนดึงรายการ
  const where: string[] = []
  const values: SqlParams = []

  const search = params.get('search')?.trim()
  if (search) {
    const like = `%${search}%`
    // "CASE-000012" / "case12" / "12" → ตรงกับเคส #12 ด้วย (นอกจากค้นในข้อความ)
    const caseId = /^(?:case-?)?0*(\d{1,9})$/i.exec(search)?.[1]
    where.push(`(i.reporter_phone LIKE ? OR i.reporter_name LIKE ? OR i.org_name LIKE ? OR i.project_name LIKE ?
                 OR i.description LIKE ?${caseId ? ' OR i.id = ?' : ''}
                 OR EXISTS (SELECT 1 FROM issue_items ii
                            WHERE ii.issue_report_id = i.id
                              AND (ii.sn LIKE ? OR ii.product_name LIKE ? OR ii.description LIKE ?)))`)
    values.push(like, like, like, like, like, ...(caseId ? [Number(caseId)] : []), like, like, like)
  }

  const warranty = params.get('warranty')
  if (warranty && warranty in WARRANTY_SQL) {
    where.push(WARRANTY_SQL[warranty as WarrantyFilter])
  }

  const countRows = await query<{ status: string; count: number }>(
    `SELECT i.status, COUNT(*) AS count
     FROM issue_reports i
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     GROUP BY i.status`,
    values
  )
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<(typeof STATUSES)[number], number>
  for (const row of countRows) {
    if (row.status in counts) counts[row.status as keyof typeof counts] = Number(row.count)
  }
  const all = countRows.reduce((sum, row) => sum + Number(row.count), 0)

  const status = params.get('status')
  if (status && (STATUSES as readonly string[]).includes(status)) {
    where.push('i.status = ?')
    values.push(status)
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const total = status && status in counts ? counts[status as keyof typeof counts] : all

  const rows = await query<Row>(
    `SELECT i.id, i.description, i.status, i.admin_note, i.created_at, i.updated_at,
            i.reporter_name, i.reporter_phone, i.reporter_email,
            i.org_name, i.org_province, i.project_name, i.project_code, i.contract_no,
            i.project_warranty_start, i.project_warranty_end
     FROM issue_reports i
     ${clause}
     ORDER BY i.created_at DESC
     LIMIT ${page.perPage} OFFSET ${page.offset}`,
    values
  )

  const ids = rows.map((row) => row.id)
  const [items, attachments] = await Promise.all([loadIssueItems(ids), loadIssueAttachments(ids)])

  return Response.json({
    issues: rows.map((row) => ({
      ...row,
      case_number: caseNumber(row.id),
      in_warranty: coveredAtReport(row.project_warranty_start, row.project_warranty_end, row.created_at),
      items: (items.get(row.id) ?? []).map((item) => ({
        ...item,
        attachments: (attachments.get(row.id) ?? [])
          .filter((file) => file.item_id === item.id)
          .map(({ type, url }) => ({ type, url })),
      })),
      // ไฟล์ระดับเคส — เคสหลายรายการที่แจ้งก่อนแยกไฟล์ตามรายการ
      attachments: (attachments.get(row.id) ?? [])
        .filter((file) => file.item_id === null)
        .map(({ type, url }) => ({ type, url })),
    })),
    // จำนวนตามตัวกรองค้นหา/ประกัน แยกสถานะ — แท็บสถานะบนหน้าเคสใช้ (ไม่ขึ้นกับสถานะที่เลือกอยู่)
    counts: { all, ...counts },
    meta: meta(total, page),
  })
}
