/**
 * ของตกแต่งพื้นหลังตาม design ของแต่ละบริษัท (lib/design.ts) — ใช้ทั้งหน้าแรกและส่วนหัวหน้าฟอร์ม (PageHero)
 * ทุกชิ้นเป็นของประดับ: aria-hidden + pointer-events-none · ทุกอย่างที่ขยับใส่ motion-safe:
 * ใส่ในกล่องที่มี `relative isolate overflow-hidden` แล้วกำหนดตำแหน่ง/ขนาดผ่าน className
 */

/** tech — เส้นตารางจาง ๆ + แสงสีแบรนด์ 2 มุม บนพื้นกรมท่าเข้ม */
export function TechBackdrop() {
  return (
    <>
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 -left-40 -z-10 h-[32rem] w-[32rem] rounded-full bg-brand-500/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -bottom-56 -z-10 h-[36rem] w-[36rem] rounded-full bg-brand-600/30 blur-3xl"
      />
    </>
  )
}

/** eco — แสงอาทิตย์: วงแสงนวลสีแบรนด์ + รัศมีที่หมุนช้ามาก (กำหนดขนาด/ตำแหน่งผ่าน className) */
export function EcoSun({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none ${className}`}>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--color-brand-200)_0%,transparent_62%)]" />
      <div className="eco-rays absolute inset-0 rounded-full motion-safe:animate-[orbit_140s_linear_infinite]" />
    </div>
  )
}

/** คลื่นหนึ่งลูกยาว 1440 หน่วย ซ้ำ 2 ลูกในกว้าง 2880 — เลื่อนไปครึ่งหนึ่งแล้ววนกลับจะต่อกันพอดี */
const WAVE_PATH =
  'M0 64 C240 24 480 24 720 64 S1200 104 1440 64 S1920 24 2160 64 S2640 104 2880 64 V160 H0 Z'

const WAVE_TONES = {
  /** บนพื้นสว่าง — ลูกหน้าสุดเป็นสีขาวกลืนกับเนื้อหาด้านล่าง */
  light: ['fill-brand-200/50', 'fill-brand-100/80', 'fill-white'],
  /** บนพื้นสีแบรนด์ (กล่องปิดท้าย) — ใช้เฉดสีแบรนด์ ไม่ใช้ขาวโปร่ง ซ้อนกันแล้วสีหม่นเป็นเทา */
  onBrand: ['fill-brand-400/35', 'fill-brand-300/30', 'fill-brand-200/25'],
} as const

/** eco — คลื่นน้ำ 3 ชั้นเคลื่อนคนละความเร็ว วางชิดขอบล่างของกล่อง */
export function EcoWaves({ className = '', tone = 'light' }: { className?: string; tone?: keyof typeof WAVE_TONES }) {
  const [back, middle, front] = WAVE_TONES[tone]
  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 2880 160"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 h-full w-[200%] motion-safe:animate-[wave_26s_linear_infinite]"
      >
        <path d={WAVE_PATH} className={back} />
      </svg>
      <svg
        viewBox="0 0 2880 160"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 h-[78%] w-[200%] motion-safe:animate-[wave_17s_linear_infinite_reverse]"
      >
        <path d={WAVE_PATH} className={middle} />
      </svg>
      <svg
        viewBox="0 0 2880 160"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 h-[52%] w-[200%] motion-safe:animate-[wave_21s_linear_infinite]"
      >
        <path d={WAVE_PATH} className={front} />
      </svg>
    </div>
  )
}

/** clinical — ลายกากบาทการแพทย์สีแบรนด์ ค่อย ๆ จางออกจากกลางกล่อง */
export function CrossPattern({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none [mask-image:radial-gradient(ellipse_at_center,#000_15%,transparent_72%)] ${className}`}
    >
      <div className="cross-pattern absolute inset-0" />
    </div>
  )
}

/** จังหวะคลื่นหัวใจ 2 ครั้งในกว้าง 600 หน่วย (เส้นราบ → P → QRS → T) */
const ECG_PATH =
  'M0 50 H96 L108 44 L120 50 H140 L150 10 L163 90 L176 50 H198 Q213 32 228 50 H300 ' +
  'H396 L408 44 L420 50 H440 L450 10 L463 90 L476 50 H498 Q513 32 528 50 H600'

/**
 * clinical — เส้นคลื่นหัวใจ: เส้นจาง ๆ เต็มเส้น + ช่วงสว่างที่วิ่งไปตามเส้นตลอด (.ecg-trace ใน globals.css)
 * ไม่มีอนิเมชันก็ยังเห็นเส้นจางกับช่วงสว่างนิ่ง ๆ
 */
export function EcgLine({ className = '', trace = 'stroke-brand-500', base = 'stroke-brand-200' }: {
  className?: string
  trace?: string
  base?: string
}) {
  return (
    <svg aria-hidden viewBox="0 0 600 100" preserveAspectRatio="none" className={`pointer-events-none ${className}`}>
      <path
        d={ECG_PATH}
        pathLength={1000}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeWidth={1.5}
        className={base}
      />
      <path
        d={ECG_PATH}
        pathLength={1000}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`ecg-trace ${trace} drop-shadow-[0_0_6px_var(--color-brand-400)] motion-safe:animate-[ecg_3.2s_linear_infinite]`}
      />
    </svg>
  )
}
