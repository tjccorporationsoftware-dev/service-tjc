import Link from 'next/link'
import { Activity, ArrowRight, Check, CheckCircle2, FileSignature, ImagePlus, Search, ShieldCheck, Wrench } from 'lucide-react'
import { CrossPattern, EcgLine } from '@/components/decor'
import { SITE } from '@/lib/site-content'
import { TIMELINE, TRUST, delay } from './shared'

// design "clinical" (ART) — ขาวสะอาดแบบโรงพยาบาล: แผงเอียงลายกากบาท เส้นคลื่นหัวใจ จอมอนิเตอร์ ปุ่มเหลี่ยม จัดชิดซ้าย

const CTA_PRIMARY =
  'group inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-7 py-3.5 text-base font-semibold text-white shadow-soft transition duration-300 hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
const CTA_SECONDARY =
  'group inline-flex items-center justify-center gap-2 rounded-lg border border-navy-200 bg-white px-7 py-3.5 text-base font-semibold text-navy-800 transition duration-300 hover:border-brand-400 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

/** ป้ายสถานะท้ายแต่ละแถวในจอจำลอง */
const ROW_STATUS = { done: 'เสร็จแล้ว', current: 'กำลังดำเนินการ', pending: 'รอ' } as const

export function ClinicalHero() {
  return (
    <section className="relative isolate overflow-hidden bg-white">
      {/* แผงสีแบรนด์อ่อนขอบเอียงทางขวา + ลายกากบาท */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-[46%] bg-brand-50 [clip-path:polygon(16%_0,100%_0,100%_100%,0_100%)] [mask-image:linear-gradient(to_bottom,#000_65%,transparent)] lg:block"
      />
      {/* จอแคบลายเต็มกว้างอยู่หลังตัวหนังสือ จึงจางลง */}
      <CrossPattern className="absolute inset-y-0 right-0 -z-10 w-full opacity-40 lg:w-[46%] lg:opacity-100" />
      <EcgLine className="absolute inset-x-0 bottom-24 -z-10 h-24 w-full opacity-60" />

      <div className="mx-auto grid max-w-5xl items-center gap-16 px-4 pt-16 pb-40 sm:pt-20 lg:min-h-[calc(100svh-69px)] lg:grid-cols-[1.1fr_1fr] lg:pt-12 lg:pb-44">
        <div className="text-center lg:text-left">
          <span
            className="inline-flex items-center gap-2 rounded-md border-l-4 border-brand-500 bg-brand-50 py-1.5 pr-4 pl-3 text-xs font-semibold text-brand-700 sm:text-sm motion-safe:animate-rise"
            style={delay(0)}
          >
            {/* เส้นคลื่นกลาง ๆ อ่านได้ทั้งชีพจรและสัญญาณไฟฟ้า (ART มีทั้งเครื่องมือแพทย์และอุปกรณ์ไฟฟ้า) */}
            <Activity className="h-4 w-4" strokeWidth={2.2} />
            {SITE.hero.badge}
          </span>

          <h1 className="mt-7 text-4xl leading-tight font-bold tracking-tight text-navy-900 sm:text-5xl lg:text-[3.4rem]">
            <span className="block motion-safe:animate-rise" style={delay(120)}>
              {SITE.hero.titleTop}
            </span>
            <span className="mt-1 block text-brand-600 motion-safe:animate-rise" style={delay(260)}>
              {SITE.hero.titleHighlight}
            </span>
          </h1>
          {/* เส้นสีแบรนด์ใต้หัวข้อ ยืดจากซ้ายไปขวา */}
          <span
            aria-hidden
            className="mx-auto mt-6 block h-1 w-20 origin-left rounded-full bg-brand-500 lg:mx-0 motion-safe:animate-grow-x"
            style={delay(500)}
          />

          <p
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-navy-600 sm:text-lg lg:mx-0 motion-safe:animate-rise"
            style={delay(420)}
          >
            {SITE.hero.description}
          </p>

          <div
            className="mt-10 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start motion-safe:animate-rise"
            style={delay(560)}
          >
            <Link href="/register" className={CTA_PRIMARY}>
              <FileSignature className="h-5 w-5" />
              ลงทะเบียนสินค้า
              <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/report" className={CTA_SECONDARY}>
              <Wrench className="h-5 w-5" />
              แจ้งปัญหา
            </Link>
          </div>

          <ul
            className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-navy-500 lg:justify-start motion-safe:animate-rise"
            style={delay(700)}
          >
            {TRUST.map((text) => (
              <li key={text} className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <ClinicalShowcase />
      </div>
    </section>
  )
}

export function ClinicalClosing() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-24 sm:pb-32">
      <div className="reveal relative isolate overflow-hidden rounded-xl border border-navy-100 bg-white shadow-soft-lg">
        <span aria-hidden className="absolute inset-y-0 left-0 w-2 bg-brand-600" />
        <CrossPattern className="absolute inset-y-0 right-0 -z-10 w-2/3" />
        <EcgLine className="absolute inset-x-0 bottom-4 -z-10 h-16 w-full opacity-50" />

        <div className="flex flex-col gap-8 px-8 py-12 sm:px-14 sm:py-14 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-navy-900 sm:text-4xl sm:leading-tight">
              พร้อมเริ่มต้น<span className="text-brand-600">แล้วหรือยัง?</span>
            </h2>
            <p className="mt-4 leading-relaxed text-navy-500 sm:text-lg">
              ลงทะเบียนสินค้าของคุณวันนี้ เพื่อรับบริการหลังการขายได้รวดเร็วยิ่งขึ้นเมื่อต้องการ
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/register" className={CTA_PRIMARY}>
              <FileSignature className="h-5 w-5" />
              ลงทะเบียนสินค้า
              <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/status" className={CTA_SECONDARY}>
              <Search className="h-5 w-5" />
              เช็คสถานะ
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

const ShowcaseIcon = SITE.showcase.icon

/**
 * ภาพประกอบ hero — การ์ดสไตล์จอเครื่องมือแพทย์: แถบหัวสีแบรนด์ จอมืดมีเส้นคลื่นหัวใจวิ่ง และรายการขั้นตอนแบบตาราง
 * ไม่ใช่ข้อมูลจริง จึงซ่อนจาก screen reader ทั้งก้อน
 */
function ClinicalShowcase() {
  return (
    <div
      aria-hidden
      className="relative mx-auto hidden w-full max-w-sm select-none lg:block motion-safe:animate-rise"
      style={delay(320)}
    >
      <div className="overflow-hidden rounded-xl border border-navy-100 bg-white shadow-[0_30px_70px_-28px_rgb(16_35_55/0.45)]">
        <div className="flex items-center justify-between bg-brand-600 px-5 py-3 text-white">
          <span className="text-sm font-semibold">คำขอรับบริการ</span>
          <span className="font-mono text-sm tracking-wide">CASE-000128</span>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <ShowcaseIcon className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-navy-900">{SITE.showcase.product}</p>
              <p className="text-xs text-navy-400">{SITE.showcase.detail}</p>
            </div>
          </div>

          {/* จอแสดงผลแบบเครื่องมือแพทย์ */}
          <div className="mt-4 rounded-lg bg-navy-900 px-4 pt-3 pb-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-navy-300">สถานะงานบริการ</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-brand-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute h-full w-full rounded-full bg-brand-400 motion-safe:animate-ping" />
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                </span>
                กำลังตรวจสอบ
              </span>
            </div>
            <EcgLine className="mt-1 h-16 w-full" trace="stroke-brand-400" base="stroke-white/15" />
          </div>

          <ul className="mt-4 divide-y divide-navy-100 text-sm">
            {TIMELINE.map(({ title, state }, index) => (
              <li key={title} className="flex items-center gap-3 py-2.5">
                {state === 'done' ? (
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-500 text-white motion-safe:animate-pop"
                    style={delay(1000 + index * 250)}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : state === 'current' ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-brand-500">
                    <span className="h-2 w-2 rounded-sm bg-brand-500 motion-safe:animate-pulse" />
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded border-2 border-navy-200" />
                )}
                <span className={`flex-1 ${state === 'pending' ? 'text-navy-400' : 'font-medium text-navy-800'}`}>
                  {title}
                </span>
                <span
                  className={`text-xs ${
                    state === 'done' ? 'text-emerald-600' : state === 'current' ? 'font-medium text-brand-600' : 'text-navy-300'
                  }`}
                >
                  {ROW_STATUS[state]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ลอยเหนือการ์ด ไม่ทับแถบหัวสีแบรนด์ */}
      <div className="absolute -top-16 -left-14 motion-safe:animate-rise" style={delay(1200)}>
        <div className="flex items-center gap-3 rounded-lg border-l-4 border-emerald-500 bg-white px-4 py-3 shadow-soft-lg motion-safe:animate-float">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-navy-900">ลงทะเบียนสำเร็จ</p>
            <p className="text-xs text-navy-400">แจ้งปัญหาได้ทันที</p>
          </div>
        </div>
      </div>

      <div className="absolute -right-10 -bottom-8 motion-safe:animate-rise" style={delay(1450)}>
        <div
          className="flex items-center gap-3 rounded-lg border-l-4 border-brand-500 bg-white px-4 py-3 shadow-soft-lg motion-safe:animate-float"
          style={{ animationDelay: '-3.5s' }}
        >
          <ImagePlus className="h-5 w-5 text-brand-600" />
          <div>
            <p className="text-sm font-semibold text-navy-900">แนบรูป + วิดีโอ</p>
            <p className="text-xs text-navy-400">เห็นอาการจริงก่อนซ่อม</p>
          </div>
        </div>
      </div>
    </div>
  )
}
