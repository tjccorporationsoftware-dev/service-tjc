import type { ComponentProps, ReactNode } from 'react'
import { Check } from 'lucide-react'
import { CrossPattern, EcgLine, EcoSun, EcoWaves, TechBackdrop } from '@/components/decor'
import { ThaiDatePicker, type ThaiDatePickerProps } from '@/components/thai-date-picker'
import type { SiteDesign } from '@/lib/design'
import { SITE } from '@/lib/site-content'
import Link from 'next/link'

type IconComponent = React.ComponentType<{ className?: string; strokeWidth?: number }>

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-navy-100 bg-white p-6 shadow-soft ${className}`}>
      {children}
    </div>
  )
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-navy-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-navy-400">{hint}</span>}
    </label>
  )
}

const controlClass =
  'w-full rounded-xl border border-navy-100 bg-white px-3.5 py-2.5 text-[0.95rem] text-navy-900 ' +
  'placeholder:text-navy-300 outline-none transition ' +
  'focus:border-brand-400 focus:ring-4 focus:ring-brand-100 ' +
  'disabled:bg-navy-50 disabled:text-navy-300'

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${controlClass} ${className}`} {...props} />
}

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select className={`${controlClass} ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`${controlClass} ${className}`} {...props} />
}
/** ช่องวันที่แบบ พ.ศ. — ค่าเข้า/ออกเป็น 'YYYY-MM-DD' ค.ศ. เหมือน <input type="date"> จึงใช้แทนกันได้โดยไม่แตะ state/API */
export function DateInput({
  className = '',
  ...props
}: Omit<ThaiDatePickerProps, 'inputClassName'> & { className?: string }) {
  return <ThaiDatePicker inputClassName={`${controlClass} ${className}`} {...props} />
}

/** Input พร้อมไอคอนนำหน้า — ใช้กับเบอร์โทร / Serial Number ให้ดูมีทิศทางว่ากรอกอะไร */
export function InputWithIcon({
  icon: Icon,
  className = '',
  ...props
}: ComponentProps<'input'> & { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-navy-300" />
      <Input className={`pl-10 ${className}`} {...props} />
    </div>
  )
}

function buttonClasses(
  variant: 'primary' | 'secondary' | 'danger',
  size: 'md' | 'lg' | 'xl',
  className: string
) {
  const variants = {
    // disabled ใช้พื้น 100 + ตัวหนังสือ 400 (ไม่ใช่ขาวบน 200) — palette ที่ไล่จาก BRAND_COLOR_PRIMARY สีอ่อนจะยังอ่านออก
    primary:
      'bg-brand-600 text-white shadow-soft hover:bg-brand-700 active:bg-brand-800 ' +
      'disabled:bg-brand-100 disabled:text-brand-400 disabled:shadow-none',
    secondary:
      'border border-navy-200 bg-white text-navy-700 hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-700 ' +
      'disabled:text-navy-300 disabled:hover:border-navy-200 disabled:hover:bg-white',
    danger: 'bg-rose-600 text-white shadow-soft hover:bg-rose-700 disabled:bg-rose-200',
  }
  const sizes = {
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
    xl: 'px-8 py-4 text-lg',
  }
  return `inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'danger'; size?: 'md' | 'lg' | 'xl' }) {
  return <button className={buttonClasses(variant, size, className)} {...props} />
}

/** ปุ่มที่เป็นลิงก์จริง (next/link) — กัน <button> ซ้อนใน <a> ซึ่งผิดสเปก HTML */
export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: {
  href: string
  variant?: 'primary' | 'secondary'
  size?: 'md' | 'lg' | 'xl'
  className?: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  )
}

export function Alert({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'warning' | 'info'
  children: ReactNode
}) {
  const tones = {
    error: 'border-rose-100 border-l-rose-500 bg-rose-50 text-rose-800',
    success: 'border-emerald-100 border-l-emerald-500 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-100 border-l-amber-500 bg-amber-50 text-amber-900',
    info: 'border-brand-100 border-l-brand-500 bg-brand-50 text-brand-800',
  }
  return (
    <div
      className={`rounded-xl border border-l-4 px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}
      role="status"
    >
      {children}
    </div>
  )
}

const badgeTones = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  amber: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  blue: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
  slate: 'bg-navy-50 text-navy-600 ring-1 ring-inset ring-navy-200',
} as const

export function Badge({
  tone = 'slate',
  children,
}: {
  tone?: keyof typeof badgeTones
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${badgeTones[tone]}`}
    >
      {children}
    </span>
  )
}

export const ISSUE_STATUS_TONE: Record<string, keyof typeof badgeTones> = {
  pending: 'amber',
  in_progress: 'blue',
  resolved: 'green',
  closed: 'slate',
}

/**
 * หน้าตาส่วนหัวของหน้าฟอร์มแยกตาม design ของบริษัท (lib/design.ts) — พื้น ไอคอน และสีตัวหนังสือ
 * tech พื้นกรมท่าเข้ม · eco ฟ้าสว่างมีแสงอาทิตย์และคลื่นน้ำ · clinical ขาวมีลายกากบาทและเส้นคลื่นหัวใจ
 */
const PAGE_HERO = {
  tech: {
    section: 'bg-navy-900',
    decor: <TechBackdrop />,
    icon: 'rounded-2xl bg-white/10 text-brand-200 ring-1 ring-white/15 backdrop-blur',
    success: 'rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30 backdrop-blur',
    title: 'text-white',
    text: 'text-navy-200',
    fade: false,
  },
  eco: {
    section: 'bg-linear-to-b from-brand-50 via-brand-50/60 to-white',
    decor: (
      <>
        <EcoSun className="absolute -top-72 -right-48 -z-10 h-[40rem] w-[40rem]" />
        <EcoWaves className="absolute inset-x-0 bottom-0 -z-10 h-24" />
      </>
    ),
    icon: 'rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-white shadow-soft-lg',
    success: 'rounded-full bg-emerald-500 text-white shadow-soft-lg',
    title: 'text-navy-900',
    text: 'text-navy-500',
    fade: true,
  },
  clinical: {
    section: 'bg-white',
    decor: (
      <>
        <CrossPattern className="absolute inset-0 -z-10" />
        {/* กลางกล่องขาวโล่งให้หัวข้ออ่านง่าย ลายกากบาทเหลือแค่รอบ ๆ */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_38%_55%_at_50%_45%,#fff_45%,transparent)]" />
        {/* ต่ำกว่าคำอธิบาย (pb-28) — ช่วงกลางถูกการ์ดของ PageBody ทับ เห็นเส้นวิ่งที่สองข้าง */}
        <EcgLine className="absolute inset-x-0 bottom-3 -z-10 h-16 w-full opacity-60" />
      </>
    ),
    icon: 'rounded-lg bg-brand-600 text-white shadow-soft',
    success: 'rounded-lg bg-emerald-600 text-white shadow-soft',
    title: 'text-navy-900',
    text: 'text-navy-500',
    fade: true,
  },
} satisfies Record<
  SiteDesign,
  Record<'section' | 'icon' | 'success' | 'title' | 'text', string> & { decor: ReactNode; fade: boolean }
>

/**
 * ส่วนหัวของหน้าฟอร์มฝั่งลูกค้า — ไอคอน + หัวข้อ + คำอธิบาย หน้าตาตาม design ของบริษัท
 * (เมนูสลับหน้าอยู่ที่แถบบนของ layout ที่เดียว ไม่ซ้ำในนี้)
 * เนื้อหาหน้าให้ห่อด้วย PageBody เพื่อดึงขึ้นมาทับขอบล่างของส่วนหัว
 */
export function PageHero({
  icon: Icon,
  title,
  description,
  tone = 'brand',
}: {
  icon: IconComponent
  title: string
  description: string
  tone?: 'brand' | 'success'
}) {
  const look = PAGE_HERO[SITE.design]
  return (
    <div className="relative">
      <section className={`relative isolate overflow-hidden ${look.section}`}>
        {look.decor}
        <div className="mx-auto max-w-5xl px-4 pt-12 pb-28 text-center sm:pt-14">
          <span
            className={`mx-auto flex h-16 w-16 items-center justify-center ${tone === 'success' ? look.success : look.icon}`}
          >
            <Icon className="h-8 w-8" strokeWidth={1.75} />
          </span>
          <h1 className={`mt-5 text-3xl font-bold tracking-tight sm:text-4xl ${look.title}`}>{title}</h1>
          <p className={`mx-auto mt-3 max-w-2xl leading-relaxed ${look.text}`}>{description}</p>
        </div>
      </section>
      {/* ส่วนหัวโทนสว่างจบด้วยสีขาว — ไล่จางลงไปทับพื้นหลังเว็บ ไม่ให้ตัดเป็นเส้นตรงทับแสงสีแบรนด์ที่มุมจอ (เหมือนหน้าแรก) */}
      {look.fade && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-full h-48 bg-linear-to-b from-white to-transparent"
        />
      )}
    </div>
  )
}

/** เนื้อหาใต้ PageHero — ดึงขึ้นไปทับขอบล่างของส่วนหัว ความกว้างกำหนดผ่าน className (เช่น max-w-5xl) */
export function PageBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`relative z-10 mx-auto -mt-16 box-content px-4 pb-20 ${className}`}>{children}</div>
}

/** หัวข้อย่อยในฟอร์มยาว — เลขลำดับ + ชื่อหัวข้อ · `divided` = มีเส้นคั่นด้านบน (ใช้กับทุกหัวข้อยกเว้นหัวข้อแรก) */
export function FormSection({
  number,
  title,
  hint,
  divided,
  children,
}: {
  number: number
  title: string
  hint?: string
  divided?: boolean
  children: ReactNode
}) {
  return (
    <section className={`space-y-5 ${divided ? 'border-t border-navy-100 pt-7' : ''}`}>
      <div>
        <h2 className="flex items-center gap-2.5 font-semibold text-navy-900">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100">
            {number}
          </span>
          {title}
        </h2>
        {hint && <p className="mt-1 pl-9.5 text-xs leading-relaxed text-navy-400">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** การ์ดคำแนะนำข้างฟอร์ม (จอกว้างอยู่ขวา จอแคบอยู่ใต้ฟอร์ม) */
export function TipCard({ icon: Icon, title, children }: { icon: IconComponent; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <h2 className="font-semibold text-navy-900">{title}</h2>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-navy-500">{children}</div>
    </div>
  )
}

export function TipList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" strokeWidth={2.5} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
