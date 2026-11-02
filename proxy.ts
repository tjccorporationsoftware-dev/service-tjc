import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/session-token'

// Next.js 16: middleware ถูกเปลี่ยนชื่อเป็น proxy
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CSRF ชั้นที่สอง (ชั้นแรกคือ cookie SameSite=Lax): คำขอเปลี่ยนแปลงข้อมูลไป /api/admin/* ที่เบราว์เซอร์ส่ง
  // Origin มาแต่ไม่ตรงกับ host ของเว็บนี้ = มาจากเว็บอื่น ปฏิเสธก่อนถึง handler
  // (ไม่มี Origin = ไม่ใช่เบราว์เซอร์ เช่น curl/สคริปต์ ซึ่งไม่มี cookie ให้ขโมยอยู่แล้ว)
  if (pathname.startsWith('/api/admin/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin')
    if (origin && !sameSite(origin, request)) {
      return NextResponse.json({ error: 'คำขอไม่ได้มาจากเว็บนี้' }, { status: 403 })
    }
  }

  // หน้า login และ endpoint login/logout ต้องเข้าถึงได้โดยไม่ต้องมี session
  if (
    pathname === '/admin/login' ||
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/logout'
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySession(token) : null

  if (session) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 })
  }

  const loginUrl = new URL('/admin/login', request.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

/** Origin ของคำขอชี้มาที่ host เดียวกับที่เว็บนี้ถูกเรียก (host มาจาก reverse proxy ที่ตั้ง ProxyPreserveHost) */
function sameSite(origin: string, request: NextRequest): boolean {
  try {
    const expected = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').toLowerCase()
    return expected !== '' && new URL(origin).host.toLowerCase() === expected
  } catch {
    return false
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
