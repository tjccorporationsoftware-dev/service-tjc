import Link from 'next/link'
import { ArrowRight, Check, CheckCircle2, FileSignature, ImagePlus, Search, Sparkles, Wrench } from 'lucide-react'
import { SITE } from '@/lib/site-content'
import { TIMELINE, TRUST, delay } from './shared'

// design "tech" (TJC) — โทนเข้มแบบศูนย์ควบคุมไอที: ก้อนแสงลอย ตาราง เส้นแสงกวาด ละอองแสง การ์ด 3 มิติในวงโคจร

// พื้นเข้มใช้ปุ่มขาวเป็นปุ่มหลัก — คอนทราสต์สูงเสมอไม่ว่า BRAND_COLOR_PRIMARY จะเป็นสีอะไร
const CTA_PRIMARY =
  'group relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-8 py-4 text-base font-semibold text-navy-900 shadow-soft-lg transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-12px_var(--color-brand-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
const CTA_GHOST =
  'group inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

/** ละอองแสง — ตำแหน่งตายตัว (ไม่สุ่มตอน render จะได้ไม่ต่างกันระหว่าง server กับ client) */
const PARTICLES = [
  { left: '6%', size: 4, delay: 0, duration: 13 },
  { left: '14%', size: 3, delay: -5, duration: 16 },
  { left: '23%', size: 5, delay: -9, duration: 12 },
  { left: '31%', size: 3, delay: -2, duration: 15 },
  { left: '42%', size: 4, delay: -11, duration: 14 },
  { left: '51%', size: 3, delay: -7, duration: 17 },
  { left: '60%', size: 5, delay: -3, duration: 13 },
  { left: '68%', size: 3, delay: -12, duration: 16 },
  { left: '77%', size: 4, delay: -6, duration: 12 },
  { left: '85%', size: 3, delay: -1, duration: 15 },
  { left: '93%', size: 4, delay: -8, duration: 14 },
]

export function TechHero() {
  return (
    <section className="relative isolate overflow-hidden bg-navy-900">
      <HeroAtmosphere />

      <div className="mx-auto grid max-w-5xl items-center gap-16 px-4 pt-16 pb-36 sm:pt-20 lg:min-h-[calc(100svh-65px)] lg:grid-cols-[1.1fr_1fr] lg:pt-12 lg:pb-40">
        <div className="text-center lg:text-left">
          <span
            className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 py-1.5 pr-4 pl-2 text-xs font-medium text-brand-100 backdrop-blur sm:text-sm motion-safe:animate-rise"
            style={delay(0)}
          >
            <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/30">
              <span className="absolute h-full w-full rounded-full bg-brand-400/40 motion-safe:animate-ping" />
              <Sparkles className="relative h-3 w-3 text-brand-100" strokeWidth={2.5} />
            </span>
            {SITE.hero.badge}
          </span>

          <h1 className="mt-7 text-4xl leading-tight font-bold tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
            <span className="block motion-safe:animate-rise" style={delay(120)}>
              {SITE.hero.titleTop}
            </span>
            <span className="mt-1 block motion-safe:animate-rise" style={delay(260)}>
              <span className="text-shimmer motion-safe:animate-shimmer">{SITE.hero.titleHighlight}</span>
            </span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-navy-200 sm:text-lg lg:mx-0 motion-safe:animate-rise"
            style={delay(420)}
          >
            {SITE.hero.description}
          </p>

          <div
            className="mt-10 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start motion-safe:animate-rise"
            style={delay(560)}
          >
            <Link href="/register" className={CTA_PRIMARY}>
              <Shine />
              <FileSignature className="h-5 w-5 text-brand-600" />
              ลงทะเบียนสินค้า
              <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/report" className={CTA_GHOST}>
              <Wrench className="h-5 w-5 transition duration-300 group-hover:-rotate-12" />
              แจ้งปัญหา
            </Link>
          </div>

          <ul
            className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-navy-300 lg:justify-start motion-safe:animate-rise"
            style={delay(700)}
          >
            {TRUST.map((text) => (
              <li key={text} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-brand-300" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <HeroShowcase />
      </div>
    </section>
  )
}

export function TechClosing() {
  return (
    <section className="mx-auto max-w-5xl px-4 pb-24 sm:pb-32">
      <div className="reveal border-glow relative isolate overflow-hidden rounded-[2rem] bg-navy-900 px-6 py-16 text-center shadow-soft-lg sm:px-12 sm:py-20">
        <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-10" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/4 -z-10 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl motion-safe:animate-aurora"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -bottom-40 -z-10 h-96 w-96 rounded-full bg-brand-700/40 blur-3xl motion-safe:animate-aurora"
          style={{ animationDelay: '-9s' }}
        />
        <Particles count={6} />

        <h2 className="text-2xl font-bold text-white sm:text-5xl sm:leading-tight">
          พร้อมเริ่มต้น<span className="text-shimmer motion-safe:animate-shimmer">แล้วหรือยัง?</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-navy-200 sm:text-lg">
          ลงทะเบียนสินค้าของคุณวันนี้ เพื่อรับบริการหลังการขายได้รวดเร็วยิ่งขึ้นเมื่อต้องการ
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/register" className={CTA_PRIMARY}>
            <Shine />
            <FileSignature className="h-5 w-5 text-brand-600" />
            ลงทะเบียนสินค้า
            <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
          </Link>
          <Link href="/status" className={CTA_GHOST}>
            <Search className="h-5 w-5" />
            เช็คสถานะ
          </Link>
        </div>
      </div>
    </section>
  )
}

/** ฉากหลังของ hero — ก้อนแสงลอย, ไฟส่องจากด้านบน, เส้นตาราง, เส้นแสงกวาด และละอองแสง */
function HeroAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -top-48 -left-40 h-[36rem] w-[36rem] rounded-full bg-brand-500/30 blur-3xl motion-safe:animate-aurora" />
      <div
        className="absolute top-1/4 -right-48 h-[32rem] w-[32rem] rounded-full bg-brand-400/20 blur-3xl motion-safe:animate-aurora"
        style={{ animationDelay: '-6s', animationDuration: '22s' }}
      />
      <div
        className="absolute -bottom-64 left-1/4 h-[40rem] w-[40rem] rounded-full bg-brand-700/40 blur-3xl motion-safe:animate-aurora"
        style={{ animationDelay: '-12s', animationDuration: '26s' }}
      />
      <div className="absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(ellipse_45%_55%_at_50%_0%,rgb(255_255_255/0.09),transparent_70%)]" />
      <div className="hero-grid absolute inset-0" />
      <div className="absolute inset-x-0 h-px bg-linear-to-r from-transparent via-brand-300/70 to-transparent opacity-0 motion-safe:animate-beam" />
      <Particles count={PARTICLES.length} />
    </div>
  )
}

function Particles({ count }: { count: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {PARTICLES.slice(0, count).map((p) => (
        <span
          key={p.left}
          className="absolute -bottom-2 rounded-full bg-brand-200 opacity-0 shadow-[0_0_10px_var(--color-brand-300)] motion-safe:animate-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

/** แสงวาบพาดผ่านปุ่มหลักเป็นระยะ */
function Shine() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-brand-200/80 to-transparent motion-safe:animate-shine"
    />
  )
}

const ShowcaseIcon = SITE.showcase.icon

/** ไอคอนอุปกรณ์ 6 ตัวแรก วางรอบวงโคจรนอกเท่า ๆ กัน เริ่มจากด้านบนสุด (คำนวณตายตัว server/client ได้ค่าเดียวกัน) */
const ORBIT_ICONS = SITE.categories.slice(0, 6).map(({ icon }, index, list) => {
  const angle = (index / list.length) * 2 * Math.PI - Math.PI / 2
  return {
    icon,
    left: `${(50 + 50 * Math.cos(angle)).toFixed(2)}%`,
    top: `${(50 + 50 * Math.sin(angle)).toFixed(2)}%`,
  }
})

/**
 * ภาพประกอบ hero — การ์ดจำลองหน้าสถานะเคสเอียงแบบ 3 มิติ วงโคจรรอบ ๆ และการ์ดเล็กลอย
 * ไม่ใช่ข้อมูลจริง จึงซ่อนจาก screen reader ทั้งก้อน
 */
function HeroShowcase() {
  return (
    <div
      aria-hidden
      className="relative mx-auto hidden w-full max-w-sm select-none lg:block motion-safe:animate-rise"
      style={delay(320)}
    >
      {/* วงโคจร 2 วง หมุนสวนทางกัน — วงนอกพาไอคอนอุปกรณ์ไปด้วย แต่ละไอคอนหมุนกลับด้วยความเร็วเท่ากันจึงตั้งตรงเสมอ */}
      <div className="absolute top-1/2 left-1/2 -z-10 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 motion-safe:animate-orbit">
        {ORBIT_ICONS.map(({ icon: Icon, left, top }) => (
          <span
            key={`${left}-${top}`}
            className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-navy-800/90 text-brand-200 shadow-[0_0_24px_-6px_var(--color-brand-400)] motion-safe:animate-[orbit_40s_linear_infinite_reverse]"
            style={{ left, top }}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>
        ))}
      </div>
      <div className="absolute top-1/2 left-1/2 -z-10 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/15 motion-safe:animate-orbit-reverse">
        <span className="absolute top-1/2 -right-1.5 h-3 w-3 -translate-y-1/2 rounded-full bg-brand-400 shadow-[0_0_14px_var(--color-brand-400)]" />
      </div>

      {/* การ์ดหลักเอียง 3 มิติ — ชี้แล้วค่อย ๆ หันมาตรง */}
      <div className="perspective-[1400px]">
        <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-[0_40px_80px_-24px_rgb(0_0_0/0.6)] transition duration-700 ease-out transform-3d rotate-x-6 -rotate-y-12 hover:rotate-x-0 hover:rotate-y-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-navy-400">คำขอรับบริการ</p>
              <p className="font-mono text-lg font-bold text-navy-900">CASE-000128</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              กำลังดำเนินการ
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl bg-navy-50/70 px-3.5 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-soft">
              <ShowcaseIcon className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy-900">{SITE.showcase.product}</p>
              <p className="text-xs text-navy-400">{SITE.showcase.detail}</p>
              <p className="tabular font-mono text-xs text-navy-500">SN · B012608000128</p>
            </div>
          </div>

          <ol className="mt-5">
            {TIMELINE.map(({ title, detail, state }, index) => (
              <li key={title} className="relative flex gap-3 pb-4 last:pb-0">
                {index < TIMELINE.length - 1 && <span className="absolute top-7 bottom-0 left-3 w-px bg-navy-100" />}
                {state === 'done' ? (
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white motion-safe:animate-pop"
                    style={delay(1000 + index * 280)}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : state === 'current' ? (
                  <span
                    className="relative flex h-6 w-6 shrink-0 items-center justify-center motion-safe:animate-pop"
                    style={delay(1560)}
                  >
                    <span className="absolute h-6 w-6 rounded-full bg-brand-400/40 motion-safe:animate-ping" />
                    <span className="h-3 w-3 rounded-full bg-brand-600" />
                  </span>
                ) : (
                  <span className="h-6 w-6 shrink-0 rounded-full border-2 border-navy-200 bg-white" />
                )}
                <div className="-mt-0.5">
                  <p className={`text-sm font-medium ${state === 'pending' ? 'text-navy-400' : 'text-navy-900'}`}>
                    {title}
                  </p>
                  <p className="text-xs text-navy-400">{detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-5 border-t border-navy-100 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-navy-400">ความคืบหน้า</span>
              <span className="font-semibold text-brand-700">ขั้นที่ 3 จาก 4</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-100">
              <div
                className="h-full w-3/4 origin-left rounded-full bg-linear-to-r from-brand-400 to-brand-600 motion-safe:animate-grow-x"
                style={delay(1700)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* การ์ดเล็กลอย — ชั้นนอกโผล่ตอนโหลด ชั้นในลอยขึ้นลง (แยกชั้นเพราะ animation ชนกันในชั้นเดียว) */}
      <div className="absolute -top-14 -left-16 motion-safe:animate-rise" style={delay(1200)}>
        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft-lg ring-1 ring-black/5 motion-safe:animate-float">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">ลงทะเบียนสำเร็จ</p>
            <p className="text-xs text-navy-400">แจ้งปัญหาได้ทันที</p>
          </div>
        </div>
      </div>

      <div className="absolute -right-12 -bottom-10 motion-safe:animate-rise" style={delay(1450)}>
        <div
          className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft-lg ring-1 ring-black/5 motion-safe:animate-float"
          style={{ animationDelay: '-3.5s' }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ImagePlus className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">แนบรูป + วิดีโอ</p>
            <p className="text-xs text-navy-400">เห็นอาการจริงก่อนซ่อม</p>
          </div>
        </div>
      </div>
    </div>
  )
}
