import { checkRateLimit } from '@/lib/rate-limit'
import { lookupEnabled, searchCustomers } from '@/lib/tjc-api'
import { orgSearchSchema, firstIssueMessage } from '@/lib/validations'

/**
 * GET /api/lookup/customers?q= — ลูกค้าค้นหาหน่วยงานของตัวเองจากข้อมูลหน้างานของระบบงาน (public)
 *
 * enabled: false = ยังไม่ได้ตั้งการเชื่อมต่อ หน้าแจ้งปัญหาซ่อนช่องค้นหาแล้วให้พิมพ์ชื่อเอง
 * ระบบงานล่ม/ช้า → ตอบ 503 หน้าแจ้งปัญหาบอกให้พิมพ์ชื่อหน่วยงานเองแทน ไม่ทำให้แจ้งไม่ได้
 */
export async function GET(request: Request) {
  // พิมพ์ทีละตัว (หน้าเว็บหน่วงไว้ก่อนยิง) — เพดานนี้กันคนไล่ดึงรายชื่อหน่วยงานทั้งหมด
  const limited = checkRateLimit(request, 'lookup', 60, 60_000)
  if (limited) return limited

  // ไม่ส่ง q = หน้าแจ้งปัญหาถามตอนเปิดหน้าว่าเปิดการค้นหาไว้ไหม (ไม่เปิด = ให้พิมพ์ชื่อหน่วยงานเองตั้งแต่แรก)
  const q = new URL(request.url).searchParams.get('q')
  if (!lookupEnabled() || q === null) {
    return Response.json({ enabled: lookupEnabled(), customers: [] })
  }

  const parsed = orgSearchSchema.safeParse(q)
  if (!parsed.success) {
    return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 })
  }

  const result = await searchCustomers(parsed.data)
  if (!result.ok) {
    return Response.json(
      { error: 'ค้นหาหน่วยงานไม่ได้ในขณะนี้ — พิมพ์ชื่อหน่วยงานเองได้เลย' },
      { status: 503 }
    )
  }

  return Response.json({ enabled: true, customers: result.data.customers })
}
