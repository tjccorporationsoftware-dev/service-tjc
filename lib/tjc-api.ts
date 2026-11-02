/**
 * ค้นหาหน่วยงาน / โครงการ / สินค้า จากระบบงานของพนักงาน (tjc-api — PHP) ผ่าน warranty_lookup_api.php
 * ข้อมูลชุดเดียวกับหน้า project_dashboard.php / project_details.php ของระบบนั้น — ลูกค้าเลือกหน้างานของตัวเองได้
 * แทนการพิมพ์เองทั้งหมด
 *
 * ใช้ฝั่ง server เท่านั้น (key อยู่ใน env) — หน้าลูกค้าเรียกผ่าน /api/lookup/* ซึ่งมี rate limit อีกชั้น
 * key ตัวเดียวกับ SERVICE_API_KEY ที่ระบบงานใช้ดึงเคสจากเว็บนี้ — ฝั่งโน้นใช้ key บอกว่าเป็นบริษัทไหน
 * แล้วคืนเฉพาะหน่วยงาน/โครงการของบริษัทนั้น
 *
 * ไม่ตั้ง TJC_API_URL = ปิดการค้นหา หน้าแจ้งปัญหาให้พิมพ์หน่วยงาน/สินค้าเองอย่างเดียว (ทำงานได้ปกติ)
 */

/** ระบบงานช้า/ล่มต้องไม่ทำให้หน้าลูกค้าค้าง — ค้นไม่ทันก็ให้พิมพ์เองแทน */
const TIMEOUT_MS = 6000

export type LookupCustomer = {
  id: number
  name: string
  affiliation: string | null
  province: string | null
  project_count: number
}

export type LookupItem = {
  id: number
  name: string
  model: string | null
  quantity: number
  unit: string | null
}

export type LookupProject = {
  id: number
  name: string
  code: string | null
  contract_no: string | null
  /** YYYY-MM-DD — วันเริ่มสัญญา (ไม่มีใช้วันที่สร้างโครงการ) */
  date: string | null
  /** วันรับประกันของโครงการ (คำนวณแบบเดียวกับ project_dashboard.php) — null = โครงการไม่ได้กรอกข้อมูลประกัน */
  warranty: { start: string; end: string; period: string } | null
  items: LookupItem[]
}

export type CustomerProjects = {
  customer: Omit<LookupCustomer, 'project_count'>
  projects: LookupProject[]
}

/** ok: false + status 0 = ติดต่อระบบงานไม่ได้ / ยังไม่ได้ตั้งค่า (ต่างจาก 404 ที่แปลว่าไม่พบจริง) */
export type LookupResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string }

export function lookupEnabled(): boolean {
  return Boolean(process.env.TJC_API_URL && process.env.SERVICE_API_KEY)
}

/**
 * key เดินทางไปกับทุกคำขอ — production ยอมให้ http:// เฉพาะปลายทางบนเครื่องเดียวกัน
 * ข้ามเครื่องต้องเป็น https ไม่งั้นใครดักฟังในเครือข่ายได้ key ไปอ่านข้อมูลผู้แจ้งทุกเคส
 */
function baseUrlAllowed(base: string): boolean {
  try {
    const url = new URL(base)
    if (url.protocol === 'https:') return true
    if (url.protocol !== 'http:') return false
    if (process.env.NODE_ENV !== 'production') return true
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}

async function call<T>(params: Record<string, string>): Promise<LookupResult<T>> {
  const base = process.env.TJC_API_URL?.replace(/\/+$/, '')
  const key = process.env.SERVICE_API_KEY
  if (!base || !key) {
    return { ok: false, status: 0, error: 'ยังไม่ได้ตั้งค่าการเชื่อมต่อระบบงาน' }
  }
  if (!baseUrlAllowed(base)) {
    console.error('TJC_API_URL ต้องเป็น https:// (หรือ http://localhost บนเครื่องเดียวกัน) ตอน production — ปิดการค้นหาไว้')
    return { ok: false, status: 0, error: 'ยังไม่ได้ตั้งค่าการเชื่อมต่อระบบงาน' }
  }

  try {
    const res = await fetch(`${base}/warranty_lookup_api.php?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body) {
      return { ok: false, status: res.ok ? 0 : res.status, error: body?.error ?? `HTTP ${res.status}` }
    }
    return { ok: true, data: body as T }
  } catch (err) {
    console.error('tjc-api lookup failed:', err)
    return { ok: false, status: 0, error: 'ติดต่อระบบงานไม่ได้' }
  }
}

export function searchCustomers(q: string) {
  return call<{ customers: LookupCustomer[] }>({ action: 'customers', q })
}

export function getCustomerProjects(customerId: number) {
  return call<CustomerProjects>({ action: 'projects', customer_id: String(customerId) })
}
