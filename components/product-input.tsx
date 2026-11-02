'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Package } from 'lucide-react'
import { Input } from '@/components/ui'

/** ผลิตภัณฑ์ที่เปิดใช้งาน (จาก /api/products) — ใช้เป็นรายการแนะนำตอนลูกค้าพิมพ์ชื่อ/ยี่ห้อ/รุ่น */
export type ProductOption = {
  id: number
  name: string
  brand: string | null
  model: string | null
}

/**
 * ช่องพิมพ์ข้อมูลสินค้าแบบอิสระ พร้อมรายการแนะนำจากผลิตภัณฑ์ที่เปิดใช้งาน — ใช้ซ้ำทั้งช่อง ชื่อ/ยี่ห้อ/รุ่น
 * ไม่บังคับให้เลือกจากรายการ พิมพ์อะไรมาก็บันทึกตามนั้น (API จับคู่กับผลิตภัณฑ์ที่มีอยู่ให้เองถ้าตรงกันทุกช่อง)
 * รายการแนะนำ (suggestions) มาจาก parent เพราะ parent รวมเงื่อนไขจากทั้ง 3 ช่องเข้าด้วยกัน
 */
export function ProductInput({
  value,
  onChange,
  suggestions,
  onSelect,
  placeholder,
  maxLength,
  required,
}: {
  value: string
  onChange: (value: string) => void
  suggestions: ProductOption[]
  onSelect: (product: ProductOption) => void
  placeholder: string
  maxLength: number
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  // -1 = ยังไม่ได้ไฮไลต์อะไร — Enter จึงส่งฟอร์มตามปกติ ไม่เผลอแทนข้อความที่พิมพ์ด้วยรายการแรก
  const [highlighted, setHighlighted] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showList = open && suggestions.length > 0

  function select(product: ProductOption) {
    onSelect(product)
    setOpen(false)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!showList) {
      if (event.key === 'ArrowDown' && suggestions.length > 0) {
        event.preventDefault()
        setOpen(true)
      }
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && suggestions[highlighted]) {
      event.preventDefault()
      select(suggestions[highlighted])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <Package className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-navy-300" />
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHighlighted(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`pl-10 ${suggestions.length > 0 ? 'pr-9' : ''}`}
        maxLength={maxLength}
        required={required}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-navy-300" />
      )}

      {showList && (
        <div className="absolute z-20 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-navy-100 bg-white py-1.5 shadow-soft-lg">
          {suggestions.map((product, index) => (
            <button
              key={product.id}
              type="button"
              onClick={() => select(product)}
              onMouseEnter={() => setHighlighted(index)}
              className={`block w-full px-3.5 py-2.5 text-left text-sm transition ${
                index === highlighted ? 'bg-brand-50 text-brand-700' : 'text-navy-700'
              }`}
            >
              {[product.name, product.brand, product.model].filter(Boolean).join(' · ')}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
