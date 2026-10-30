'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { DESIGN } from '@/lib/design'
import { SITE } from '@/lib/site-content'

/**
 * หน้าต่างแจ้งเตือนกลางจอเมื่อกดส่งแล้วไม่สำเร็จ — ปุ่มส่งอยู่ท้ายฟอร์ม ส่วน Alert อยู่บนสุด
 * ลูกค้าที่ไม่ได้เลื่อนขึ้นไปดูจะนึกว่ากดแล้วไม่เกิดอะไรขึ้น (Alert เดิมยังคงไว้ให้ดูซ้ำหลังปิดหน้าต่าง)
 *
 * ใช้ <dialog> ของเบราว์เซอร์: อยู่กลางจอ บังหน้าข้างหลัง กัน focus ไว้ในหน้าต่าง และกด Esc ปิดได้เอง
 * message ว่าง = ปิด · ผู้ใช้ปิดเอง (ปุ่ม / Esc / คลิกพื้นหลัง) แล้วเรียก onClose ให้ล้าง message
 */
export function ErrorDialog({
  message,
  title,
  onClose,
}: {
  message: string
  title: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (message && !dialog.open) dialog.showModal()
    else if (!message && dialog.open) dialog.close()
  }, [message])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // คลิกพื้นหลังรอบหน้าต่าง = ปิด (ตัวกล่องไม่มี padding คลิกในกล่องจึงโดนลูกเสมอ)
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close()
      }}
      aria-labelledby="error-dialog-title"
      aria-describedby="error-dialog-message"
      // preflight ของ Tailwind ล้าง margin ทุก element — ต้องใส่ m-auto เอง ไม่งั้นหน้าต่างไปชิดมุมซ้ายบน
      className={`m-auto w-[min(26rem,calc(100%-2rem))] bg-white p-0 shadow-soft-lg backdrop:bg-navy-900/55 backdrop:backdrop-blur-sm open:motion-safe:animate-dialog-in ${DESIGN[SITE.design].card}`}
    >
      <div className="px-6 pt-7 pb-6 text-center sm:px-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/60">
          <AlertTriangle className="h-7 w-7" strokeWidth={2} />
        </span>
        <h2 id="error-dialog-title" className="mt-5 text-lg font-bold text-navy-900">
          {title}
        </h2>
        <p id="error-dialog-message" className="mt-2 leading-relaxed wrap-anywhere text-navy-600">
          {message}
        </p>
        {/* method="dialog" = กดแล้วปิดหน้าต่างเอง ไม่ส่งฟอร์มไปไหน */}
        <form method="dialog" className="mt-6">
          <Button type="submit" size="lg" className="w-full" autoFocus>
            ตกลง
          </Button>
        </form>
      </div>
    </dialog>
  )
}
