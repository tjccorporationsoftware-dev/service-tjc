import type { CSSProperties } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ClipboardCheck,
  FileSignature,
  LockKeyhole,
  Search,
  Sparkle,
  Wrench,
} from 'lucide-react'
import { CountUp } from '@/components/count-up'
import { ClinicalClosing, ClinicalHero } from '@/components/home/clinical'
import { EcoClosing, EcoHero } from '@/components/home/eco'
import { delay } from '@/components/home/shared'
import { TechClosing, TechHero } from '@/components/home/tech'
import { DESIGN } from '@/lib/design'
import { SITE } from '@/lib/site-content'
import { UPLOAD_LIMITS } from '@/lib/validations'

// หน้าแรกใช้อนิเมชันด้วย CSS เกือบทั้งหมด (ดูชุด --animate-* และ .reveal/.draw-x/.border-glow ใน app/globals.css)
// ยกเว้นตัวเลขนับขึ้นที่เป็น client component เล็ก ๆ (components/count-up.tsx)
// ทุกชิ้นที่ขยับใส่ motion-safe: — คนที่ตั้งลดการเคลื่อนไหวในเครื่องจะเห็นหน้านิ่งที่ครบทุกส่วน
//
// hero และกล่องปิดท้ายต่างกันตาม design ของบริษัท (SITE.design → components/home/*) ส่วนกลางหน้าใช้โครงเดียวกัน
// แต่รับรูปทรง (มุมโค้ง ไอคอน ป้ายหัวข้อ) จาก DESIGN ใน lib/design.ts

/** fade = hero โทนสว่างที่จบด้วยสีขาว ต้องต่อแถบไล่จางลงไปทับพื้นหลังเว็บ (tech เป็นโทนเข้ม ตั้งใจให้ขอบล่างคมชัด) */
const VARIANTS = {
  tech: { Hero: TechHero, Closing: TechClosing, fade: false },
  eco: { Hero: EcoHero, Closing: EcoClosing, fade: true },
  clinical: { Hero: ClinicalHero, Closing: ClinicalClosing, fade: true },
}

const D = DESIGN[SITE.design]

/** ลำดับของการ์ดในกริดที่โผล่ตอนเลื่อนถึง (.reveal) — ใบหลัง ๆ ช้ากว่าใบแรกนิดหน่อย */
const revealAt = (index: number) => ({ '--reveal-i': index }) as CSSProperties

const ACTIONS = [
  {
    href: '/register',
    icon: FileSignature,
    title: 'ลงทะเบียนสินค้า',
    text: 'กรอก Serial Number และข้อมูลสินค้าได้ด้วยตัวเอง ไม่ต้องรอเจ้าหน้าที่',
    cta: 'ลงทะเบียนเลย',
  },
  {
    href: '/report',
    icon: Wrench,
    title: 'แจ้งปัญหา',
    text: `อธิบายอาการ แนบรูปได้ ${UPLOAD_LIMITS.image.maxCount} รูปและวิดีโอ ${UPLOAD_LIMITS.video.maxCount} คลิป รับเลขที่เคสทันที`,
    cta: 'แจ้งปัญหา',
  },
  {
    href: '/status',
    icon: Search,
    title: 'เช็คสถานะ',
    text: 'ติดตามความคืบหน้าและหมายเหตุจากเจ้าหน้าที่ด้วย SN และเบอร์โทร',
    cta: 'ตรวจสอบสถานะ',
  },
]

/** ตัวเลขที่ตรงกับระบบจริงเท่านั้น — ห้ามใส่สถิติที่แต่งขึ้น */
const STATS = [
  { value: 3, suffix: '', label: 'ขั้นตอนง่าย ๆ', note: 'ลงทะเบียน → แจ้ง → ติดตาม' },
  { value: UPLOAD_LIMITS.image.maxCount, suffix: 'รูป', label: 'แนบได้ต่อการแจ้ง', note: `พร้อมวิดีโอ ${UPLOAD_LIMITS.video.maxCount} คลิป` },
  { value: 24, suffix: 'ชม.', label: 'เช็คสถานะได้ตลอด', note: 'ไม่ต้องรอเวลาทำการ' },
  { value: 100, suffix: '%', label: 'ทำผ่านเว็บ', note: 'ไม่ต้องติดตั้งแอป' },
]

const STEPS = [
  {
    icon: FileSignature,
    title: 'ลงทะเบียนสินค้า',
    text: 'กรอกชื่อ เบอร์โทร และ Serial Number จากสติกเกอร์บนตัวเครื่อง',
  },
  {
    icon: Wrench,
    title: 'แจ้งปัญหา',
    text: 'เมื่อพบอาการผิดปกติ อธิบายพร้อมแนบรูปหรือวิดีโอ แล้วรับเลขที่เคส',
  },
  {
    icon: Search,
    title: 'ติดตามสถานะ',
    text: 'ดูความคืบหน้าของเคสได้ทุกเวลา จนกว่างานบริการจะเสร็จสิ้น',
  },
]

const BENEFITS = [
  {
    icon: ClipboardCheck,
    title: 'ลงทะเบียนเองได้ทันที',
    text: 'ไม่ต้องรอเจ้าหน้าที่ แจ้งปัญหาได้เลยหลังลงทะเบียน',
  },
  {
    icon: BadgeCheck,
    title: 'ลงทะเบียนครั้งเดียว ใช้ได้ตลอด',
    text: 'ข้อมูลสินค้าถูกเก็บไว้อ้างอิงทุกครั้งที่ขอรับบริการ',
  },
  {
    icon: Camera,
    title: 'เห็นอาการจริงจากรูปและวิดีโอ',
    text: 'ทีมงานวิเคราะห์ปัญหาได้ตรงจุดและรวดเร็วขึ้น',
  },
  {
    icon: LockKeyhole,
    title: 'ข้อมูลส่วนตัวปลอดภัย',
    text: 'เบอร์โทรถูกปิดบังบนหน้าเว็บ และจัดเก็บตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล',
  },
]

export default function HomePage() {
  const { Hero, Closing, fade } = VARIANTS[SITE.design]

  return (
    <>
      {/* พื้นหลังเว็บ (.bg-app-canvas) มีแสงสีแบรนด์ที่มุมจอ — ถ้าไม่ไล่จาง hero สีขาวจะตัดเป็นเส้นตรงทับแสงนั้น
          แถบไล่จางวาง absolute จึงไม่เปลี่ยนระยะ -mt-24 ของการ์ดทางลัด (z-10 อยู่เหนือแถบนี้) */}
      <div className="relative">
        <Hero />
        {fade && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-full h-48 bg-linear-to-b from-white to-transparent"
          />
        )}
      </div>

      {/* ── ทางลัด 3 งานหลัก — ซ้อนขึ้นไปทับขอบล่างของ hero ─────── */}
      <section className="relative z-10 mx-auto -mt-24 max-w-5xl px-4">
        <div className="grid gap-5 sm:grid-cols-3">
          {ACTIONS.map(({ href, icon: Icon, title, text, cta }, index) => (
            <div key={href} className="motion-safe:animate-rise" style={delay(850 + index * 130)}>
              <Link
                href={href}
                className={`group relative flex h-full flex-col overflow-hidden ${D.card} border border-navy-100 bg-white p-7 shadow-soft-lg transition duration-500 hover:-translate-y-2 hover:border-brand-200 hover:shadow-[0_30px_60px_-20px_var(--color-brand-500)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`}
              >
                {/* แสงสีแบรนด์ค่อย ๆ ขึ้นจากมุมขวาบนตอนชี้ */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-brand-200/0 blur-2xl transition duration-500 group-hover:bg-brand-200/60"
                />
                <span
                  className={`relative flex h-14 w-14 items-center justify-center ${D.tile} transition duration-500 group-hover:scale-110 group-hover:-rotate-6`}
                >
                  <Icon className="h-7 w-7" strokeWidth={1.9} />
                </span>
                <h2 className="relative mt-6 text-xl font-semibold text-navy-900">{title}</h2>
                <p className="relative mt-2 flex-1 text-sm leading-relaxed text-navy-500">{text}</p>
                <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                  {cta}
                  <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1.5" />
                </span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── ตัวเลขนับขึ้น ─────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pt-16 sm:pt-20">
        <div
          className={`reveal grid grid-cols-2 overflow-hidden ${D.card} border border-navy-100 bg-white shadow-soft-lg lg:grid-cols-4`}
        >
          {STATS.map(({ value, suffix, label, note }, index) => (
            <div
              key={label}
              className={`p-6 text-center sm:p-8 ${index % 2 === 1 ? 'border-l border-navy-100' : ''} ${
                index >= 2 ? 'border-t border-navy-100 lg:border-t-0 lg:border-l' : ''
              }`}
            >
              <p className="flex items-baseline justify-center gap-1.5">
                <CountUp value={value} className="text-brand-gradient text-5xl font-bold sm:text-6xl" />
                {suffix && <span className="text-lg font-semibold text-brand-700">{suffix}</span>}
              </p>
              <p className="mt-2 font-semibold text-navy-900">{label}</p>
              <p className="mt-0.5 text-xs text-navy-400">{note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ประเภทอุปกรณ์ที่ลงทะเบียนได้ ─────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pt-24 sm:pt-32">
        <SectionHeading {...SITE.categoriesHeading} />

        {/* จำนวนประเภทต่างกันตามบริษัท (lib/site-content.ts) — 6 ใบวาง 3 คอลัมน์ 8 ใบวาง 4 คอลัมน์ ไม่ให้แถวสุดท้ายแหว่ง */}
        <div
          className={`mt-14 grid grid-cols-2 gap-4 sm:gap-5 ${
            SITE.categories.length % 3 === 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
          }`}
        >
          {/* .reveal อยู่ชั้นนอก แยกจาก hover:-translate-y ของการ์ด (อนิเมชันค้างค่า translate ไว้หลังจบ) */}
          {SITE.categories.map(({ icon: Icon, name, detail }, index) => (
            <div key={name} className="reveal" style={revealAt(index % 4)}>
              <div
                className={`group relative h-full overflow-hidden ${D.card} border border-navy-100 bg-white p-5 shadow-soft transition duration-500 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-[0_24px_48px_-20px_var(--color-brand-500)] sm:p-6`}
              >
                {/* ไอคอนใหญ่จาง ๆ มุมขวาล่าง — ขยายขึ้นตอนชี้ */}
                <Icon
                  aria-hidden
                  className="absolute -right-5 -bottom-5 h-28 w-28 text-brand-50 transition duration-500 group-hover:scale-110 group-hover:text-brand-100"
                  strokeWidth={1.25}
                />
                <span
                  className={`relative flex h-12 w-12 items-center justify-center ${D.tile} transition duration-500 group-hover:scale-110 group-hover:-rotate-6`}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.9} />
                </span>
                <h3 className="relative mt-5 font-semibold text-navy-900">{name}</h3>
                <p className="relative mt-1 text-sm leading-relaxed text-navy-500">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3 ขั้นตอน ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:py-32">
        <SectionHeading
          eyebrow="วิธีใช้งาน"
          title="ง่ายเพียง 3 ขั้นตอน"
          text="ไม่ต้องติดตั้งแอป ไม่ต้องสมัครสมาชิก ใช้งานผ่านเว็บได้ทั้งมือถือและคอมพิวเตอร์"
        />

        <div className="relative mt-16">
          {/* รางเส้นประ + เส้นสีแบรนด์ที่ลากตัวเองตอนเลื่อนถึง — ลากจากกลางวงแรกถึงกลางวงสุดท้าย เฉพาะจอกว้าง */}
          <div aria-hidden className="absolute top-12 right-[16.67%] left-[16.67%] hidden md:block">
            <div className="border-t-2 border-dashed border-brand-200" />
            <div className="draw-x absolute -top-0.5 left-0 h-1 w-full origin-left rounded-full bg-linear-to-r from-brand-300 via-brand-500 to-brand-300" />
          </div>

          <ol className="relative grid gap-14 md:grid-cols-3 md:gap-6">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="reveal relative text-center" style={revealAt(index)}>
                <div className="group relative mx-auto flex h-24 w-24 items-center justify-center">
                  <span
                    aria-hidden
                    className={`absolute -inset-2.5 border-2 border-dashed border-brand-300 motion-safe:animate-orbit ${
                      SITE.design === 'clinical' ? 'rounded-2xl' : 'rounded-full'
                    }`}
                  />
                  <span
                    className={`relative flex h-20 w-20 items-center justify-center ${D.stepIcon} text-white shadow-soft-lg ring-8 ring-white transition duration-500 group-hover:scale-105`}
                  >
                    <Icon className="h-9 w-9" strokeWidth={1.7} />
                  </span>
                  <span className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-700 shadow-soft ring-1 ring-brand-100">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-navy-900">{title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-navy-500">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── ทำไมต้องลงทะเบียน ──────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:pb-32">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
          <div className={`reveal relative isolate overflow-hidden ${D.brandPanel} p-8 text-white shadow-soft-lg sm:p-10`}>
            <div
              aria-hidden
              className="absolute -right-20 -bottom-20 -z-10 h-64 w-64 rounded-full border-[30px] border-white/10 motion-safe:animate-orbit"
            >
              <span className="absolute top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-white/60" />
            </div>
            <div
              aria-hidden
              className="absolute -top-16 -left-16 -z-10 h-48 w-48 rounded-full bg-white/10 blur-2xl motion-safe:animate-aurora"
            />
            <p className="text-sm font-semibold tracking-wide text-brand-100">ทำไมต้องลงทะเบียน</p>
            <h2 className="mt-3 text-2xl leading-snug font-bold sm:text-3xl">
              บริการหลังการขายที่รวดเร็ว เริ่มต้นจากการลงทะเบียน
            </h2>
            <p className="mt-4 leading-relaxed text-brand-100">
              ข้อมูลที่ลงทะเบียนไว้ช่วยให้ทีมงานรู้ทันทีว่าเป็นเครื่องไหน รุ่นอะไร และติดต่อท่านกลับได้เมื่อแจ้งปัญหา
            </p>
            <Link
              href="/register"
              className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
            >
              เริ่มลงทะเบียน
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* .reveal อยู่ชั้นนอก — อนิเมชันค้างค่า translate ไว้หลังจบ ถ้าอยู่ชั้นเดียวกับ hover:-translate-y จะยกไม่ขึ้น */}
            {BENEFITS.map(({ icon: Icon, title, text }, index) => (
              <div key={title} className="reveal" style={revealAt(index + 1)}>
                <div
                  className={`group h-full ${D.card} border border-navy-100 bg-white p-6 shadow-soft transition duration-500 hover:-translate-y-1 hover:border-brand-200 hover:shadow-soft-lg`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center ${D.softTile} bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition duration-500 group-hover:rotate-6 group-hover:bg-brand-600 group-hover:text-white`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <h3 className="mt-5 font-semibold text-navy-900">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Closing />
    </>
  )
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="reveal mx-auto max-w-2xl text-center">
      <p className={`inline-flex items-center gap-2 px-3.5 py-1 text-sm font-semibold text-brand-700 ${D.eyebrow}`}>
        <Sparkle className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-balance text-navy-900 sm:text-5xl">{title}</h2>
      <p className="mt-5 leading-relaxed text-navy-500 sm:text-lg">{text}</p>
    </div>
  )
}
