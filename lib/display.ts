/** ยูทิลิตี้แสดงผลที่ใช้ร่วมกันทั้งฝั่งลูกค้าและแอดมิน — pure module import ได้ทั้ง client และ server */

/** PDPA: ปิดบังเบอร์โทรก่อนแสดงในหน้า public — 0812345678 → 08x-xxx-5678 */
export function maskPhone(phone: string): string {
  if (phone.length !== 10) return phone
  return `${phone.slice(0, 2)}x-xxx-${phone.slice(6)}`
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
