/**
 * Rate limiter แบบ fixed window เก็บใน memory
 * เพียงพอสำหรับ deploy แบบ instance เดียว — ถ้า scale หลาย instance ให้ย้ายไป Redis
 */
type Bucket = { count: number; resetAt: number }

const globalForLimiter = globalThis as unknown as { warrantyBuckets?: Map<string, Bucket>; warrantySweptAt?: number }
const buckets = globalForLimiter.warrantyBuckets ?? new Map<string, Bucket>()
globalForLimiter.warrantyBuckets = buckets

/** ล้าง bucket ที่หมดอายุทุก ๆ เท่านี้ และเพดานจำนวน bucket — กัน Map โตไม่จำกัดจาก IP ปลอมจำนวนมาก */
const SWEEP_EVERY_MS = 60_000
const MAX_BUCKETS = 50_000

function sweep(now: number) {
  const last = globalForLimiter.warrantySweptAt ?? 0
  if (now - last < SWEEP_EVERY_MS && buckets.size < MAX_BUCKETS) return
  globalForLimiter.warrantySweptAt = now
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key)
  }
  // ยังเต็มอยู่หลังล้าง (ถูกยิงด้วย key ไม่ซ้ำจำนวนมากในหน้าต่างเดียว) — ทิ้งของเก่าสุดก่อน
  if (buckets.size >= MAX_BUCKETS) {
    for (const key of buckets.keys()) {
      buckets.delete(key)
      if (buckets.size < MAX_BUCKETS / 2) break
    }
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  sweep(now)
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false

  bucket.count++
  return true
}

/**
 * จำนวน reverse proxy ที่เชื่อถือหน้าแอป — บอกว่า IP จริงอยู่ตำแหน่งไหนใน X-Forwarded-For
 *
 * proxy แต่ละชั้น "ต่อท้าย" IP ของฝั่งที่ต่อเข้ามาลงใน header เดิมที่ client ส่งมา ค่าแรก ๆ จึงเป็นอะไรก็ได้
 * ที่ผู้เรียกใส่เอง ต้องนับจากขวา: Apache อย่างเดียว = 1 · Cloudflare → Apache = 2 (production ของเว็บจริง)
 * ไม่ตั้ง = 1 · ตั้ง 0 = ไม่เชื่อ header เลย (รันตรงไม่มี proxy)
 */
function trustedProxyHops(): number {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS ?? '1')
  return Number.isInteger(raw) && raw >= 0 ? raw : 1
}

/** IP ของผู้เรียกเท่าที่เชื่อถือได้ — ใช้เป็น key ของ rate limit และบันทึก log */
export function clientIp(request: Request): string {
  const hops = trustedProxyHops()
  if (hops === 0) return request.headers.get('x-real-ip') ?? 'unknown'

  // Cloudflare ใส่ IP ผู้เยี่ยมชมไว้ใน header นี้ให้โดยตรง เชื่อได้เฉพาะเมื่อ Cloudflare เป็นชั้นนอกสุด (hops ≥ 2)
  const cf = request.headers.get('cf-connecting-ip')?.trim()
  if (hops >= 2 && cf) return cf

  const parts = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return request.headers.get('x-real-ip') ?? 'unknown'
  // นับจากขวาตามจำนวน proxy — มีน้อยกว่าที่คาด (proxy บางชั้นไม่ได้ใส่) ก็เอาตัวซ้ายสุดที่มี
  return parts[Math.max(0, parts.length - hops)]
}

/**
 * เปิด/ปิด rate limit
 * ค่าเริ่มต้น: ปิดตอน development (ไม่ให้ขัดจังหวะตอนทดสอบ) เปิดตอน production
 * บังคับได้ด้วย RATE_LIMIT_ENABLED=true/false ใน .env.local
 */
function isEnabled(): boolean {
  const flag = process.env.RATE_LIMIT_ENABLED
  if (flag === 'true') return true
  if (flag === 'false') return false
  return process.env.NODE_ENV === 'production'
}

/** คืน Response 429 ถ้าเกินโควตา, คืน null ถ้าผ่าน */
export function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
): Response | null {
  if (!isEnabled()) return null
  if (rateLimit(`${scope}:${clientIp(request)}`, limit, windowMs)) return null
  return Response.json(
    { error: 'มีการเรียกใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' },
    { status: 429 }
  )
}
