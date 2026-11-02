/** ยูทิลิตี้แสดงผลที่ใช้ร่วมกันทั้งฝั่งลูกค้าและแอดมิน — pure module import ได้ทั้ง client และ server */

/** PDPA: ปิดบังเบอร์โทรก่อนแสดงในหน้า public — 0812345678 → 08x-xxx-5678 */
export function maskPhone(phone: string): string {
  if (phone.length !== 10) return phone
  return `${phone.slice(0, 2)}x-xxx-${phone.slice(6)}`
}

/** ปีของโครงการเก่าสุดที่ให้ลูกค้าเลือกได้ (พ.ศ.) — เก่ากว่านี้เลือก "ไม่แน่ใจ" */
export const PROJECT_YEAR_MIN = 2566

/** ปีปัจจุบันเป็น พ.ศ. (เวลาเครื่อง local) */
export function currentThaiYear(now = new Date()): number {
  return now.getFullYear() + 543
}

/** 'YYYY-MM-DD' → ปี พ.ศ. · ค่าว่าง/ผิดรูปแบบ → null */
export function thaiYearOf(iso: string | null | undefined): number | null {
  const year = Number(iso?.slice(0, 4))
  return Number.isInteger(year) && year > 1900 ? year + 543 : null
}

/**
 * ป้ายปีของโครงการที่ลูกค้าเลือกตอนแจ้ง (issue_reports.project_year)
 * 0 = ลูกค้าเลือก "ไม่แน่ใจ" · null = เคสที่แจ้งก่อนมีช่องนี้ (ไม่แสดงป้าย)
 */
export function projectYearLabel(year: number | null | undefined): string | null {
  if (year === null || year === undefined) return null
  return year === 0 ? 'ไม่แน่ใจปี' : `ปี ${year}`
}

/** เลขที่เคสสำหรับแสดงผล — 12 → CASE-000012 */
export function caseNumber(id: number): string {
  return `CASE-${String(id).padStart(6, '0')}`
}

export type WarrantyState =
  | { kind: 'not_started'; label: string }
  | { kind: 'active'; days: number; label: string }
  | { kind: 'expired'; label: string }

/** ใกล้หมดประกันเมื่อเหลือไม่เกินกี่วัน — ค่าเริ่มต้นเดียวกับ alert_warranty_days ของระบบงาน */
export const WARRANTY_ALERT_DAYS = 30

/**
 * สถานะประกันของโครงการ ณ วันที่ `on` (ทุกค่าเป็น 'YYYY-MM-DD' local) — นับแบบ project_dashboard.php:
 * ก่อนวันเริ่ม = ยังไม่เริ่มนับ · ถึงวันหมด (รวมวันหมด) = อยู่ในประกัน · หลังจากนั้น = หมดประกัน
 */
export function warrantyState(start: string, end: string, on: string): WarrantyState {
  if (on < start) return { kind: 'not_started', label: 'ยังไม่เริ่มนับระยะประกัน' }
  if (on > end) return { kind: 'expired', label: 'หมดประกันแล้ว' }
  const days = Math.round((Date.parse(`${end}T00:00:00`) - Date.parse(`${on}T00:00:00`)) / 86_400_000) + 1
  return { kind: 'active', days, label: `อยู่ในประกัน · เหลืออีก ${days.toLocaleString('th-TH')} วัน` }
}

export const ISSUE_STATUS_LABEL: Record<string, string> = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังดำเนินการ',
  resolved: 'แก้ไขแล้ว',
  closed: 'ปิดเคส',
}
