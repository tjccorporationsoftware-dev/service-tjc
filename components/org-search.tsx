'use client'

import { useEffect, useRef, useState } from 'react'
import { Building2, Loader2, PencilLine, Search } from 'lucide-react'
import { InputWithIcon } from '@/components/ui'

/** หน่วยงานจาก /api/lookup/customers (ข้อมูลหน้างานของระบบงาน) */
export type OrgOption = {
  id: number
  name: string
  affiliation: string | null
  province: string | null
  project_count: number
}

type Found = { term: string; customers: OrgOption[]; error: string }

/** หน่วงหลังพิมพ์ตัวสุดท้ายก่อนยิงค้นหา — พิมพ์ต่อเนื่องจะยิงครั้งเดียว */
const DEBOUNCE_MS = 300

/**
 * ช่องค้นหาหน่วยงานของลูกค้า — พิมพ์อย่างน้อย 2 ตัวแล้วเลือกจากรายการ
 * ไม่พบหรือค้นไม่ได้ (ระบบงานล่ม) ยังกด "ใช้ชื่อที่พิมพ์" ได้เสมอ ลูกค้าจึงไม่มีทางติดอยู่ที่ขั้นนี้
 */
export function OrgSearch({
  onSelect,
  onManual,
}: {
  onSelect: (org: OrgOption) => void
  onManual: (name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Found | null>(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const term = query.trim()

  useEffect(() => {
    if (term.length < 2) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lookup/customers?q=${encodeURIComponent(term)}`)
        const data = await res.json()
        if (cancelled) return
        setFound({
          term,
          customers: res.ok ? data.customers : [],
          error: res.ok ? '' : (data.error ?? 'ค้นหาหน่วยงานไม่สำเร็จ'),
        })
      } catch {
        if (!cancelled) setFound({ term, customers: [], error: 'ค้นหาหน่วยงานไม่สำเร็จ — พิมพ์ชื่อหน่วยงานเองได้เลย' })
      }
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [term])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ผลค้นของคำค้นเก่าไม่นับ — ระหว่างรอผลของคำล่าสุดถือว่ากำลังค้นหา
  const current = found?.term === term ? found : null
  const searching = term.length >= 2 && !current

  return (
    <div className="relative" ref={containerRef}>
      <InputWithIcon
        icon={Search}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="พิมพ์ชื่อหน่วยงาน เช่น ชื่อโรงเรียน โรงพยาบาล หรือ อบต."
        maxLength={100}
        autoComplete="off"
      />

      {open && term.length >= 2 && (
        <div className="absolute z-20 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-navy-100 bg-white py-1.5 shadow-soft-lg">
          {searching && (
            <p className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-navy-400">
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังค้นหา…
            </p>
          )}

          {current?.customers.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => {
                setOpen(false)
                onSelect(org)
              }}
              className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-sm transition hover:bg-brand-50"
            >
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
              <span className="min-w-0">
                <span className="block font-medium wrap-anywhere text-navy-900">{org.name}</span>
                <span className="block text-xs text-navy-400">
                  {[org.affiliation, org.province, `${org.project_count} โครงการ`].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          ))}

          {current && current.customers.length === 0 && (
            <p className={`px-3.5 py-2.5 text-sm ${current.error ? 'text-amber-700' : 'text-navy-400'}`}>
              {current.error || `ไม่พบหน่วยงานที่ชื่อมีคำว่า “${term}”`}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onManual(term)
            }}
            className="mt-1 flex w-full items-center gap-2.5 border-t border-navy-100 px-3.5 pt-3 pb-2 text-left text-sm text-brand-700 transition hover:bg-brand-50"
          >
            <PencilLine className="h-4 w-4 shrink-0" />
            <span className="min-w-0 wrap-anywhere">ไม่พบหน่วยงานของท่าน? ใช้ชื่อ “{term}” ตามที่พิมพ์</span>
          </button>
        </div>
      )}
    </div>
  )
}
