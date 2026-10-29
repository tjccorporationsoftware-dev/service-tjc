/**
 * หน้าตาฝั่งลูกค้าแยกตามบริษัท — แต่ละ repo เลือกใช้ผ่าน `SITE.design` ใน lib/site-content.ts
 * โค้ดทุก design อยู่ครบทุก repo (sync ข้าม repo ได้ตรง ๆ) ต่างกันแค่ค่าที่เลือก
 *
 *   tech     — โทนเข้มแบบศูนย์ควบคุมไอที: กระจกเข้ม ตาราง วงโคจร การ์ด 3 มิติ (TJC)
 *   eco      — สว่าง โปร่ง ธรรมชาติ: แสงอาทิตย์ คลื่นน้ำ ปุ่มทรงแคปซูล มุมโค้งมาก (TANGJAI)
 *   clinical — ขาวสะอาดแบบโรงพยาบาล: ลายกากบาท เส้นคลื่นหัวใจ เส้นตรง มุมโค้งน้อย (ART)
 */
export type SiteDesign = 'tech' | 'eco' | 'clinical'

/**
 * ชิ้นส่วนหน้าตาของส่วนที่ทุกบริษัทใช้โครงเดียวกัน (การ์ดทางลัด ตัวเลข ประเภทสินค้า ขั้นตอน จุดเด่น)
 * class เขียนเต็มเป็นสตริงตายตัว — Tailwind สแกนเจอได้ ห้ามประกอบชื่อ class จากตัวแปร
 */
export const DESIGN = {
  tech: {
    card: 'rounded-3xl',
    tile: 'rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-soft-lg',
    softTile: 'rounded-2xl',
    stepIcon: 'rounded-full bg-linear-to-br from-brand-500 to-brand-800',
    eyebrow: 'rounded-full bg-brand-50 ring-1 ring-brand-100',
    brandPanel: 'rounded-3xl bg-linear-to-br from-brand-600 via-brand-700 to-brand-900',
  },
  eco: {
    card: 'rounded-[2rem]',
    tile: 'rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-white shadow-soft-lg',
    softTile: 'rounded-full',
    stepIcon: 'rounded-full bg-linear-to-br from-brand-400 to-brand-700',
    eyebrow: 'rounded-full bg-white ring-1 ring-brand-200 shadow-soft',
    brandPanel: 'rounded-[2rem] bg-linear-to-br from-brand-500 via-brand-600 to-brand-700',
  },
  clinical: {
    card: 'rounded-xl',
    tile: 'rounded-lg bg-brand-600 text-white shadow-soft',
    softTile: 'rounded-lg',
    stepIcon: 'rounded-xl bg-brand-600',
    eyebrow: 'rounded-md border-l-4 border-brand-500 bg-brand-50',
    brandPanel: 'rounded-xl bg-brand-700',
  },
} satisfies Record<
  SiteDesign,
  { card: string; tile: string; softTile: string; stepIcon: string; eyebrow: string; brandPanel: string }
>
