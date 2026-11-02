import { redirect } from 'next/navigation'

/**
 * หน้าลงทะเบียนถูกรวมเข้ากับหน้าแจ้งปัญหาแล้ว (ต.ค. 2026 — ไม่มีขั้นลงทะเบียนแยก ลูกค้าแจ้งปัญหาหน้าเดียวจบ)
 * คงเส้นทางนี้ไว้ส่งต่อ เพราะ QR Code ที่พิมพ์ติดสินค้า และลิงก์ที่ส่งให้ลูกค้าไปก่อนหน้านี้ยังชี้มาที่ /register
 * ค่าที่ติดมากับลิงก์ (?sn=&product=&brand=&model= — lib/customer-link.ts) ส่งต่อไปให้หน้าแจ้งปัญหากรอกไว้เหมือนเดิม
 */
export default async function RegisterRedirect({ searchParams }: PageProps<'/register'>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) params.append(key, item)
    }
  }
  const query = params.toString()
  redirect(query ? `/report?${query}` : '/report')
}
