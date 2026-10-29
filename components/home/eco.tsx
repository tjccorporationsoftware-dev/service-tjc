import Link from 'next/link'
import { ArrowRight, Check, CheckCircle2, FileSignature, ImagePlus, Leaf, Search, Wrench } from 'lucide-react'
import { EcoSun, EcoWaves } from '@/components/decor'
import { SITE } from '@/lib/site-content'
import { TIMELINE, TRUST, delay } from './shared'

// design "eco" (TANGJAI) — สว่าง โปร่ง ธรรมชาติ: แสงอาทิตย์ คลื่นน้ำ ปุ่มทรงแคปซูล การ์ดลอยนุ่ม ๆ วงแหวนความคืบหน้า

const CTA_PRIMARY =
  'group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-[0_18px_40px_-14px_var(--color-brand-600)] transition duration-300 hover:-translate-y-0.5 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
const CTA_SECONDARY =
  'group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-brand-700 shadow-soft ring-1 ring-brand-200 transition duration-300 hover:-translate-y-0.5 hover:ring-brand-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

export function EcoHero() {
  return (
    <section className="relative isolate overflow-hidden bg-linear-to-b from-brand-50 via-white to-brand-50/50">
      <EcoSun className="absolute -top-64 -right-56 -z-10 h-[48rem] w-[48rem]" />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -left-40 -z-10 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl motion-safe:animate-aurora"
      />
      <EcoWaves className="absolute inset-x-0 bottom-0 -z-10 h-40" />

      <div className="mx-auto grid max-w-5xl items-center gap-16 px-4 pt-16 pb-44 sm:pt-20 lg:min-h-[calc(100svh-65px)] lg:grid-cols-[1.1fr_1fr] lg:pt-12 lg:pb-48">
        <div className="text-center lg:text-left">
          <span
            className="inline-flex items-center gap-2.5 rounded-full bg-white/90 py-1.5 pr-4 pl-1.5 text-xs font-semibold text-brand-700 shadow-soft ring-1 ring-brand-200 sm:text-sm motion-safe:animate-rise"
            style={delay(0)}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
              <Leaf className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            {SITE.hero.badge}
          </span>

          <h1 className="mt-7 text-4xl leading-tight font-bold tracking-tight text-navy-900 sm:text-5xl lg:text-[3.4rem]">
            <span className="block motion-safe:animate-rise" style={delay(120)}>
              {SITE.hero.titleTop}
            </span>
            <span className="relative mt-1 inline-block motion-safe:animate-rise" style={delay(260)}>
              <span className="text-brand-gradient">{SITE.hero.titleHighlight}</span>
              {/* เส้นขีดใต้แบบลายมือ ค่อย ๆ เขียนตัวเองหลังหัวข้อขึ้นมา */}
              <svg
                aria-hidden
                viewBox="0 0 300 20"
                preserveAspectRatio="none"
                className="absolute -bottom-3 left-0 h-4 w-full"
              >
                <path
                  d="M4 14 C 90 2, 190 2, 296 10"
                  pathLength={1}
                  fill="none"
                  strokeWidth={6}
                  strokeLinecap="round"
                  className="stroke-brand-300 [stroke-dasharray:1] motion-safe:animate-[draw-path_1.1s_cubic-bezier(0.22,1,0.36,1)_both]"
                  style={delay(900)}
                />
              </svg>
            </span>
          </h1>

          <p
            className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-navy-600 sm:text-lg lg:mx-0 motion-safe:animate-rise"
            style={delay(420)}
          >
            {SITE.hero.description}
          </p>

          <div
            className="mt-10 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start motion-safe:animate-rise"
            style={delay(560)}
          >
            <Link href="/register" className={CTA_PRIMARY}>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-white/35 to-transparent motion-safe:animate-shine"
              />
              <FileSignature className="h-5 w-5" />
              ลงทะเบียนสินค้า
              <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/report" className={CTA_SECONDARY}>
              <Wrench className="h-5 w-5 transition duration-300 group-hover:-rotate-12" />
              แจ้งปัญหา
            </Link>
          </div>

          <ul
            className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-navy-500 lg:justify-start motion-safe:animate-rise"
            style={delay(700)}
          >
            {TRUST.map((text) => (
              <li key={text} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-brand-600" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <EcoShowcase />
      </div>
    </section>
  )
}

export function EcoClosing() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-24 sm:pb-32">
      <div className="reveal relative isolate overflow-hidden rounded-[2.5rem] bg-linear-to-br from-brand-500 via-brand-600 to-brand-700 px-6 pt-16 pb-32 text-center shadow-soft-lg sm:px-12 sm:pt-20">
        <EcoSun className="absolute -top-48 -right-40 -z-10 h-[30rem] w-[30rem] opacity-50" />
        <EcoWaves tone="onBrand" className="absolute inset-x-0 bottom-0 -z-10 h-28" />

        <h2 className="text-2xl font-bold text-white sm:text-5xl sm:leading-tight">พร้อมเริ่มต้นแล้วหรือยัง?</h2>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-brand-50 sm:text-lg">
          ลงทะเบียนสินค้าของคุณวันนี้ เพื่อรับบริการหลังการขายได้รวดเร็วยิ่งขึ้นเมื่อต้องการ
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-brand-700 shadow-soft-lg transition duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <FileSignature className="h-5 w-5" />
            ลงทะเบียนสินค้า
            <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
          </Link>
          <Link
            href="/status"
            className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white ring-1 ring-white/50 transition duration-300 hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Search className="h-5 w-5" />
            เช็คสถานะ
          </Link>
        </div>
      </div>
    </section>
  )
}

const ShowcaseIcon = SITE.showcase.icon

/**
 * ภาพประกอบ hero — การ์ดสถานะเคสลอยขึ้นลงนุ่ม ๆ มีวงแหวนความคืบหน้า และชิปลอยทรงแคปซูล
 * ไม่ใช่ข้อมูลจริง จึงซ่อนจาก screen reader ทั้งก้อน
 */
function EcoShowcase() {
  return (
    <div
      aria-hidden
      className="relative mx-auto hidden w-full max-w-sm select-none lg:block motion-safe:animate-rise"
      style={delay(320)}
    >
      {/* วงแสงด้านหลังการ์ด */}
      <div className="absolute top-1/2 left-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-brand-100)_0%,transparent_70%)]" />

      <div className="motion-safe:animate-float" style={{ animationDuration: '9s' }}>
        <div className="rounded-[2rem] bg-white p-6 shadow-[0_40px_80px_-30px_var(--color-brand-700)] ring-1 ring-brand-100">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-white shadow-soft">
              <ShowcaseIcon className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-navy-900">{SITE.showcase.product}</p>
              <p className="text-xs text-navy-400">{SITE.showcase.detail}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-5 rounded-3xl bg-brand-50/70 p-4">
            {/* วงแหวนความคืบหน้า 3 จาก 4 ขั้น (pathLength=100 → เหลือ 25 = เต็ม 75%) */}
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" className="stroke-white" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="100"
                  className="stroke-brand-500 motion-safe:animate-[ring-fill_1.6s_cubic-bezier(0.22,1,0.36,1)_both]"
                  style={{ strokeDashoffset: 25, ...delay(900) }}
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-navy-900">3/4</span>
                <span className="text-[10px] text-navy-400">ขั้นตอน</span>
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-navy-400">คำขอรับบริการ</p>
              <p className="font-mono font-bold text-navy-900">CASE-000128</p>
              <span className="mt-1.5 inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                กำลังดำเนินการ
              </span>
            </div>
          </div>

          <ul className="mt-5 space-y-2.5">
            {TIMELINE.map(({ title, state }, index) => (
              <li key={title} className="flex items-center gap-3 text-sm">
                {state === 'done' ? (
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white motion-safe:animate-pop"
                    style={delay(1000 + index * 250)}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : state === 'current' ? (
                  <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                    <span className="absolute h-6 w-6 rounded-full bg-brand-300/50 motion-safe:animate-ping" />
                    <span className="h-3 w-3 rounded-full bg-brand-600" />
                  </span>
                ) : (
                  <span className="h-6 w-6 shrink-0 rounded-full border-2 border-brand-100 bg-white" />
                )}
                <span className={state === 'pending' ? 'text-navy-400' : 'font-medium text-navy-800'}>{title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="absolute -top-10 -left-14 motion-safe:animate-rise" style={delay(1200)}>
        <div className="flex items-center gap-2.5 rounded-full bg-white py-2 pr-5 pl-2 shadow-soft-lg ring-1 ring-brand-100 motion-safe:animate-float">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-navy-900">ลงทะเบียนสำเร็จ</span>
        </div>
      </div>

      <div className="absolute -right-10 -bottom-8 motion-safe:animate-rise" style={delay(1450)}>
        <div
          className="flex items-center gap-2.5 rounded-full bg-white py-2 pr-5 pl-2 shadow-soft-lg ring-1 ring-brand-100 motion-safe:animate-float"
          style={{ animationDelay: '-3.5s' }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <ImagePlus className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-navy-900">แนบรูป + วิดีโอ</span>
        </div>
      </div>
    </div>
  )
}
