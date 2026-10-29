import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { CustomerNav } from '@/components/customer-nav'
import type { SiteDesign } from '@/lib/design'
import { SITE } from '@/lib/site-content'

/** แถบเมนูแยกตาม design (lib/design.ts) — tech กระจกเข้ม · eco กระจกสว่าง · clinical ขาวทึบมีแถบสีแบรนด์ด้านบน */
const HEADER = {
  tech: {
    bar: 'header-solidify border-b border-white/10 bg-navy-900/70 backdrop-blur-xl backdrop-saturate-150',
    hairline: 'via-brand-400/70',
    logo: 'rounded-xl bg-linear-to-br from-brand-400 to-brand-700 shadow-[0_8px_24px_-8px_var(--color-brand-500)] ring-1 ring-white/20',
    name: 'text-white',
    sub: 'text-navy-300',
  },
  eco: {
    bar: 'header-solidify-light border-b border-brand-100 bg-white/75 backdrop-blur-xl backdrop-saturate-150',
    hairline: 'via-brand-300/80',
    logo: 'rounded-full bg-linear-to-br from-brand-400 to-brand-600 shadow-[0_8px_20px_-8px_var(--color-brand-500)]',
    name: 'text-navy-900',
    sub: 'text-navy-400',
  },
  clinical: {
    bar: 'header-solidify-light border-t-4 border-b border-navy-100 border-t-brand-600 bg-white',
    hairline: null,
    logo: 'rounded-md bg-brand-600',
    name: 'text-navy-900',
    sub: 'text-navy-400',
  },
} satisfies Record<SiteDesign, { bar: string; hairline: string | null; logo: string; name: string; sub: string }>

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const look = HEADER[SITE.design]
  return (
    <div className="flex min-h-screen flex-col bg-app-canvas">
      {/* แถบเมนูหน้าตาตาม design ของบริษัท (HEADER ด้านล่าง) — เลื่อนลงแล้วทึบขึ้นและมีเงา (.header-solidify* ใน globals.css)
          z-40 ต้องสูงกว่าเนื้อหาที่ยกขึ้นทับส่วนหัว (PageBody / การ์ดทางลัดหน้าแรกใช้ z-10) ไม่งั้นเลื่อนแล้วการ์ดทับแถบนี้ */}
      <header className={`sticky top-0 z-40 ${look.bar}`}>
        {look.hairline && (
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-transparent to-transparent ${look.hairline}`}
          />
        )}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-300"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center text-white transition duration-500 group-hover:scale-105 group-hover:-rotate-6 ${look.logo}`}
            >
              <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="leading-tight">
              <span className={`block text-[15px] font-bold tracking-wide ${look.name}`}>TJC SERVICE</span>
              <span className={`block text-[11px] ${look.sub}`}>ระบบลงทะเบียนสินค้า</span>
            </span>
          </Link>
          <CustomerNav />
        </div>
      </header>

      {/* ความกว้าง/ระยะขอบอยู่ที่แต่ละหน้า — หน้าแรกต้องใช้พื้นหลังเต็มจอ ฟอร์มใช้คอลัมน์แคบ */}
      <main className="w-full flex-1">{children}</main>

      <footer className="border-t border-navy-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 text-center text-xs text-navy-400">
          ระบบลงทะเบียนสินค้า ·{' '}
          <Link href="/admin/login" className="transition hover:text-navy-600 hover:underline">
            สำหรับเจ้าหน้าที่
          </Link>
        </div>
      </footer>
    </div>
  )
}
