import { checkRateLimit } from '@/lib/rate-limit'
import { getCustomerProjects, lookupEnabled } from '@/lib/tjc-api'

/**
 * GET /api/lookup/projects?customer_id= — โครงการของหน่วยงานที่ลูกค้าเลือก พร้อมรายการสินค้าในแต่ละโครงการ (public)
 * ระบบงานคืนเฉพาะโครงการของบริษัทนี้ที่ยังไม่ยกเลิก และไม่มีราคา/ข้อมูลติดต่อ (ดู warranty_lookup_api.php)
 */
export async function GET(request: Request) {
  const limited = checkRateLimit(request, 'lookup', 60, 60_000)
  if (limited) return limited

  if (!lookupEnabled()) {
    return Response.json({ error: 'ยังไม่ได้เปิดการค้นหาหน่วยงาน' }, { status: 404 })
  }

  const customerId = Number(new URL(request.url).searchParams.get('customer_id'))
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return Response.json({ error: 'รหัสหน่วยงานไม่ถูกต้อง' }, { status: 400 })
  }

  const result = await getCustomerProjects(customerId)
  if (!result.ok) {
    return result.status === 404
      ? Response.json({ error: 'ไม่พบหน่วยงานนี้ กรุณาค้นหาใหม่' }, { status: 404 })
      : Response.json(
          { error: 'โหลดโครงการไม่ได้ในขณะนี้ — กรอกสินค้าเองได้เลย' },
          { status: 503 }
        )
  }

  return Response.json(result.data)
}
