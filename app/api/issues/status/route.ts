import { query } from '@/lib/db'
import { issueStatusQuerySchema, firstIssueMessage } from '@/lib/validations'
import { caseNumber, maskPhone } from '@/lib/display'
import { fileUrl } from '@/lib/uploads'
import { checkRateLimit } from '@/lib/rate-limit'

type IssueRow = {
  id: number
  description: string
  status: string
  admin_note: string | null
  created_at: string
  updated_at: string
}

export async function GET(request: Request) {
  const limited = checkRateLimit(request, 'issue-status', 30, 60_000)
  if (limited) return limited

  const params = new URL(request.url).searchParams
  const parsed = issueStatusQuerySchema.safeParse({
    sn: params.get('sn') ?? '',
    phone: params.get('phone') ?? '',
  })
  if (!parsed.success) {
    return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 })
  }
  const { sn, phone } = parsed.data

  const [registration] = await query<{
    id: number
    phone: string
    registered_at: string
    product_name: string
    sn: string
  }>(
    `SELECT r.id, r.phone, r.registered_at, p.name AS product_name, s.sn
     FROM registrations r
     JOIN serial_numbers s ON s.id = r.serial_number_id
     JOIN products p ON p.id = s.product_id
     WHERE s.sn = ? AND r.phone = ?`,
    [sn, phone]
  )

  if (!registration) {
    return Response.json(
      { error: 'ไม่พบข้อมูล — กรุณาตรวจสอบ Serial Number และเบอร์โทรอีกครั้ง' },
      { status: 404 }
    )
  }

  const issues = await query<IssueRow>(
    `SELECT id, description, status, admin_note, created_at, updated_at
     FROM issue_reports
     WHERE registration_id = ?
     ORDER BY created_at DESC`,
    [registration.id]
  )

  const attachments = issues.length
    ? await query<{ issue_report_id: number; file_type: string; file_path: string }>(
        `SELECT issue_report_id, file_type, file_path
         FROM issue_attachments
         WHERE issue_report_id IN (${issues.map(() => '?').join(',')})
         ORDER BY id`,
        issues.map((i) => i.id)
      )
    : []

  return Response.json({
    registration: {
      sn: registration.sn,
      product_name: registration.product_name,
      phone: maskPhone(registration.phone),
      registered_at: registration.registered_at,
    },
    issues: issues.map((issue) => ({
      id: issue.id,
      case_number: caseNumber(issue.id),
      description: issue.description,
      status: issue.status,
      admin_note: issue.admin_note,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      attachments: attachments
        .filter((a) => a.issue_report_id === issue.id)
        .map((a) => ({ type: a.file_type, url: fileUrl(a.file_path) })),
    })),
  })
}
