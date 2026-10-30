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

// ลูกค้ากรอกเองทั้งหมด เจ้าหน้าที่ไม่ต้องเตรียมอะไรไว้ก่อน — ทั้งผลิตภัณฑ์และ SN
// (ดูว่าจับคู่กับข้อมูลเดิมในระบบอย่างไรที่ app/api/register/route.ts)
export const registerSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกชื่อผู้ซื้อหรือชื่อหน่วยงาน')
    .max(255),
  phone: phoneSchema,
  email: z.string().trim().min(1, 'กรุณากรอกอีเมล').email('รูปแบบอีเมลไม่ถูกต้อง').max(255),
  sn: snSchema,
  product_name: z.string().trim().min(1, 'กรุณากรอกชื่อสินค้า').max(255, 'ชื่อสินค้ายาวเกินไป'),
  product_brand: z.string().trim().max(100, 'ยี่ห้อยาวเกินไป').optional().or(z.literal('')),
  product_model: z.string().trim().max(100, 'รุ่นยาวเกินไป').optional().or(z.literal('')),
  consent: z.boolean().refine((v) => v === true, {
    message: 'กรุณายอมรับประกาศความเป็นส่วนตัว',
  }),
})

export const issueReportSchema = z.object({
  sn: snSchema,
  phone: phoneSchema,
  description: z
    .string()
    .trim()
    .min(10, 'กรุณาอธิบายปัญหาอย่างน้อย 10 ตัวอักษร')
    .max(5000, 'รายละเอียดยาวเกินไป'),
})

export const issueStatusQuerySchema = z.object({
  sn: snSchema,
  phone: phoneSchema,
})

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})

// สร้าง SN จาก "รูปแบบรหัส" (scheme) โดยตรง ไม่ต้องผูกผลิตภัณฑ์ตั้งแต่ตอนสร้าง
export const snGenerateSchema = z.object({
  scheme_id: z.coerce.number().int().positive('กรุณาเลือกรูปแบบรหัส SN'),
  quantity: z.coerce
    .number()
    .int()
    .min(1, 'จำนวนอย่างน้อย 1')
    .max(1000, 'สร้างได้สูงสุด 1,000 ตัวต่อครั้ง'),
  category: z.string().trim().min(1, 'กรุณากรอกหมวดหมู่').max(100),
})

// นำเข้า SN ที่มีอยู่แล้วจริงของผลิตภัณฑ์หนึ่ง ๆ (เช่น สินค้านอกที่ซื้อมาขายต่อ มี SN ติดมากับตัวสินค้าจากโรงงานเดิม)
// กรอก/วางเองทีละตัวหรือหลายตัวพร้อมกันตอนเพิ่ม/จัดการผลิตภัณฑ์นั้น — ผูกผลิตภัณฑ์ทันที ไม่ผ่านตัวสร้างรหัสอัตโนมัติ
export const snImportSchema = z.object({
  product_id: z.coerce.number().int().positive('กรุณาเลือกผลิตภัณฑ์'),
  sns: z
    .array(snSchema)
    .min(1, 'กรุณากรอก Serial Number อย่างน้อย 1 รายการ')
    .max(1000, 'นำเข้าได้สูงสุด 1,000 รายการต่อครั้ง'),
  category: z.string().trim().min(1, 'กรุณากรอกหมวดหมู่').max(100),
})

// รูปแบบรหัส SN แบบเรียงลำดับ — ไม่ผูกกับผลิตภัณฑ์ใด ๆ ตั้งไว้ล่วงหน้าได้เลย
export const snSchemeSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  label: z.string().trim().min(1, 'กรุณากรอกชื่อเรียกรูปแบบ').max(255),
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,10}$/, 'ตัวนำหน้าต้องเป็น A–Z และ 0–9 ยาว 1–10 ตัว'),
  model_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,10}$/, 'รหัสรุ่นต้องเป็น A–Z และ 0–9 ยาว 1–10 ตัว'),
  next_sequence: z.coerce.number().int().min(1, 'เลขลำดับการผลิตต้องเริ่มจาก 1 ขึ้นไป'),
})

// ผูก SN ที่สร้างไว้ล่วงหน้า (ยังไม่มีเจ้าของ) เข้ากับผลิตภัณฑ์ทีหลัง
export const snAssignProductSchema = z.object({
  serial_number_ids: z
    .array(z.coerce.number().int().positive())
    .min(1, 'กรุณาเลือกอย่างน้อย 1 รายการ')
    .max(500, 'เลือกได้สูงสุด 500 รายการต่อครั้ง'),
  product_id: z.coerce.number().int().positive('กรุณาเลือกผลิตภัณฑ์'),
})

export const productSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อผลิตภัณฑ์').max(255),
  // รหัสสินค้าอ้างอิงทั่วไป (SKU) — ไม่เกี่ยวกับรูปแบบ SN แล้ว (แยกไปตั้งที่หน้า "ตั้งค่ารหัส SN")
  // ไม่บังคับ: เว้นว่างได้ ('' จะถูกแปลงเป็น NULL ที่ฝั่ง API ก่อนบันทึก)
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, 'รหัสต้องเป็น A–Z และ 0–9 ยาว 2–10 ตัว ห้ามมีขีดหรือเว้นวรรค')
    .optional()
    .or(z.literal('')),
  brand: z.string().trim().max(100).optional().or(z.literal('')),
  model: z.string().trim().max(100).optional().or(z.literal('')),
  // ที่มาของสินค้า — ตัดสินว่าใครออกรหัส SN (ดูคำอธิบายเต็มใน db/schema.sql)
  // ไม่ส่งมาถือว่าผลิตเอง เพื่อให้ client เดิมที่ยังไม่ส่งฟิลด์นี้ยังใช้งานได้
  source_type: z
    .enum(['in_house', 'resale'], { error: 'กรุณาเลือกประเภทผลิตภัณฑ์ (ผลิตเอง หรือ ซื้อมาขายต่อ)' })
    .default('in_house'),
  is_active: z.coerce.boolean().optional(),
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

/** ข้อจำกัดไฟล์แนบ */
export const UPLOAD_LIMITS = {
  image: {
    maxCount: 5,
    maxSize: 25 * 1024 * 1024, // 25MB — รูปจากมือถือรุ่นใหม่ใหญ่ได้ถึง ~15MB
    // heic/heif = รูปจาก iPhone · webp = รูปจาก Android บางรุ่นและภาพที่เซฟจากเว็บ
    mimeTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'],
    label: 'รูปภาพ (jpg/png/heic/webp) ขนาดไม่เกิน 25MB ต่อรูป ไม่เกิน 5 รูป',
  },
  video: {
    maxCount: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    // mp4 = กล้อง Android ส่วนใหญ่ · quicktime = .mov จาก iPhone (iOS ส่งคลิปจากคลังภาพมาเป็น .MOV แม้ช่องรับไฟล์ขอ mp4)
    // 3gpp = Android รุ่นเก่า / แอปแชท · webm = แอปอัดหน้าจอบางตัว
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/3gpp', 'video/webm'],
    label: 'วิดีโอ (mp4/mov/3gp/webm) ไม่เกิน 50MB จำนวน 1 คลิป',
  },
  /**
   * เพดานรวมรูป + วิดีโอต่อการแจ้ง 1 ครั้ง — เว็บจริงอยู่หลัง Cloudflare ซึ่งตัดคำขอที่ใหญ่เกิน 100MB
   * เป็น 413 (หน้า HTML) ตั้งแต่ก่อนถึงเซิร์ฟเวอร์ จึงตั้งต่ำกว่าไว้ ~5MB เผื่อหัว multipart และช่องข้อความ
   * ขนาดต่อไฟล์ยังเท่าเดิม แต่แนบเต็มทุกช่อง (5 รูป × 25MB + คลิป 50MB = 175MB) จะไม่ผ่าน
   * หน้าแจ้งปัญหาเตือนตั้งแต่ตอนเลือกไฟล์ — จะให้เกิน 100MB ได้ต้องเปลี่ยนเป็นอัปโหลดทีละไฟล์ ขยายค่านี้อย่างเดียวไม่พอ
   */
  totalMaxSize: 95 * 1024 * 1024, // 95MB
  totalLabel: 'รูปและวิดีโอรวมกันไม่เกิน 95MB ต่อการแจ้ง 1 ครั้ง',
} as const

/** แปลง ZodError เป็นข้อความเดียวสำหรับแสดงผล */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง'
}
