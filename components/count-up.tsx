'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * ตัวเลขที่นับขึ้นจาก 0 ครั้งแรกที่เลื่อนมาเห็น (ใช้ในหน้าแรก)
 *
 * render ค่าจริงไว้ตั้งแต่แรกเสมอ — ไม่มี JS, ยังไม่ hydrate หรือเครื่องตั้งลดการเคลื่อนไหว ก็เห็นเลขที่ถูกต้อง
 * ไม่ผูกกับตำแหน่ง scroll (scroll-driven) เพราะถ้าผู้ใช้หยุดเลื่อนกลางทาง ตัวเลขจะค้างค่าผิดให้เห็น
 */
export function CountUp({
  value,
  duration = 1600,
  className = '',
}: {
  value: number
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1)
          // ease-out — เร่งตอนต้น ค่อย ๆ ช้าลงจนหยุดที่ค่าจริง
          setDisplay(Math.round((1 - (1 - progress) ** 3) * value))
          if (progress < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.6 }
    )
    observer.observe(element)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, duration])

  return (
    <span ref={ref} className={`tabular ${className}`}>
      {display}
    </span>
  )
}
