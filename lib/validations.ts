import { z } from 'zod'

/** เบอร์ไทย 10 หลัก ขึ้นต้นด้วย 0 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^0\d{9}$/, 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก และขึ้นต้นด้วย 0')

export const snSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(5, 'กรุณากรอก Serial Number')
  .max(50, 'Serial Number ยาวเกินไป')

/** แจ้งได้สูงสุดกี่สินค้าต่อครั้ง — กันฟอร์มยาวไม่รู้จบ (ปกติแจ้งกันไม่กี่รายการ) */
export const MAX_REPORT_ITEMS = 20

/** id จากระบบงาน (tjc-api) — null = ลูกค้าพิมพ์เอง ไม่ได้เลือกจากรายการ */
const refIdSchema = z.number().int().positive().nullable()
const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional().or(z.literal(''))

/** สินค้าหนึ่งรายการในเคส — SN ไม่บังคับ (สินค้าบางชนิดไม่มี) แต่ต้องบอกอาการของสินค้านั้น */
export const reportItemSchema = z.object({
  project_item_id: refIdSchema,
  product_name: z.string().trim().min(1, 'กรุณากรอกชื่อสินค้าให้ครบทุกรายการ').max(255, 'ชื่อสินค้ายาวเกินไป'),
  model: optionalText(255, 'รุ่นยาวเกินไป'),
  sn: z
    .string()
    .trim()
    .toUpperCase()
    .max(50, 'Serial Number ยาวเกินไป')
    .refine((v) => v === '' || v.length >= 3, 'Serial Number สั้นเกินไป — ถ้าไม่มีให้เว้นว่างไว้'),
  description: z
    .string()
    .trim()
    .min(5, 'กรุณาอธิบายอาการของสินค้าแต่ละรายการ อย่างน้อย 5 ตัวอักษร')
    .max(2000, 'อาการยาวเกินไป'),
})

/**
 * แจ้งปัญหาหน้าเดียวจบ — หน่วยงาน (+ โครงการ) → สินค้าหลายรายการ → ผู้แจ้ง → รายละเอียดเพิ่มเติม
 * หน่วยงาน/โครงการ/สินค้าเลือกจากข้อมูลหน้างานของระบบงาน (lib/tjc-api.ts) หรือพิมพ์เองก็ได้
 * ชื่อ/รหัสที่มากับ id ถูกตรวจซ้ำกับระบบงานฝั่ง server ก่อนบันทึก (app/api/issues/route.ts)
 */
export const reportSchema = z.object({
  org_customer_id: refIdSchema,
  org_name: z.string().trim().min(1, 'กรุณาค้นหาและเลือกหน่วยงาน หรือพิมพ์ชื่อหน่วยงาน').max(255, 'ชื่อหน่วยงานยาวเกินไป'),
  org_province: optionalText(100, 'ชื่อจังหวัดยาวเกินไป'),
  project_ref_id: refIdSchema,
  project_name: optionalText(255, 'ชื่อโครงการยาวเกินไป'),
  project_code: optionalText(50, 'รหัสโครงการยาวเกินไป'),
  contract_no: optionalText(100, 'เลขที่สัญญายาวเกินไป'),
  items: z
    .array(reportItemSchema)
    .min(1, 'กรุณาเพิ่มสินค้าที่มีปัญหาอย่างน้อย 1 รายการ')
    .max(MAX_REPORT_ITEMS, `แจ้งได้ครั้งละไม่เกิน ${MAX_REPORT_ITEMS} รายการ`),
  reporter_name: z.string().trim().min(1, 'กรุณากรอกชื่อผู้แจ้ง').max(255, 'ชื่อผู้แจ้งยาวเกินไป'),
  phone: phoneSchema,
  email: z.string().trim().min(1, 'กรุณากรอกอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง').max(255),
  description: optionalText(5000, 'รายละเอียดยาวเกินไป'),
  consent: z.boolean().refine((v) => v === true, {
    message: 'กรุณายอมรับประกาศความเป็นส่วนตัว',
  }),
})

export type ReportInput = z.infer<typeof reportSchema>
export type ReportItemInput = z.infer<typeof reportItemSchema>

/** เช็คสถานะ — เลขที่เคส (CASE-000123) หรือ Serial Number อย่างใดอย่างหนึ่ง คู่กับเบอร์ที่ใช้แจ้ง */
export const issueStatusQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'กรุณากรอกเลขที่เคส หรือ Serial Number')
    .max(50, 'เลขที่เคสหรือ Serial Number ยาวเกินไป'),
  phone: phoneSchema,
})

/** ลูกค้าค้นหาหน่วยงาน (/api/lookup/customers) — สั้นกว่า 2 ตัวผลจะกว้างเกินจนไม่มีประโยชน์ */
export const orgSearchSchema = z
  .string()
  .trim()
  .min(2, 'พิมพ์ชื่อหน่วยงานอย่างน้อย 2 ตัวอักษร')
  .max(100, 'คำค้นยาวเกินไป')

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})

export const issueUpdateSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'resolved', 'closed']),
  admin_note: z.string().trim().max(5000).optional().or(z.literal('')),
})

/**
 * PATCH /api/service/issues/[id] — ระบบแจ้งซ่อมเปลี่ยนสถานะเคส
 * `only_if_status` ให้เปลี่ยนเฉพาะเมื่อสถานะปัจจุบันยังเป็นค่าใดค่าหนึ่งในนี้
 * (ระบบแจ้งซ่อมใช้กันไม่ให้ไปทับสถานะที่แอดมินฝั่งนี้ตั้งเองไว้)
 */
export const serviceIssuePatchSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'resolved', 'closed'], {
    message: 'สถานะไม่ถูกต้อง — ต้องเป็น pending, in_progress, resolved หรือ closed',
  }),
  only_if_status: z
    .array(
      z.enum(['pending', 'in_progress', 'resolved', 'closed'], {
        message: 'only_if_status มีค่าที่ไม่รู้จัก',
      })
    )
    .min(1, 'only_if_status ต้องมีอย่างน้อย 1 ค่า')
    .optional(),
})

/** PUT /api/admin/settings — เว้นว่าง = ล้างค่า (ส่งเป็น null ไปกับเคส) */
export const settingsSchema = z.object({
  company_name: z.string().trim().max(255, 'ชื่อบริษัทยาวเกินไป (ไม่เกิน 255 ตัวอักษร)'),
})

/**
 * ข้อจำกัดไฟล์แนบ — จำนวนรูป/วิดีโอนับ "ต่อรายการสินค้า" (ใบงานของระบบงานเก็บไฟล์แยกตามรายการ)
 * ส่วนขนาดรวม (totalMaxSize) นับ "ทุกรายการรวมกัน" เพราะส่งในคำขอเดียว
 */
export const UPLOAD_LIMITS = {
  image: {
    maxCount: 5,
    maxSize: 25 * 1024 * 1024, // 25MB — รูปจากมือถือรุ่นใหม่ใหญ่ได้ถึง ~15MB
    // heic/heif = รูปจาก iPhone · webp = รูปจาก Android บางรุ่นและภาพที่เซฟจากเว็บ
    mimeTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'],
    label: 'รูปภาพ (jpg/png/heic/webp) ขนาดไม่เกิน 25MB ต่อรูป ไม่เกิน 5 รูปต่อรายการ',
  },
  video: {
    maxCount: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    // mp4 = กล้อง Android ส่วนใหญ่ · quicktime = .mov จาก iPhone (iOS ส่งคลิปจากคลังภาพมาเป็น .MOV แม้ช่องรับไฟล์ขอ mp4)
    // 3gpp = Android รุ่นเก่า / แอปแชท · webm = แอปอัดหน้าจอบางตัว
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/3gpp', 'video/webm'],
    label: 'วิดีโอ (mp4/mov/3gp/webm) ไม่เกิน 50MB 1 คลิปต่อรายการ',
  },
  /**
   * เพดานรวมรูป + วิดีโอต่อการแจ้ง 1 ครั้ง — เว็บจริงอยู่หลัง Cloudflare ซึ่งตัดคำขอที่ใหญ่เกิน 100MB
   * เป็น 413 (หน้า HTML) ตั้งแต่ก่อนถึงเซิร์ฟเวอร์ จึงตั้งต่ำกว่าไว้ ~5MB เผื่อหัว multipart และช่องข้อความ
   * ขนาดต่อไฟล์ยังเท่าเดิม แต่แนบเต็มทุกช่อง (5 รูป × 25MB + คลิป 50MB = 175MB) จะไม่ผ่าน
   * หน้าแจ้งปัญหาเตือนตั้งแต่ตอนเลือกไฟล์ — จะให้เกิน 100MB ได้ต้องเปลี่ยนเป็นอัปโหลดทีละไฟล์ ขยายค่านี้อย่างเดียวไม่พอ
   */
  totalMaxSize: 95 * 1024 * 1024, // 95MB
  totalLabel: 'รูปและวิดีโอทุกรายการรวมกันไม่เกิน 95MB ต่อการแจ้ง 1 ครั้ง',
} as const

/** แปลง ZodError เป็นข้อความเดียวสำหรับแสดงผล */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง'
}
