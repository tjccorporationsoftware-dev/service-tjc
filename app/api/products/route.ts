import { query } from '@/lib/db'

export async function GET() {
  const products = await query(
    `SELECT id, name, code, brand, model
     FROM products
     WHERE is_active = 1
     ORDER BY name`
  )

  return Response.json({ products })
}
