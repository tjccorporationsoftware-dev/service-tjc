import bcrypt from 'bcryptjs'
import { execute, queryOne } from '@/lib/db'
import { adminLoginSchema, firstIssueMessage } from '@/lib/validations'
import { signSession, setSessionCookie } from '@/lib/auth'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const limited = checkRateLimit(request, 'admin-login', 10, 5 * 60_000)
  if (limited) return limited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }

  const parsed = adminLoginSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 })
  }
  const { username, password } = parsed.data
  const ip = clientIp(request)

  const admin = await queryOne<{
    id: number
    username: string
    password_hash: string
    display_name: string | null
    role: 'admin' | 'staff'
  }>('SELECT id, username, password_hash, display_name, role FROM admins WHERE username = ?', [
    username,
  ])

  // ข้อความเดียวกันทั้งกรณีไม่พบ user และรหัสผิด — ไม่บอกใบ้ว่ามี username นี้อยู่จริง
  const invalid = () => {
    // log ไว้ให้ตรวจย้อนหลังได้ว่ามีการเดารหัสผ่านจากไหน (ไม่ log รหัสผ่าน) — ชื่อผู้ใช้ตัดช่องว่าง/ขึ้นบรรทัดกัน log injection
    console.warn(`admin login failed: user="${username.replace(/\s+/g, ' ').slice(0, 100)}" ip=${ip}`)
    return Response.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 })
  }
  if (!admin) {
    await bcrypt.compare(password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva')
    return invalid()
  }
  if (!(await bcrypt.compare(password, admin.password_hash))) return invalid()

  const session = {
    id: admin.id,
    username: admin.username,
    role: admin.role,
    displayName: admin.display_name,
  }
  await setSessionCookie(await signSession(session))

  // บันทึกการเข้าใช้ลง audit_logs — ล้มเหลวก็ไม่ควรทำให้ login ไม่ผ่าน
  await execute('INSERT INTO audit_logs (admin_id, action, detail) VALUES (?, ?, ?)', [
    admin.id,
    'admin.login',
    `เข้าสู่ระบบจาก ${ip}`,
  ]).catch((err) => console.error('audit log (admin.login) failed:', err))

  return Response.json({ admin: session })
}
