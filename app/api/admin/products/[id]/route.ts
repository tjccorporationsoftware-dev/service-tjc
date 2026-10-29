import { execute, queryOne } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { productSchema, firstIssueMessage } from '@/lib/validations'

export async function PATCH(request: Request, ctx: RouteContext<'/api/admin/products/[id]'>) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { id } = await ctx.params
  const productId = Number.parseInt(id, 10)
  if (!Number.isFinite(productId)) {
    return Response.json({ error: 'รหัสผลิตภัณฑ์ไม่ถูกต้อง' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }

  const parsed = productSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 })
  }
  const { name, brand, model, source_type, is_active } = parsed.data
  // เว้นว่าง = NULL ไม่ใช่ '' เพราะคอลัมน์เป็น UNIQUE (ดู db/schema.sql)
  const code = parsed.data.code || null

  const existing = await queryOne<{ id: number; code: string | null; serial_count: number }>(
    `SELECT p.id, p.code,
            (SELECT COUNT(*) FROM serial_numbers s WHERE s.product_id = p.id) AS serial_count
     FROM products p WHERE p.id = ?`,
    [productId]
  )
  if (!existing) {
    return Response.json({ error: 'ไม่พบผลิตภัณฑ์นี้' }, { status: 404 })
  }

  // เปลี่ยน code ไม่ได้ถ้ามี SN ผูกกับผลิตภัณฑ์นี้แล้ว — กันรหัสอ้างอิงไม่ตรงกับ SN ที่บันทึกไว้ในรายงาน/ประวัติ
  // ยกเว้นของเดิมยังไม่มีรหัส (NULL) — เติมรหัสครั้งแรกได้ ไม่งั้นผลิตภัณฑ์ไร้รหัสที่มี SN แล้วจะติดล็อกถาวร
  if (existing.code !== null && code !== existing.code && Number(existing.serial_count) > 0) {
    return Response.json(
      {
        error: `แก้รหัสไม่ได้ เพราะมี Serial Number ผูกกับผลิตภัณฑ์นี้อยู่แล้ว ${existing.serial_count} ตัว`,
      },
      { status: 409 }
    )
  }

  // ล้างรหัสทิ้ง (code = null) ไม่ต้องเช็คซ้ำ — ผลิตภัณฑ์ไร้รหัสมีกี่ตัวก็ได้
  if (code && code !== existing.code) {
    const duplicate = await queryOne<{ id: number }>(
      'SELECT id FROM products WHERE code = ? AND id <> ?',
      [code, productId]
    )
    if (duplicate) {
      return Response.json({ error: `รหัส "${code}" ถูกใช้กับผลิตภัณฑ์อื่นแล้ว` }, { status: 409 })
    }
  }

  await execute(
    `UPDATE products
     SET name = ?, code = ?, brand = ?, model = ?, source_type = ?, is_active = ?
     WHERE id = ?`,
    [name, code, brand || null, model || null, source_type, is_active === false ? 0 : 1, productId]
  )

  await execute('INSERT INTO audit_logs (admin_id, action, detail) VALUES (?, ?, ?)', [
    auth.session.id,
    'product.update',
    `แก้ไขผลิตภัณฑ์ #${productId} "${name}" (${code ?? 'ไม่ระบุรหัส'}, ${
      source_type === 'in_house' ? 'ผลิตเอง' : 'ซื้อมาขายต่อ'
    })`,
  ])

  return Response.json({
    product: {
      id: productId,
      name,
      code,
      brand: brand || null,
      model: model || null,
      source_type,
      is_active: is_active === false ? 0 : 1,
    },
  })
}
