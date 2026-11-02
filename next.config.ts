import type { NextConfig } from 'next'

// dev server บล็อก request ข้าม origin โดยดีฟอลต์ (กันโดนโจมตีจากเว็บอื่น)
// ถ้าจะเปิดให้เครื่องอื่นในวง LAN เข้าถึงตอน `npm run dev` ให้ตั้ง DEV_ALLOWED_ORIGINS ใน .env.local
// คั่นหลายค่าด้วย comma เช่น DEV_ALLOWED_ORIGINS=192.168.1.20,192.168.1.21 แล้ว restart dev server
// ไม่ตั้ง = รับเฉพาะ localhost — ไม่ hardcode IP ไว้ในไฟล์นี้เพราะ repo เป็น public
const devAllowedOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Content Security Policy — ทุกอย่างโหลดจากเว็บนี้เอง (ฟอนต์ Prompt ถูก next/font ฝังไว้ในตัว ไม่มี CDN ภายนอก)
 * - script-src ต้องมี 'unsafe-inline' เพราะ Next ฝังสคริปต์ hydration แบบ inline · dev เพิ่ม 'unsafe-eval' ให้ HMR
 * - style-src 'unsafe-inline' เพราะสีแบรนด์ตั้งเป็น style บน <html> และมี style attribute ตามคอมโพเนนต์
 * - img/media ต้องรับ blob:/data: สำหรับพรีวิวไฟล์ก่อนส่งและ QR Code ที่วาดบน canvas
 * - frame-ancestors 'none' กัน clickjacking · object-src 'none' · form-action 'self' กันฟอร์มถูกส่งไปที่อื่น
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
]
  // dev เปิดผ่าน http:// — ถ้าสั่ง upgrade เบราว์เซอร์จะพยายามเรียก https ที่ไม่มีแล้วหน้าพัง
  .filter((directive) => !(isDev && directive === 'upgrade-insecure-requests'))
  .join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  // เบราว์เซอร์สนใจ HSTS เฉพาะเมื่อรับผ่าน https — ตอน dev (http) header นี้ถูกเมินไปเอง
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  // mysql2 และ bcryptjs โหลดโมดูลแบบ dynamic — ปล่อยให้ Node require ตรง ๆ แทนการ bundle
  serverExternalPackages: ['mysql2', 'bcryptjs'],

  // ไม่บอกชาวโลกว่าเป็น Next.js (ลดการเล็งเป้าตามเวอร์ชัน)
  poweredByHeader: false,

  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      // ไฟล์แนบของลูกค้า: header จาก config ทับของที่ route handler ตั้ง จึงต้องกำหนดชุดเข้มกว่าไว้ตรงนี้ (กฎหลังชนะกฎแรกต่อ key)
      // sandbox กันเนื้อไฟล์ถูกตีความเป็นหน้าเว็บ · no-referrer ไม่ให้ URL (UUID) หลุดไปเว็บอื่น
      {
        source: '/api/files/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "sandbox; default-src 'none'" },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },

  ...(devAllowedOrigins.length > 0 && { allowedDevOrigins: devAllowedOrigins }),
}

export default nextConfig
