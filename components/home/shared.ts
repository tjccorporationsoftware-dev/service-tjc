import type { CSSProperties } from 'react'

// ส่วนที่ hero ทุก design ใช้ร่วมกัน (components/home/tech.tsx, eco.tsx, clinical.tsx)

/** หน่วงจังหวะอนิเมชันตอนโหลดหน้า — ใช้ inline style เพราะ class หน่วงเวลาอาจถูก shorthand ของ animate-* ทับ */
export const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })

export const TRUST = ['ไม่ต้องสมัครสมาชิก', 'แจ้งหลายสินค้าได้ในครั้งเดียว', 'ข้อมูลปลอดภัยตาม PDPA']

/** ขั้นตอนในการ์ดจำลองหน้าสถานะเคส (ภาพประกอบ hero ไม่ใช่ข้อมูลจริง) */
export const TIMELINE = [
  { title: 'แจ้งปัญหา', detail: 'แนบรูป 3 รูป · วิดีโอ 1 คลิป', state: 'done' },
  { title: 'รับเรื่องแล้ว', detail: 'ได้เลขที่เคสทันที', state: 'done' },
  { title: 'ทีมงานกำลังตรวจสอบ', detail: 'อัปเดตล่าสุดวันนี้', state: 'current' },
  { title: 'เสร็จสิ้น', detail: 'แจ้งผลผ่านหน้าเช็คสถานะ', state: 'pending' },
] as const
