import { ShieldAlert, ShieldCheck, ShieldEllipsis, ShieldX } from 'lucide-react'
import { WARRANTY_ALERT_DAYS, warrantyState } from '@/lib/display'
import { isoToThai, todayIso } from '@/lib/thai-date'

/**
 * บรรทัดวันรับประกันของโครงการ + สถานะ ณ วันนี้ — ใช้ทั้งหน้าลูกค้าและหลังบ้าน (สีสถานะเท่านั้น ไม่ผูกกับ UI kit ฝั่งใด)
 * วันที่มาจากระบบงาน (projects ของ tjc-api) ผ่าน /api/lookup/projects หรือค่าที่เก็บไว้กับเคส
 */
export function WarrantyNote({ start, end }: { start: string; end: string }) {
  const state = warrantyState(start, end, todayIso())
  const look =
    state.kind === 'expired'
      ? { icon: ShieldX, tone: 'text-rose-700' }
      : state.kind === 'not_started'
        ? { icon: ShieldEllipsis, tone: 'text-navy-500' }
        : state.days <= WARRANTY_ALERT_DAYS
          ? { icon: ShieldAlert, tone: 'text-amber-700' }
          : { icon: ShieldCheck, tone: 'text-emerald-700' }
  const Icon = look.icon

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs ${look.tone}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="tabular">
        รับประกัน {isoToThai(start)} – {isoToThai(end)}
      </span>
      <span className="font-semibold">· {state.label}</span>
    </span>
  )
}
