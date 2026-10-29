'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileSignature, Search, Wrench } from 'lucide-react'
import type { SiteDesign } from '@/lib/design'
import { SITE } from '@/lib/site-content'

/** short = ป้ายบนมือถือ (ปุ่ม 3 ช่องเท่ากัน ชื่อเต็มยาวเกินช่อง) */
const NAV = [
  { href: '/register', label: 'ลงทะเบียนผลิตภัณฑ์', short: 'ลงทะเบียน', icon: FileSignature },
  { href: '/report', label: 'แจ้งปัญหา', short: 'แจ้งปัญหา', icon: Wrench },
  { href: '/status', label: 'เช็คสถานะ', short: 'เช็คสถานะ', icon: Search },
]

/**
 * หน้าตาเมนูตาม design (lib/design.ts)
 * tech แคปซูลกระจกเข้ม หน้าปัจจุบันเป็นเม็ดขาว · eco แคปซูลสว่าง หน้าปัจจุบันเป็นเม็ดสีแบรนด์
 * clinical แท็บเรียบ หน้าปัจจุบันมีเส้นใต้สีแบรนด์
 */
const LOOK = {
  tech: {
    wrap: 'rounded-2xl bg-white/5 p-1 ring-1 ring-white/10',
    item: 'rounded-xl',
    active: 'bg-white text-navy-900 shadow-soft',
    idle: 'text-navy-200 hover:bg-white/10 hover:text-white',
    activeIcon: 'text-brand-600',
  },
  eco: {
    wrap: 'rounded-full bg-brand-50/90 p-1 ring-1 ring-brand-100',
    item: 'rounded-full',
    active: 'bg-brand-600 text-white shadow-soft',
    idle: 'text-navy-600 hover:bg-white hover:text-brand-700',
    activeIcon: 'text-white',
  },
  clinical: {
    wrap: '',
    item: 'relative rounded-md after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full',
    active: 'font-semibold text-brand-700 after:bg-brand-600',
    idle: 'text-navy-600 hover:bg-navy-50 hover:text-brand-700',
    activeIcon: 'text-brand-600',
  },
} satisfies Record<SiteDesign, Record<'wrap' | 'item' | 'active' | 'idle' | 'activeIcon', string>>

/** เมนูบนแถบหัว — มือถือแบ่ง 3 ช่องเต็มความกว้าง จอกว้างเรียงต่อกัน */
export function CustomerNav() {
  const pathname = usePathname()
  const look = LOOK[SITE.design]

  return (
    <nav aria-label="เมนูหลัก" className={`grid w-full grid-cols-3 gap-1 sm:flex sm:w-auto ${look.wrap}`}>
      {NAV.map((item) => {
        const active = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`group inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition duration-300 sm:text-sm focus-visible:outline-2 focus-visible:outline-brand-300 ${look.item} ${
              active ? look.active : look.idle
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 transition duration-300 ${active ? look.activeIcon : 'group-hover:scale-110'}`}
              strokeWidth={2}
            />
            <span className="sm:hidden">{item.short}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
