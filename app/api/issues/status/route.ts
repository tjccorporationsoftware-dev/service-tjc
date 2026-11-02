import { query } from '@/lib/db'
import { issueStatusQuerySchema, firstIssueMessage } from '@/lib/validations'
import { caseNumber, maskPhone } from '@/lib/display'
import { loadIssueAttachments, loadIssueItems } from '@/lib/issues'
import { checkRateLimit } from '@/lib/rate-limit'

type IssueRow = {
  id: number
  description: string
  status: string
  admin_note: string | null
  created_at: string
  updated_at: string
  org_name: string | null
  project_name: string | null
  project_warranty_start: string | null
  project_warranty_end: string | null
}

/** "CASE-000123" / "case123" / "123" → 123 — ไม่ใช่รูปแบบเลขที่เคสคืน null */
function parseCaseNumber(value: string): number | null {
  const match = /^(?:CASE-?)?0*(\d{1,9})$/.exec(value)
  return match ? Number(match[1]) : null
}

/**
 * GET /api/issues/status?q=&phone= — เช็คสถานะด้วยเลขที่เคส หรือ Serial Number คู่กับเบอร์ที่ใช้แจ้ง
 *
 * เห็นเฉพาะเคสที่แจ้งด้วยเบอร์นั้น — SN เดียวกันอาจถูกแจ้งจากหลายคน (SN ไม่ผูกกับเจ้าของแล้ว)
 * แต่ละคนเห็นแค่เคสของตัวเอง ค่าที่ดูเหมือนเลขเคสค้นทั้งสองแบบ (SN บางรุ่นเป็นตัวเลขล้วน)
 */
export async function GET(request: Request) {
  const limited = checkRateLimit(request, 'issue-status', 30, 60_000)
  if (limited) return limited

  const params = new URL(request.url).searchParams
  const parsed = issueStatusQuerySchema.safeParse({
    q: params.get('q') ?? params.get('sn') ?? '',
    phone: params.get('phone') ?? '',
  })
  if (!parsed.success) {
    return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 })
  }
  const { q, phone } = parsed.data
  const caseId = parseCaseNumber(q)

  const issues = await query<IssueRow>(
    `SELECT ir.id, ir.description, ir.status, ir.admin_note, ir.created_at, ir.updated_at,
            ir.org_name, ir.project_name, ir.project_warranty_start, ir.project_warranty_end
     FROM issue_reports ir
     WHERE ir.reporter_phone = ?
       AND (ir.id = ? OR EXISTS (SELECT 1 FROM issue_items ii WHERE ii.issue_report_id = ir.id AND ii.sn = ?))
     ORDER BY ir.created_at DESC
     LIMIT 50`,
    [phone, caseId ?? 0, q]
  )

  if (issues.length === 0) {
    return Response.json(
      { error: 'ไม่พบข้อมูล — กรุณาตรวจสอบเลขที่เคสหรือ Serial Number และเบอร์โทรที่ใช้แจ้งอีกครั้ง' },
      { status: 404 }
    )
  }

  const ids = issues.map((issue) => issue.id)
  const [items, attachments] = await Promise.all([loadIssueItems(ids), loadIssueAttachments(ids)])

  return Response.json({
    phone: maskPhone(phone),
    issues: issues.map((issue) => ({
      id: issue.id,
      case_number: caseNumber(issue.id),
      description: issue.description,
      status: issue.status,
      admin_note: issue.admin_note,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      org_name: issue.org_name,
      project_name: issue.project_name,
      warranty:
        issue.project_warranty_start && issue.project_warranty_end
          ? { start: issue.project_warranty_start, end: issue.project_warranty_end }
          : null,
      items: (items.get(issue.id) ?? []).map((item) => ({
        product_name: item.product_name,
        model: item.model,
        sn: item.sn,
        description: item.description,
        attachments: (attachments.get(issue.id) ?? [])
          .filter((file) => file.item_id === item.id)
          .map(({ type, url }) => ({ type, url })),
      })),
      // ไฟล์ระดับเคส — เคสหลายรายการที่แจ้งก่อนแยกไฟล์ตามรายการ
      attachments: (attachments.get(issue.id) ?? [])
        .filter((file) => file.item_id === null)
        .map(({ type, url }) => ({ type, url })),
    })),
  })
}
