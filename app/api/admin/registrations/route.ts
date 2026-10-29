import { query, queryOne, type SqlParams } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { parsePagination, meta } from '@/lib/pagination'

type Row = {
  id: number
  sn: string
  phone: string
  customer_name: string | null
  registered_at: string
  product_name: string
  model: string | null
  issue_count: number
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const params = new URL(request.url).searchParams
  const page = parsePagination(params)

  const where: string[] = []
  const values: SqlParams = []

  // ค้นได้ทั้ง SN, เบอร์โทร และชื่อลูกค้า
  const search = params.get('search')?.trim()
  if (search) {
    where.push('(s.sn LIKE ? OR r.phone LIKE ? OR r.customer_name LIKE ?)')
    values.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  const productId = Number.parseInt(params.get('product_id') ?? '', 10)
  if (Number.isFinite(productId)) {
    where.push('s.product_id = ?')
    values.push(productId)
  }

  const registeredFrom = params.get('registered_from')
  if (registeredFrom) {
    where.push('DATE(r.registered_at) >= ?')
    values.push(registeredFrom)
  }
  const registeredTo = params.get('registered_to')
  if (registeredTo) {
    where.push('DATE(r.registered_at) <= ?')
    values.push(registeredTo)
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const total = await queryOne<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM registrations r
     JOIN serial_numbers s ON s.id = r.serial_number_id
     ${clause}`,
    values
  )

  const rows = await query<Row>(
    `SELECT r.id, s.sn, r.phone, r.customer_name, r.registered_at,
            p.name AS product_name, p.model,
            (SELECT COUNT(*) FROM issue_reports i WHERE i.registration_id = r.id) AS issue_count
     FROM registrations r
     JOIN serial_numbers s ON s.id = r.serial_number_id
     JOIN products p ON p.id = s.product_id
     ${clause}
     ORDER BY r.registered_at DESC
     LIMIT ${page.perPage} OFFSET ${page.offset}`,
    values
  )

  return Response.json({
    registrations: rows,
    meta: meta(total?.count ?? 0, page),
  })
}
