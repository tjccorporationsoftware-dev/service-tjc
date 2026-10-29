import { queryOne, query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const serials = await queryOne<{
    total: number
    available: number
    registered: number
    void_count: number
  }>(
    `SELECT COUNT(*) AS total,
            SUM(status = 'available')  AS available,
            SUM(status = 'registered') AS registered,
            SUM(status = 'void')       AS void_count
     FROM serial_numbers`
  )

  // นับเฉพาะแถวที่มีข้อมูลลูกค้าแล้ว — registration เปล่าจากยุค "เริ่มประกัน" ยังไม่ใช่การลงทะเบียนของลูกค้า
  const registrations = await queryOne<{ total: number; this_month: number }>(
    `SELECT COUNT(*) AS total,
            SUM(registered_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS this_month
     FROM registrations
     WHERE phone IS NOT NULL`
  )

  const issues = await queryOne<{
    total: number
    pending: number
    in_progress: number
    resolved: number
    closed: number
  }>(
    `SELECT COUNT(*) AS total,
            SUM(status = 'pending')     AS pending,
            SUM(status = 'in_progress') AS in_progress,
            SUM(status = 'resolved')    AS resolved,
            SUM(status = 'closed')      AS closed
     FROM issue_reports`
  )

  const recentIssues = await query(
    `SELECT i.id, i.status, i.created_at, s.sn, p.name AS product_name
     FROM issue_reports i
     JOIN registrations r ON r.id = i.registration_id
     JOIN serial_numbers s ON s.id = r.serial_number_id
     JOIN products p ON p.id = s.product_id
     ORDER BY i.created_at DESC
     LIMIT 5`
  )

  // SUM() คืนค่าเป็น string/null จาก MariaDB — แปลงเป็น number ให้ฝั่ง client ใช้ง่าย
  const num = (v: unknown) => Number(v ?? 0)

  return Response.json({
    serials: {
      total: num(serials?.total),
      available: num(serials?.available),
      registered: num(serials?.registered),
      void: num(serials?.void_count),
    },
    registrations: {
      total: num(registrations?.total),
      this_month: num(registrations?.this_month),
    },
    issues: {
      total: num(issues?.total),
      pending: num(issues?.pending),
      in_progress: num(issues?.in_progress),
      resolved: num(issues?.resolved),
      closed: num(issues?.closed),
    },
    recent_issues: recentIssues,
  })
}
