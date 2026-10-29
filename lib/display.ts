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

export const ISSUE_STATUS_LABEL: Record<string, string> = {
  pending: 'รอดำเนินการ',
  in_progress: 'กำลังดำเนินการ',
  resolved: 'แก้ไขแล้ว',
  closed: 'ปิดเคส',
}

export type SnDisplayStatus = 'available' | 'started' | 'registered' | 'void'

/**
 * สถานะที่ควรโชว์ให้แอดมินดู — ต่างจาก serial_numbers.status ดิบตรงที่แยก
 * "มี registration เปล่าที่ยังไม่มีลูกค้า" (started) ออกจาก "ลูกค้าลงทะเบียนเองแล้ว" (registered)
 * แม้ทั้งคู่จะเก็บเป็น status = 'registered' เหมือนกันในฐานข้อมูลก็ตาม
 * (started เกิดจากปุ่ม "เริ่มประกัน" ยุคก่อนเลิกใช้การรับประกัน — SN ใหม่ไม่มีทางเป็นสถานะนี้แล้ว)
 */
export function snDisplayStatus(snStatus: string, phone: string | null): SnDisplayStatus {
  if (snStatus === 'void') return 'void'
  if (snStatus === 'available') return 'available'
  return phone ? 'registered' : 'started'
}

export const SN_DISPLAY_STATUS_LABEL: Record<SnDisplayStatus, string> = {
  available: 'ยังไม่ลงทะเบียน',
  started: 'รอลูกค้ากรอกข้อมูล',
  registered: 'ลงทะเบียนแล้ว',
  void: 'ยกเลิก',
}
