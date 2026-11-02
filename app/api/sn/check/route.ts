import { queryOne } from '@/lib/db'
import { snSchema } from '@/lib/validations'
import { checkRateLimit } from '@/lib/rate-limit'

type Row = {
  sn: string
  product_id: number | null
  product_name: string | null
  brand: string | null
  model: string | null
}

/**
 * ค้น SN แบบ public — หน้าแจ้งปัญหาใช้เติมชื่อสินค้าให้รายการที่ลูกค้ากรอก SN ไว้แต่ยังไม่ได้ใส่ชื่อสินค้า
 * (SN ที่สร้างจากหน้าตั้งค่ารหัส SN และผูกผลิตภัณฑ์แล้ว) — ไม่บอกว่าใครเคยแจ้ง SN นี้ ด้วยเบอร์อะไร
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
    `SELECT s.sn, s.product_id, p.name AS product_name, p.brand, p.model
     FROM serial_numbers s
     LEFT JOIN products p ON p.id = s.product_id
     WHERE s.sn = ?`,
    [parsed.data]
  )

  if (!row) {
    return Response.json({ error: 'ไม่พบ Serial Number นี้ในระบบ' }, { status: 404 })
  }
  if (!row.product_id) {
    return Response.json({ error: 'Serial Number นี้ยังไม่มีข้อมูลสินค้า' }, { status: 409 })
  }

  return Response.json({
    sn: row.sn,
    product_name: row.product_name,
    brand: row.brand,
    model: row.model,
  })
}
