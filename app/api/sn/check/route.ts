import { queryOne } from '@/lib/db'
import { snSchema } from '@/lib/validations'
import { maskPhone } from '@/lib/display'
import { checkRateLimit } from '@/lib/rate-limit'

type Row = {
  sn: string
  product_id: number | null
  product_name: string | null
  brand: string | null
  model: string | null
  registration_id: number | null
  phone: string | null
  registered_at: string | null
}

/**
 * ค้น SN แบบ public — หน้าลงทะเบียนใช้ดึงสินค้าที่ผูกกับ SN ไว้แล้วมาโชว์
 * หน้าแจ้งปัญหาใช้เช็คว่าลงทะเบียนแล้วหรือยังก่อนให้กรอกต่อ
 */
export async function GET(request: Request) {
  const limited = checkRateLimit(request, 'sn-check', 30, 60_000)
  if (limited) return limited

  const raw = new URL(request.url).searchParams.get('sn') ?? ''
  const parsed = snSchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json({ error: 'กรุณากรอก Serial Number' }, { status: 400 })
  }

  const row = await queryOne<Row>(
    `SELECT s.sn, s.product_id, p.name AS product_name, p.brand, p.model,
            r.id AS registration_id, r.phone, r.registered_at
     FROM serial_numbers s
     LEFT JOIN products p ON p.id = s.product_id
     LEFT JOIN registrations r ON r.serial_number_id = s.id
     WHERE s.sn = ?`,
    [parsed.data]
  )

  if (!row) {
    return Response.json({ error: 'ไม่พบ Serial Number นี้ในระบบ' }, { status: 404 })
  }
  if (!row.product_id) {
    return Response.json(
      { error: 'Serial Number นี้ยังไม่ได้ลงทะเบียน' },
      { status: 409 }
    )
  }

  // มี registration แต่ยังไม่มีเบอร์โทร = แถวเปล่าที่ยังไม่มีลูกค้า "รับ" (claim)
  const claimed = Boolean(row.phone)

  return Response.json({
    sn: row.sn,
    registered: Boolean(row.registration_id),
    claimed,
    product_name: row.product_name,
    brand: row.brand,
    model: row.model,
    phone: claimed ? maskPhone(row.phone ?? '') : null,
    registered_at: row.registered_at,
  })
}
