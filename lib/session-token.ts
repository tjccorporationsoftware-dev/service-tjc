import { SignJWT, jwtVerify } from 'jose'

// แยกออกจาก lib/auth.ts เพราะ proxy.ts ใช้ไฟล์นี้ได้ แต่แตะ next/headers ไม่ได้
export const SESSION_COOKIE = 'warranty_session'
export const SESSION_HOURS = 8

/** secret สั้นกว่านี้เดาได้ง่ายเกินไป — ตั้งด้วย `openssl rand -hex 32` (64 ตัวอักษร) */
const MIN_SECRET_LENGTH = 32

/** ผูก token กับระบบนี้ — token ที่เซ็นด้วย secret เดียวกันจากระบบอื่น (เช่น หลังบ้านอีกบริษัท) ใช้ที่นี่ไม่ได้ */
const ISSUER = 'service-warranty-admin'
const audience = () => process.env.SESSION_AUDIENCE || process.env.DB_NAME || 'warranty'

export type AdminSession = {
  id: number
  username: string
  role: 'admin' | 'staff'
  displayName: string | null
}

function secretKey() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('ยังไม่ได้ตั้งค่า JWT_SECRET ใน .env.local')
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET สั้นเกินไป (${secret.length} ตัวอักษร) — ต้องอย่างน้อย ${MIN_SECRET_LENGTH} ตัว`)
  }
  return new TextEncoder().encode(secret)
}

export async function signSession(session: AdminSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(audience())
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey())
}

export async function verifySession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: audience(),
    })
    if (typeof payload.id !== 'number' || typeof payload.username !== 'string') return null
    return {
      id: payload.id,
      username: payload.username,
      role: payload.role === 'admin' ? 'admin' : 'staff',
      displayName: typeof payload.displayName === 'string' ? payload.displayName : null,
    }
  } catch {
    return null
  }
}
