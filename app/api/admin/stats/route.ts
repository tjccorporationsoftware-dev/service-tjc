import { queryOne, query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { caseNumber } from '@/lib/display'
import { WARRANTY_SQL, coveredAtReport, loadIssueItems, productSummary } from '@/lib/issues'

/** เคสที่ยังไม่มีใครรับเรื่องเกินกี่วันถึงนับว่าค้าง */
const STALE_DAYS = 3

/** หน่วยงานที่แจ้งบ่อย — นับย้อนหลังกี่วัน */
const TOP_ORG_DAYS = 90

type CaseRow = {
  id: number
  status: string
  created_at: string
  org_name: string | null
  project_name: string | null
  project_warranty_start: string | null
  project_warranty_end: string | null
}

const CASE_COLUMNS = `i.id, i.status, i.created_at, i.org_name, i.project_name,
  i.project_warranty_start, i.project_warranty_end`

/** ภาพรวมหลังบ้าน — ทุกตัวเลขมาจากเคสแจ้งปัญหา */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const issues = await queryOne<Record<string, number | null>>(
    `SELECT COUNT(*) AS total,
            SUM(i.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS this_month,
            SUM(i.status = 'pending')     AS pending,
            SUM(i.status = 'in_progress') AS in_progress,
            SUM(i.status = 'resolved')    AS resolved,
            SUM(i.status = 'closed')      AS closed,
            SUM(i.status IN ('pending', 'in_progress') AND ${WARRANTY_SQL.in})      AS open_in,
            SUM(i.status IN ('pending', 'in_progress') AND ${WARRANTY_SQL.expired}) AS open_expired,
            SUM(i.status IN ('pending', 'in_progress') AND ${WARRANTY_SQL.none})    AS open_none,
            SUM(i.status = 'pending' AND i.created_at < NOW() - INTERVAL ${STALE_DAYS} DAY) AS stale
     FROM issue_reports i`
  )

  const [stale, recent, topOrgs] = await Promise.all([
    query<CaseRow & { days_waiting: number }>(
      `SELECT ${CASE_COLUMNS}, DATEDIFF(CURDATE(), DATE(i.created_at)) AS days_waiting
       FROM issue_reports i
       WHERE i.status = 'pending' AND i.created_at < NOW() - INTERVAL ${STALE_DAYS} DAY
       ORDER BY i.created_at ASC
       LIMIT 5`
    ),
    query<CaseRow>(
      `SELECT ${CASE_COLUMNS}
       FROM issue_reports i
       ORDER BY i.created_at DESC
       LIMIT 6`
    ),
    query<{ org_name: string; count: number }>(
      `SELECT i.org_name, COUNT(*) AS count
       FROM issue_reports i
       WHERE i.org_name IS NOT NULL AND i.org_name <> ''
         AND i.created_at >= CURDATE() - INTERVAL ${TOP_ORG_DAYS} DAY
       GROUP BY i.org_name
       ORDER BY count DESC, MAX(i.created_at) DESC
       LIMIT 5`
    ),
  ])

  const items = await loadIssueItems([...stale, ...recent].map((row) => row.id))
  const toCase = (row: CaseRow) => {
    const list = items.get(row.id) ?? []
    return {
      id: row.id,
      case_number: caseNumber(row.id),
      status: row.status,
      created_at: row.created_at,
      org_name: row.org_name,
      project_name: row.project_name,
      product_summary: productSummary(list),
      item_count: list.length,
      in_warranty: coveredAtReport(row.project_warranty_start, row.project_warranty_end, row.created_at),
    }
  }

  // SUM() คืนค่าเป็น string/null จาก MariaDB — แปลงเป็น number ให้ฝั่ง client ใช้ง่าย
  const num = (v: unknown) => Number(v ?? 0)

  return Response.json({
    issues: {
      total: num(issues?.total),
      this_month: num(issues?.this_month),
      pending: num(issues?.pending),
      in_progress: num(issues?.in_progress),
      resolved: num(issues?.resolved),
      closed: num(issues?.closed),
    },
    // เคสที่ยังเปิดอยู่ (รอดำเนินการ + กำลังดำเนินการ) แยกตามประกัน ณ วันแจ้ง
    open_warranty: {
      in: num(issues?.open_in),
      expired: num(issues?.open_expired),
      none: num(issues?.open_none),
    },
    stale: {
      days: STALE_DAYS,
      count: num(issues?.stale),
      cases: stale.map((row) => ({ ...toCase(row), days_waiting: num(row.days_waiting) })),
    },
    recent: recent.map(toCase),
    top_orgs: {
      days: TOP_ORG_DAYS,
      orgs: topOrgs.map((row) => ({ org_name: row.org_name, count: num(row.count) })),
    },
  })
}
