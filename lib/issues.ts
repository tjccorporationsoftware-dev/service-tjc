import { query } from '@/lib/db'
import { warrantyState } from '@/lib/display'
import { todayIso } from '@/lib/thai-date'
import { fileUrl } from '@/lib/uploads'

/**
 * อ่านสินค้า/ไฟล์แนบของหลายเคสพร้อมกัน — ใช้ร่วมกันทั้งหน้าเช็คสถานะ หลังบ้าน และ API ของระบบงาน
 * (1 เคสมีสินค้าได้หลายรายการใน issue_items — เคสยุคก่อนถูก db:init คัดลอกมาเป็น 1 รายการแล้ว)
 */

export type IssueItem = {
  id: number
  project_item_id: number | null
  product_name: string
  model: string | null
  sn: string | null
  /** อาการของสินค้านี้ — เคสยุคก่อนเป็น null (อาการอยู่ที่ description ของเคส) */
  description: string | null
}

/** item_id = รายการสินค้าที่ไฟล์นี้แนบมา · null = ไฟล์ระดับเคส (เคสหลายรายการที่แจ้งก่อนแยกไฟล์ตามรายการ) */
export type IssueAttachment = { id: number; item_id: number | null; type: 'image' | 'video'; url: string }

function groupBy<T extends { issue_report_id: number }>(rows: T[]) {
  const map = new Map<number, Omit<T, 'issue_report_id'>[]>()
  for (const { issue_report_id, ...rest } of rows) {
    const list = map.get(issue_report_id) ?? []
    list.push(rest)
    map.set(issue_report_id, list)
  }
  return map
}

export async function loadIssueItems(issueIds: number[]): Promise<Map<number, IssueItem[]>> {
  if (issueIds.length === 0) return new Map()
  const rows = await query<IssueItem & { issue_report_id: number }>(
    `SELECT issue_report_id, id, project_item_id, product_name, model, sn, description
     FROM issue_items
     WHERE issue_report_id IN (${issueIds.map(() => '?').join(',')})
     ORDER BY issue_report_id, id`,
    issueIds
  )
  return groupBy(rows)
}

export async function loadIssueAttachments(issueIds: number[]): Promise<Map<number, IssueAttachment[]>> {
  if (issueIds.length === 0) return new Map()
  const rows = await query<{
    issue_report_id: number
    id: number
    issue_item_id: number | null
    file_type: 'image' | 'video'
    file_path: string
  }>(
    `SELECT issue_report_id, id, issue_item_id, file_type, file_path
     FROM issue_attachments
     WHERE issue_report_id IN (${issueIds.map(() => '?').join(',')})
     ORDER BY id`,
    issueIds
  )
  const map = new Map<number, IssueAttachment[]>()
  for (const row of rows) {
    const list = map.get(row.issue_report_id) ?? []
    list.push({ id: row.id, item_id: row.issue_item_id, type: row.file_type, url: fileUrl(row.file_path) })
    map.set(row.issue_report_id, list)
  }
  return map
}

/**
 * เคสอยู่ในประกันไหม ณ วันที่ลูกค้าแจ้ง — กติกาเดียวกับ in_warranty ที่ส่งให้ระบบงาน (ยังไม่เริ่มนับ = อยู่ในประกัน)
 * null = เคสไม่มีวันรับประกันของโครงการ (ไม่ได้เลือกโครงการ หรือระบบงานล่มตอนบันทึก)
 */
export function coveredAtReport(
  start: string | null,
  end: string | null,
  createdAt: string | Date
): boolean | null {
  if (!start || !end) return null
  return warrantyState(start, end, todayIso(new Date(createdAt))).kind !== 'expired'
}

/** กติกาเดียวกับ coveredAtReport() ในรูปเงื่อนไข SQL — ใช้กับ issue_reports ที่ตั้ง alias เป็น `i` */
export const WARRANTY_SQL = {
  in: `(i.project_warranty_start IS NOT NULL AND i.project_warranty_end IS NOT NULL
        AND DATE(i.created_at) <= i.project_warranty_end)`,
  expired: `(i.project_warranty_start IS NOT NULL AND i.project_warranty_end IS NOT NULL
             AND DATE(i.created_at) > i.project_warranty_end)`,
  none: '(i.project_warranty_start IS NULL OR i.project_warranty_end IS NULL)',
} as const

export type WarrantyFilter = keyof typeof WARRANTY_SQL

/** "เครื่องสำรองไฟ (Smart-UPS 3000)" */
export function itemLabel(item: Pick<IssueItem, 'product_name' | 'model'>): string {
  return item.model ? `${item.product_name} (${item.model})` : item.product_name
}

/** สรุปสินค้าในเคสเป็นข้อความสั้น — "เครื่องสำรองไฟ และอีก 2 รายการ" */
export function productSummary(items: Pick<IssueItem, 'product_name' | 'model'>[]): string {
  if (items.length === 0) return 'ไม่ระบุสินค้า'
  const first = itemLabel(items[0])
  return items.length > 1 ? `${first} และอีก ${items.length - 1} รายการ` : first
}

/**
 * อาการทั้งหมดของเคสเป็นข้อความเดียว — ให้ระบบงานรุ่นที่ยังไม่รู้จัก items (อ่านแค่ description) เห็นอาการครบ
 * เคสยุคก่อนไม่มีอาการรายสินค้า คืน description เดิม
 */
export function combinedDescription(description: string, items: IssueItem[]): string {
  const described = items.filter((item) => item.description)
  if (described.length === 0) return description

  const lines =
    described.length === 1 && items.length === 1
      ? [described[0].description as string]
      : described.map(
          (item, index) =>
            `${index + 1}) ${itemLabel(item)}${item.sn ? ` [SN ${item.sn}]` : ''}: ${item.description}`
        )
  if (description.trim()) lines.push(`รายละเอียดเพิ่มเติม: ${description.trim()}`)
  return lines.join('\n')
}
