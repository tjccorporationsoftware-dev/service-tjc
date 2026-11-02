import { query } from '@/lib/db'
import { loadIssueItems } from '@/lib/issues'
import {
  SERVICE_ISSUE_COLUMNS,
  requireServiceKey,
  toServiceIssue,
  type ServiceIssueRow,
} from '@/lib/service-api'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSettings } from '@/lib/settings'

/**
 * GET /api/service/issues — รายการเคสที่ลูกค้าแจ้งและยังไม่ปิด
 *
 * ใช้โดยระบบแจ้งซ่อม (tjc-api-server) เพื่อขึ้นกล่องแจ้งเตือนให้พนักงานเปิดใบงาน
 * คืนชุดข้อมูลเดียวกับที่ฝั่งนั้นเคยอ่านจากฐานโดยตรง เพื่อให้สลับไปมาได้โดยหน้าจอไม่เปลี่ยน
 *
 * เอาเฉพาะ pending / in_progress — ที่ resolved/closed ถือว่าจบที่ฝั่งนี้แล้ว
 * ทุกเคสมี company_name = ชื่อบริษัทที่แอดมินตั้งในหน้า "ตั้งค่า" (null ถ้ายังไม่ได้ตั้ง)
 * รูปแบบแต่ละเคสดู toServiceIssue() ใน lib/service-api.ts
 */

const MAX_LIMIT = 200

export async function GET(request: Request) {
  // key รั่วแล้วโดนยิงรัว ๆ ยังจำกัดความเสียหายได้ระดับหนึ่ง
  const limited = checkRateLimit(request, 'service-api', 120, 60_000)
  if (limited) return limited

  const auth = requireServiceKey(request)
  if (!auth.ok) return auth.response

  const raw = Number(new URL(request.url).searchParams.get('limit'))
  // ต่อลง SQL ตรง ๆ ไม่ได้ถ้าไม่ clamp ก่อน (mysql2 ไม่รับ placeholder ใน LIMIT)
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), MAX_LIMIT) : 50

  const rows = await query<ServiceIssueRow & { file_count: number }>(
    `SELECT ${SERVICE_ISSUE_COLUMNS},
            (SELECT COUNT(*) FROM issue_attachments ia WHERE ia.issue_report_id = ir.id) AS file_count
     FROM issue_reports ir
     WHERE ir.status IN ('pending', 'in_progress')
     ORDER BY ir.created_at DESC
     LIMIT ${limit}`
  )

  const [items, { company_name }] = await Promise.all([
    loadIssueItems(rows.map((row) => row.id)),
    getSettings(),
  ])

  return Response.json({
    issues: rows.map((row) => ({
      ...toServiceIssue(row, items.get(row.id) ?? [], company_name),
      file_count: Number(row.file_count),
    })),
  })
}
