import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import type { PoolConnection } from 'mysql2/promise'
import { withTransaction } from '@/lib/db'
import { registerSchema, firstIssueMessage } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'

type SerialRow = RowDataPacket & {
  id: number
  status: 'available' | 'registered' | 'void'
  product_id: number | null
  product_name: string | null
  brand: string | null
  model: string | null
  registration_id: number | null
  reg_phone: string | null
}

type ProductRow = RowDataPacket & {
  id: number
  name: string
  brand: string | null
  model: string | null
}

/**
 * ลูกค้ากรอกเองทั้งหมด — ผลิตภัณฑ์และ SN เจ้าหน้าที่ไม่ต้องเตรียมอะไรไว้ก่อน
 *
 * SN ไม่มีในระบบ             → สร้าง SN ใหม่ผูกกับผลิตภัณฑ์ที่ลูกค้าพิมพ์
 * SN สร้างไว้แต่ยังไม่ผูก      → ผูกกับผลิตภัณฑ์ที่ลูกค้าพิมพ์
 * SN ผูกผลิตภัณฑ์ไว้แล้ว       → ยึดผลิตภัณฑ์เดิม (หน้าลงทะเบียนโชว์ให้ลูกค้าแบบแก้ไม่ได้อยู่แล้ว)
 * มี registration เปล่าค้างอยู่ → เติมข้อมูลติดต่อลงแถวเดิม (ข้อมูลยุคที่แอดมินกด "เริ่มประกัน" ให้ก่อน)
 */
export async function POST(request: Request) {
  const limited = checkRateLimit(request, 'register', 10, 60_000)
  if (limited) return limited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 })
  }
  // consent ผ่านการตรวจจาก zod แล้วว่าต้องเป็น true เสมอ ไม่ต้องอ้างอิงต่อในนี้
  const { customer_name, phone, email, sn, product_name, product_brand, product_model } = parsed.data

  try {
    const result = await withTransaction(async (conn) => {
      // ล็อกแถว SN ไว้ กันสองคนลงทะเบียน SN เดียวกันพร้อมกัน
      const [rows] = await conn.execute<SerialRow[]>(
        `SELECT s.id, s.status, s.product_id, p.name AS product_name, p.brand, p.model,
                r.id AS registration_id, r.phone AS reg_phone
         FROM serial_numbers s
         LEFT JOIN products p ON p.id = s.product_id
         LEFT JOIN registrations r ON r.serial_number_id = s.id
         WHERE s.sn = ?
         FOR UPDATE`,
        [sn]
      )

      const serial = rows[0]
      if (serial?.status === 'void') {
        return { error: 'Serial Number นี้ถูกยกเลิกแล้ว', status: 409 } as const
      }
      if (serial?.status === 'registered' && serial.reg_phone) {
        return { error: 'Serial Number นี้ถูกลงทะเบียนไปแล้ว', status: 409 } as const
      }

      // registration เปล่าที่ยังไม่มีข้อมูลติดต่อ — ลูกค้าคนนี้คือคน "รับ" (claim) เติมข้อมูลลงแถวเดิม
      // consent ผ่าน zod มาแล้วว่าเป็น true เสมอ — บันทึกเวลาที่ยอมรับไว้เป็นหลักฐาน (PDPA)
      if (serial?.registration_id) {
        await conn.execute(
          `UPDATE registrations
           SET phone = ?, customer_name = ?, email = ?, consent_accepted_at = NOW()
           WHERE id = ?`,
          [phone, customer_name, email, serial.registration_id]
        )

        return {
          registration: {
            id: serial.registration_id,
            sn,
            customer_name,
            email,
            product_name: serial.product_name,
            brand: serial.brand,
            model: serial.model,
          },
        }
      }

      const product = serial?.product_id
        ? { id: serial.product_id, name: serial.product_name, brand: serial.brand, model: serial.model }
        : await findOrCreateProduct(conn, product_name, product_brand || null, product_model || null)

      let serialId: number
      if (serial) {
        await conn.execute(`UPDATE serial_numbers SET product_id = ?, status = 'registered' WHERE id = ?`, [
          product.id,
          serial.id,
        ])
        serialId = serial.id
      } else {
        // SN ที่ไม่มีในระบบ เช่น SN จากโรงงานของสินค้าที่ซื้อมาขายต่อ — generated_by = NULL บอกว่าลูกค้าเป็นคนกรอก
        const [inserted] = await conn.execute<ResultSetHeader>(
          `INSERT INTO serial_numbers (sn, product_id, status) VALUES (?, ?, 'registered')`,
          [sn, product.id]
        )
        serialId = inserted.insertId
      }

      const [inserted] = await conn.execute<ResultSetHeader>(
        `INSERT INTO registrations (serial_number_id, phone, customer_name, email, consent_accepted_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [serialId, phone, customer_name, email]
      )

      return {
        registration: {
          id: inserted.insertId,
          sn,
          customer_name,
          email,
          product_name: product.name,
          brand: product.brand,
          model: product.model,
        },
      }
    })

    if ('error' in result) {
      return Response.json({ error: result.error }, { status: result.status })
    }
    return Response.json(result, { status: 201 })
  } catch (err) {
    // SN ใหม่ยังไม่มีแถวให้ FOR UPDATE ล็อก — สองคนส่ง SN ใหม่ตัวเดียวกันพร้อมกัน คนที่ช้ากว่าจะชน UNIQUE ของ sn
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ER_DUP_ENTRY') {
      return Response.json({ error: 'Serial Number นี้ถูกลงทะเบียนไปแล้ว' }, { status: 409 })
    }
    console.error('register failed:', err)
    return Response.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }, { status: 500 })
  }
}

/**
 * ผลิตภัณฑ์ที่ชื่อ ยี่ห้อ และรุ่น ตรงกับที่ลูกค้าพิมพ์ (collation ของตารางไม่สนตัวพิมพ์เล็ก-ใหญ่) — ไม่เจอก็สร้างใหม่
 * ที่สร้างใหม่ปิดใช้งานไว้ก่อน: ข้อความที่ลูกค้าคนหนึ่งพิมพ์ไม่ควรไปโผล่เป็นตัวเลือกบนหน้าของลูกค้าคนอื่น
 * จนกว่าแอดมินจะเปิดใช้งานเอง แต่ลูกค้าคนถัดไปที่พิมพ์ตรงกันจะยังได้ผลิตภัณฑ์ตัวเดิม ไม่สร้างซ้ำ
 */
async function findOrCreateProduct(
  conn: PoolConnection,
  name: string,
  brand: string | null,
  model: string | null
) {
  const [found] = await conn.execute<ProductRow[]>(
    `SELECT id, name, brand, model
     FROM products
     WHERE name = ? AND brand <=> ? AND model <=> ?
     ORDER BY is_active DESC, id
     LIMIT 1`,
    [name, brand, model]
  )
  if (found[0]) return found[0]

  const [inserted] = await conn.execute<ResultSetHeader>(
    `INSERT INTO products (name, brand, model, added_by, is_active) VALUES (?, ?, ?, 'customer', 0)`,
    [name, brand, model]
  )
  return { id: inserted.insertId, name, brand, model }
}
