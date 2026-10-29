/**
 * ลิงก์ที่เจ้าหน้าที่ส่งให้ลูกค้า (หน้าแอดมิน "สร้าง QR") — กรอก Serial Number / สินค้าไว้ให้ล่วงหน้าผ่าน query string
 * เช่น /register?sn=B012608000001&product=โน้ตบุ๊ก&brand=Dell&model=Latitude%205440
 *
 * pure module ไม่พึ่ง node/db — ฝั่งแอดมินใช้สร้างลิงก์ หน้าลูกค้าใช้อ่านค่า ชื่อพารามิเตอร์จึงตรงกันแน่นอน
 * ห้ามเพิ่มข้อมูลส่วนบุคคล (ชื่อ เบอร์โทร อีเมล) ลงลิงก์ — URL ค้างอยู่ในประวัติเบราว์เซอร์ แชท LINE และ log ของเซิร์ฟเวอร์ (PDPA)
 * ค่าจากลิงก์เป็นแค่ค่าเริ่มต้นในช่องกรอก ลูกค้าแก้ได้ และ API ตรวจซ้ำตอนบันทึกเหมือนพิมพ์เอง
 */

/** ช่องที่กรอกล่วงหน้าได้ — ชื่อ key ตรงกับ state ของฟอร์มหน้าลงทะเบียน */
export type Prefill = {
  sn: string
  product_name: string
  product_brand: string
  product_model: string
}

const PARAM: Record<keyof Prefill, string> = {
  sn: 'sn',
  product_name: 'product',
  product_brand: 'brand',
  product_model: 'model',
}

/** ความยาวสูงสุดเท่ากับ registerSchema ใน lib/validations.ts — ลิงก์ที่ยาวเกินถูกตัดทิ้ง ไม่ให้ช่องกรอกรับค่าที่บันทึกไม่ได้ */
const MAX_LENGTH: Record<keyof Prefill, number> = {
  sn: 50,
  product_name: 255,
  product_brand: 100,
  product_model: 100,
}

const KEYS = Object.keys(PARAM) as (keyof Prefill)[]

/** อ่านค่าที่ติดมากับลิงก์ — ไม่มีก็ได้สตริงว่าง (รับ useSearchParams() หรือ URLSearchParams ก็ได้) */
export function readPrefill(params: Pick<URLSearchParams, 'get'>): Prefill {
  const values = Object.fromEntries(
    KEYS.map((key) => [key, (params.get(PARAM[key]) ?? '').trim().slice(0, MAX_LENGTH[key])])
  ) as Prefill
  return { ...values, sn: values.sn.toUpperCase() }
}

/** สร้างลิงก์เต็มของหน้าลูกค้า — ใส่เฉพาะช่องที่มีค่า */
export function buildCustomerLink(origin: string, path: string, prefill: Partial<Prefill> = {}): string {
  const url = new URL(path, origin)
  for (const key of KEYS) {
    const value = prefill[key]?.trim().slice(0, MAX_LENGTH[key])
    if (value) url.searchParams.set(PARAM[key], key === 'sn' ? value.toUpperCase() : value)
  }
  return url.toString()
}
