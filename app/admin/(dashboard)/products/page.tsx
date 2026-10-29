'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Factory, Link2, Package, Pencil, Sparkles, Store, Upload, X } from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  TableEmpty,
  TableLoading,
  Td,
  Textarea,
  Th,
  formatDate,
} from '@/components/admin/ui'
import { SITE } from '@/lib/site-content'
import { useApiList } from '@/lib/use-api-list'

/** ที่มาของสินค้า — ตัดสินว่าใครเป็นคนออกรหัส SN (ดู db/schema.sql) */
type SourceType = 'in_house' | 'resale'

const SOURCE_TYPES: {
  value: SourceType
  label: string
  hint: string
  icon: typeof Factory
}[] = [
  {
    value: 'in_house',
    label: 'ผลิตเอง',
    hint: 'เราออกรหัส SN เองที่หน้า "ตั้งค่ารหัส SN" แล้วค่อยผูกกับผลิตภัณฑ์ทีหลัง',
    icon: Factory,
  },
  {
    value: 'resale',
    label: 'ซื้อมาขายต่อ',
    hint: 'มี SN ติดมากับตัวสินค้าจากโรงงานเดิม วางเข้าระบบได้เลยตอนเพิ่มผลิตภัณฑ์',
    icon: Store,
  },
]

/** เพดานเดียวกับ snAssignProductSchema ใน lib/validations.ts */
const SN_ASSIGN_LIMIT = 500

const SOURCE_LABEL: Record<SourceType, string> = {
  in_house: 'ผลิตเอง',
  resale: 'ซื้อมาขายต่อ',
}

type Product = {
  id: number
  name: string
  code: string | null
  brand: string | null
  model: string | null
  source_type: SourceType
  added_by: 'admin' | 'customer'
  is_active: number
  created_at: string
  serial_count: number
}

type ListResponse = { products: Product[] }

const EMPTY_FORM = {
  name: '',
  code: '',
  brand: '',
  model: '',
  // ตั้งต้นเป็นค่าว่าง = ยังไม่เลือก ฟอร์มที่เหลือจะยังไม่แสดงจนกว่าจะเลือกประเภทก่อน
  source_type: '' as SourceType | '',
  is_active: true,
}

export default function ProductsPage() {
  const { data, loading, error: listError, reload } = useApiList<ListResponse>('/api/admin/products')
  const products = data?.products ?? []

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  // Serial Number ของสินค้านอกที่มี SN ติดมาแล้ว — กรอกได้เลยตอนเพิ่มผลิตภัณฑ์ใหม่
  // (ไม่ต้องกรอกก็ได้ ถ้าเป็นผลิตภัณฑ์ที่เราผลิตเอง แล้วค่อยไปผูก SN ทีหลัง)
  const [createSnText, setCreateSnText] = useState('')
  const [createSnCategory, setCreateSnCategory] = useState('')

  // ผลิตเอง: เลือก SN ที่สร้างไว้แล้วจากหน้า Serial Number แต่ยังไม่ได้ผูกผลิตภัณฑ์ มาเชื่อมกับผลิตภัณฑ์นี้
  // snPickerKey บวกหลังบันทึกเพื่อ remount ตัวเลือก ให้ดึงรายการ SN ที่ว่างอยู่ใหม่
  const [linkSnIds, setLinkSnIds] = useState<Set<number>>(new Set())
  const [snPickerKey, setSnPickerKey] = useState(0)

  const [addSnProduct, setAddSnProduct] = useState<Product | null>(null)
  const [addSnText, setAddSnText] = useState('')
  const [addSnCategory, setAddSnCategory] = useState('')
  const [addingSn, setAddingSn] = useState(false)
  const [addSnResult, setAddSnResult] = useState<{
    imported: number
    skipped: number
    batch_id: string
  } | null>(null)

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setCreateSnText('')
    setCreateSnCategory('')
    setLinkSnIds(new Set())
    setError('')
    setSuccess('')
  }

  function startEdit(product: Product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      code: product.code ?? '',
      brand: product.brand ?? '',
      model: product.model ?? '',
      source_type: product.source_type ?? 'in_house',
      is_active: product.is_active === 1,
    })
    setCreateSnText('')
    setCreateSnCategory('')
    setLinkSnIds(new Set())
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')

    // กันไว้อีกชั้น — ปุ่มบันทึกอยู่ในส่วนที่ซ่อนอยู่แล้วถ้ายังไม่เลือกประเภท
    if (form.source_type === '') {
      setError('กรุณาเลือกประเภทผลิตภัณฑ์ก่อน')
      return
    }

    // สินค้าซื้อมาขายต่อที่กรอก SN มาด้วยตอนเพิ่มใหม่ — เช็คหมวดหมู่ให้ครบก่อนยิง API
    // ผลิตเองไม่ส่ง SN ไม่ว่าช่องจะมีข้อความค้างอยู่หรือไม่ (เผื่อสลับประเภททีหลัง)
    const isCreating = !editingId
    const newProductSns =
      isCreating && form.source_type === 'resale' ? parseManualSns(createSnText) : []
    if (isCreating && newProductSns.length > 0 && !createSnCategory.trim()) {
      setError('กรอก Serial Number แล้ว กรุณากรอกหมวดหมู่ด้วย')
      return
    }

    // SN ที่เลือกไว้จะถูกผูกหลังบันทึกผลิตภัณฑ์เสร็จ — ผลิตเองเท่านั้น (เผื่อสลับประเภทหลังเลือกไปแล้ว)
    const snIdsToLink = form.source_type === 'in_house' ? [...linkSnIds] : []
    // /api/admin/sn/assign-product รับเฉพาะผลิตภัณฑ์ที่เปิดใช้งาน — บอกให้รู้ตั้งแต่ก่อนยิง
    if (snIdsToLink.length > 0 && !form.is_active) {
      setError('ผลิตภัณฑ์ที่ปิดใช้งานอยู่เชื่อม Serial Number ไม่ได้ — เปิดใช้งานก่อนแล้วลองใหม่')
      return
    }
    // เพดานเดียวกับ snAssignProductSchema — กันไว้ก่อนบันทึก จะได้ไม่เสียเที่ยวหลังผลิตภัณฑ์ถูกสร้างไปแล้ว
    if (snIdsToLink.length > SN_ASSIGN_LIMIT) {
      setError(`เชื่อม Serial Number ได้สูงสุด ${SN_ASSIGN_LIMIT} ตัวต่อครั้ง — เลือกไว้ ${snIdsToLink.length} ตัว`)
      return
    }

    setSaving(true)
    try {
      const res = await fetch(
        editingId ? `/api/admin/products/${editingId}` : '/api/admin/products',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'บันทึกไม่สำเร็จ')
        return
      }

      let message = editingId
        ? 'แก้ไขผลิตภัณฑ์เรียบร้อย'
        : `เพิ่มผลิตภัณฑ์ "${form.name}" เรียบร้อย`

      // ผูก SN ที่กรอกมาพร้อมกันตอนเพิ่มผลิตภัณฑ์ใหม่ — ไม่ต้องไปกด "เพิ่ม SN" แยกทีหลัง
      if (isCreating && newProductSns.length > 0) {
        const snRes = await fetch('/api/admin/sn/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: body.product.id,
            sns: newProductSns,
            category: createSnCategory,
          }),
        })
        const snBody = await snRes.json()
        if (!snRes.ok) {
          message += ` แต่เพิ่ม Serial Number ไม่สำเร็จ: ${snBody.error ?? 'ไม่ทราบสาเหตุ'} — ลองกด "เพิ่ม SN" ที่แถวผลิตภัณฑ์นี้อีกครั้ง`
        } else {
          message += ` พร้อม Serial Number ${snBody.imported.toLocaleString('th-TH')} ตัว${
            snBody.skipped > 0 ? ` (ข้าม ${snBody.skipped.toLocaleString('th-TH')} ตัวที่ซ้ำ)` : ''
          }`
        }
      }

      // ผลิตเอง: ผูก SN ที่เลือกจากรายการ SN ว่าง — ทำได้ทั้งตอนเพิ่มใหม่และตอนแก้ไข
      if (snIdsToLink.length > 0) {
        const assignRes = await fetch('/api/admin/sn/assign-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: editingId ?? body.product.id,
            serial_number_ids: snIdsToLink,
          }),
        })
        const assignBody = await assignRes.json()
        if (!assignRes.ok) {
          message += ` แต่เชื่อม Serial Number ไม่สำเร็จ: ${assignBody.error ?? 'ไม่ทราบสาเหตุ'}`
        } else {
          message += ` พร้อมเชื่อม Serial Number ${Number(assignBody.assigned).toLocaleString('th-TH')} ตัว${
            assignBody.skipped > 0
              ? ` (ข้าม ${Number(assignBody.skipped).toLocaleString('th-TH')} ตัวที่ถูกผูกไปก่อนแล้ว)`
              : ''
          }`
        }
      }

      setSuccess(message)
      setEditingId(null)
      setForm(EMPTY_FORM)
      setCreateSnText('')
      setCreateSnCategory('')
      setLinkSnIds(new Set())
      setSnPickerKey((k) => k + 1)
      reload()
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(product: Product) {
    setError('')
    setSuccess('')
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: product.name,
        code: product.code ?? '',
        brand: product.brand ?? '',
        model: product.model ?? '',
        // ไม่ส่ง = schema ตั้งเป็น in_house ให้ — สินค้าซื้อมาขายต่อจะกลายเป็นผลิตเองแค่เพราะกดสลับสถานะ
        source_type: product.source_type,
        is_active: product.is_active !== 1,
      }),
    })
    const body = await res.json()
    if (!res.ok) {
      setError(body.error ?? 'เปลี่ยนสถานะไม่สำเร็จ')
      return
    }
    reload()
  }

  // แยก SN ที่วาง/พิมพ์เข้ามาด้วยขึ้นบรรทัดใหม่หรือจุลภาค แล้วตัดตัวซ้ำในชุดเดียวกันออก
  function parseManualSns(text: string): string[] {
    return [...new Set(text.split(/[\n,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))]
  }

  const addSnCount = parseManualSns(addSnText).length

  function openAddSnModal(product: Product) {
    setAddSnProduct(product)
    setAddSnText('')
    setAddSnCategory('')
    setAddSnResult(null)
    setError('')
    setSuccess('')
  }

  async function confirmAddSn() {
    if (!addSnProduct) return
    const sns = parseManualSns(addSnText)
    if (sns.length === 0) {
      setError('กรุณากรอก Serial Number อย่างน้อย 1 รายการ')
      return
    }
    if (!addSnCategory.trim()) {
      setError('กรุณากรอกหมวดหมู่')
      return
    }
    setError('')
    setAddingSn(true)
    try {
      const res = await fetch('/api/admin/sn/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: addSnProduct.id, sns, category: addSnCategory }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'เพิ่ม SN ไม่สำเร็จ')
        return
      }
      setAddSnResult(body)
      setAddSnText('')
      reload()
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setAddingSn(false)
    }
  }

  const lockedCode =
    editingId !== null && (products.find((p) => p.id === editingId)?.serial_count ?? 0) > 0

  // เลือกประเภทแล้วถึงจะโชว์ช่องกรอกที่เหลือ (ตอนแก้ไขมีค่าอยู่แล้ว จึงโชว์ทันที)
  const formReady = form.source_type !== ''

  // วาง SN ตอนสร้างได้เฉพาะสินค้าซื้อมาขายต่อ — ผลิตเองต้องออกรหัสจากหน้า Serial Number
  const canPasteSn = !editingId && form.source_type === 'resale'

  // ผลิตเองเลือก SN ที่ออกรหัสไว้แล้วมาเชื่อมได้ ทั้งตอนเพิ่มใหม่และตอนแก้ไข
  const canLinkSn = form.source_type === 'in_house'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">จัดการผลิตภัณฑ์</h1>
        <p className="mt-0.5 text-sm text-navy-400">
          เพิ่มและจัดการข้อมูลผลิตภัณฑ์ รหัสสินค้า และสถานะการใช้งาน —
          แยกประเภทได้ว่าเป็นสินค้าที่ผลิตเองหรือซื้อมาขายต่อ
        </p>
      </div>

      {(error || listError) && <Alert tone="error">{error || listError}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <Card>
        <CardHeader
          title={editingId ? `แก้ไขผลิตภัณฑ์ #${editingId}` : 'เพิ่มข้อมูลผลิตภัณฑ์'}
          action={
            editingId && (
              <Button variant="ghost" onClick={startCreate} disabled={saving}>
                <X className="h-4 w-4" />
                ยกเลิกการแก้ไข
              </Button>
            )
          }
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* เลือกที่มาของสินค้าก่อนเป็นอย่างแรก เพราะเป็นตัวกำหนดว่าจะมีช่องกรอก SN ให้หรือไม่ */}
          <Field
            label="ประเภทผลิตภัณฑ์"
            required
            hint="เลือกว่าเป็นสินค้าที่เราผลิตเอง หรือซื้อมาจากที่อื่นแล้วขายต่อ — มีผลกับวิธีได้มาซึ่งรหัส Serial Number"
          >
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SOURCE_TYPES.map(({ value, label, hint, icon: Icon }) => {
                const active = form.source_type === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, source_type: value })
                      // สลับประเภทแล้วช่อง SN ของอีกฝั่งจะหายไป ล้างที่ค้างไว้กันสับสน
                      if (value === 'in_house') {
                        setCreateSnText('')
                        setCreateSnCategory('')
                      } else {
                        setLinkSnIds(new Set())
                      }
                    }}
                    aria-pressed={active}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                      active
                        ? 'border-brand-500 bg-brand-50/70 ring-1 ring-brand-300'
                        : 'border-navy-100 bg-white hover:border-brand-200 hover:bg-brand-50/30'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        active ? 'bg-brand-600 text-white' : 'bg-navy-50 text-navy-400'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-semibold ${
                          active ? 'text-brand-800' : 'text-navy-700'
                        }`}
                      >
                        {label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-navy-400">
                        {hint}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Field>

          {/* ยังไม่เลือกประเภท = ยังไม่ต้องโชว์ช่องกรอก ให้ตัดสินใจทีละขั้น */}
          {!formReady && (
            <p className="rounded-xl border border-dashed border-navy-200 bg-navy-50/40 px-4 py-7 text-center text-sm text-navy-400">
              เลือกประเภทผลิตภัณฑ์ด้านบนก่อน แล้วช่องกรอกข้อมูลจะแสดงขึ้นมา
            </p>
          )}

          {formReady && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ชื่อผลิตภัณฑ์" required>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={`เช่น ${SITE.examples.productName}`}
                    maxLength={255}
                    required
                  />
                </Field>

                <Field label="ยี่ห้อ">
                  <Input
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    placeholder={`ไม่บังคับ เช่น ${SITE.examples.brand}`}
                    maxLength={100}
                  />
                </Field>

                <Field
                  label="รหัสผลิตภัณฑ์"
                  hint={
                    lockedCode
                      ? 'แก้ไม่ได้ เพราะมี Serial Number ผูกกับผลิตภัณฑ์นี้อยู่แล้ว'
                      : 'ไม่บังคับ — ถ้ากรอก ต้องเป็น A–Z และ 0–9 ยาว 2–10 ตัว ใช้เป็นรหัสอ้างอิงผลิตภัณฑ์ (ไม่เกี่ยวกับรหัส Serial Number)'
                  }
                >
                  <Input
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })
                    }
                    placeholder={`ไม่บังคับ เช่น ${SITE.examples.productCode}`}
                    className="font-mono"
                    maxLength={10}
                    disabled={lockedCode}
                  />
                </Field>

                <Field label="รุ่น">
                  <Input
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder={`ไม่บังคับ เช่น ${SITE.examples.model}`}
                    maxLength={100}
                  />
                </Field>

                {/* ผลิตเองไม่ต้องกรอก SN ตรงนี้ — ไปสร้างรหัสเองที่หน้า Serial Number แล้วค่อยผูกทีหลัง */}
                {canPasteSn && (
                  <Field
                    label="Serial Number (ถ้ามี)"
                    hint={`SN ที่ติดมากับตัวสินค้าจากโรงงานเดิม จะผูกกับผลิตภัณฑ์นี้ทันที (วางได้หลายบรรทัด)${
                      createSnText ? ` — ตรวจพบ ${parseManualSns(createSnText).length.toLocaleString('th-TH')} รายการ` : ''
                    }`}
                  >
                    <Textarea
                      value={createSnText}
                      onChange={(e) => setCreateSnText(e.target.value)}
                      placeholder={`เช่น ${SITE.examples.serial}`}
                      rows={1}
                      className="resize-y font-mono"
                    />
                  </Field>
                )}

                {canPasteSn && createSnText.trim() && (
                  <Field label="หมวดหมู่ (SN)" required hint={`เช่น ${SITE.examples.snCategory}`}>
                    <Input
                      value={createSnCategory}
                      onChange={(e) => setCreateSnCategory(e.target.value)}
                      placeholder="กรอกหมวดหมู่"
                      maxLength={100}
                    />
                  </Field>
                )}
              </div>

              {/* ผลิตเองออกรหัส SN ไว้ก่อนโดยยังไม่มีเจ้าของ — ตรงนี้คือจุดที่จับคู่เข้ากับผลิตภัณฑ์ */}
              {canLinkSn && (
                <SnLinkField
                  key={snPickerKey}
                  selected={linkSnIds}
                  onChange={setLinkSnIds}
                  disabled={saving}
                />
              )}

              {editingId && (
                <label className="flex items-center gap-2 text-sm text-navy-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-navy-300 text-brand-600 focus:ring-brand-300"
                  />
                  เปิดใช้งาน (ลูกค้าเลือกได้ในหน้าลงทะเบียน)
                </label>
              )}

              <Button type="submit" disabled={saving}>
                <Sparkles className="h-4 w-4" />
                {saving ? 'กำลังบันทึก…' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มผลิตภัณฑ์'}
              </Button>
            </>
          )}
        </form>
      </Card>

      <Card>
        <CardHeader title={`ผลิตภัณฑ์ทั้งหมด (${products.length})`} />

        <div className="scrollbar-thin -mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-navy-100">
                <Th>ชื่อ</Th>
                <Th>ประเภท</Th>
                <Th>รหัส</Th>
                <Th>ยี่ห้อ</Th>
                <Th>รุ่น</Th>
                <Th>SN ที่สร้างแล้ว</Th>
                <Th>สถานะ</Th>
                <Th>จัดการ</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {loading && <TableLoading colSpan={8} />}
              {!loading && products.length === 0 && (
                <TableEmpty colSpan={8}>
                  <Package className="mx-auto mb-2 h-8 w-8 text-navy-200" strokeWidth={1.5} />
                  ยังไม่มีผลิตภัณฑ์
                </TableEmpty>
              )}
              {!loading &&
                products.map((product) => (
                  <tr key={product.id} className="transition hover:bg-brand-50/40">
                    <Td>
                      <div className="font-medium text-navy-900">{product.name}</div>
                      <div className="text-xs text-navy-300">เพิ่มเมื่อ {formatDate(product.created_at)}</div>
                    </Td>
                    <Td>
                      {/* ลูกค้าพิมพ์เพิ่มเองตอนลงทะเบียน ไม่มีใครเลือกประเภทให้ — โชว์ที่มาแทนค่าเริ่มต้นที่ไม่มีความหมาย */}
                      {product.added_by === 'customer' ? (
                        <Badge tone="slate">ลูกค้าเพิ่มเอง</Badge>
                      ) : (
                        <Badge tone={product.source_type === 'resale' ? 'amber' : 'brand'}>
                          {SOURCE_LABEL[product.source_type] ?? SOURCE_LABEL.in_house}
                        </Badge>
                      )}
                    </Td>
                    <Td className="font-mono">{product.code || <span className="text-navy-300">—</span>}</Td>
                    <Td className="text-navy-500">{product.brand || '—'}</Td>
                    <Td className="text-navy-500">{product.model || '—'}</Td>
                    <Td className="tabular">{Number(product.serial_count).toLocaleString('th-TH')}</Td>
                    <Td>
                      {product.is_active === 1 ? (
                        <Badge tone="green">เปิดใช้งาน</Badge>
                      ) : (
                        <Badge tone="slate">ปิดใช้งาน</Badge>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => startEdit(product)}
                          className="inline-flex items-center gap-1 font-medium text-brand-600 transition hover:text-brand-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          แก้ไข
                        </button>
                        {/* ผลิตเองไม่ต้องวาง SN จากภายนอก — ไปสร้างรหัสเองที่หน้า Serial Number */}
                        {product.source_type === 'resale' && (
                          <button
                            onClick={() => openAddSnModal(product)}
                            className="inline-flex items-center gap-1 font-medium text-brand-600 transition hover:text-brand-700"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            เพิ่ม SN
                          </button>
                        )}
                        <button
                          onClick={() => toggleActive(product)}
                          className="font-medium text-navy-400 transition hover:text-navy-700"
                        >
                          {product.is_active === 1 ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-navy-400">
          ผลิตภัณฑ์ที่มี SN ผูกอยู่แล้วจะลบไม่ได้ — ใช้ &ldquo;ปิดใช้งาน&rdquo; แทน
          เพื่อซ่อนจากหน้าลงทะเบียนของลูกค้าโดยไม่กระทบข้อมูลเดิม
        </p>
        <p className="mt-1 text-xs text-navy-400">
          ผลิตภัณฑ์ &ldquo;ลูกค้าเพิ่มเอง&rdquo; ถูกสร้างอัตโนมัติตอนลูกค้าพิมพ์ชื่อสินค้าที่ไม่ตรงกับรายการ
          และปิดใช้งานไว้ก่อน — กด &ldquo;เปิดใช้งาน&rdquo; ถ้าต้องการให้ลูกค้าคนอื่นเห็นเป็นตัวเลือกด้วย
        </p>
      </Card>

      {addSnProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4"
          onClick={() => !addingSn && setAddSnProduct(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-navy-900">เพิ่ม SN ให้ &ldquo;{addSnProduct.name}&rdquo;</h3>
            <p className="mt-1 text-sm text-navy-500">
              สำหรับสินค้าที่ซื้อมาขายต่อ ซึ่งมี Serial Number ติดมากับตัวสินค้าจากโรงงานเดิมอยู่แล้ว —
              กรอกหรือวางได้ทีละหลายรายการ
            </p>

            {error && (
              <div className="mt-3">
                <Alert tone="error">{error}</Alert>
              </div>
            )}

            <div className="mt-4 space-y-4">
              <Field
                label="Serial Number"
                required
                hint={`วางหรือพิมพ์ทีละบรรทัด (หรือคั่นด้วยจุลภาค)${
                  addSnText ? ` — ตรวจพบ ${addSnCount.toLocaleString('th-TH')} รายการ` : ''
                }`}
              >
                <Textarea
                  value={addSnText}
                  onChange={(e) => setAddSnText(e.target.value)}
                  placeholder={`เช่น\n${SITE.examples.serial}\n(หนึ่งรายการต่อบรรทัด)`}
                  rows={6}
                  className="font-mono"
                  disabled={addingSn}
                  required
                />
              </Field>
              <Field label="หมวดหมู่" required hint={`เช่น ${SITE.examples.snCategory}`}>
                <Input
                  value={addSnCategory}
                  onChange={(e) => setAddSnCategory(e.target.value)}
                  placeholder="กรอกหมวดหมู่"
                  maxLength={100}
                  disabled={addingSn}
                  required
                />
              </Field>
            </div>

            {addSnResult && (
              <div className="mt-4">
                <Alert tone="success">
                  เพิ่มสำเร็จ {addSnResult.imported.toLocaleString('th-TH')} ตัว
                  {addSnResult.skipped > 0 &&
                    ` (ข้าม ${addSnResult.skipped.toLocaleString('th-TH')} ตัวที่ซ้ำกับที่มีอยู่แล้ว)`}
                </Alert>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAddSnProduct(null)} disabled={addingSn}>
                ปิด
              </Button>
              <Button onClick={confirmAddSn} disabled={addingSn || addSnCount === 0}>
                <Upload className="h-4 w-4" />
                {addingSn ? 'กำลังเพิ่ม…' : `เพิ่ม SN (${addSnCount.toLocaleString('th-TH')})`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type AvailableSn = {
  id: number
  sn: string
  category: string | null
  created_at: string
}

type AvailableSnResponse = {
  serials: AvailableSn[]
  meta: { total: number }
}

/** ดึงมาทีละชุด (เพดานของ parsePagination คือ 200) ที่เหลือให้ใช้ช่องค้นหาแคบลงเอา */
const SN_PICK_LIMIT = 200

/**
 * เลือก SN ที่ออกรหัสไว้แล้วจากหน้า Serial Number แต่ยังไม่ได้ผูกผลิตภัณฑ์ มาเชื่อมกับผลิตภัณฑ์ที่กำลังบันทึก
 *
 * แยกเป็นคอมโพเนนต์ลูกเพื่อให้ยิง API เฉพาะตอนโผล่จริง (เลือกประเภท "ผลิตเอง" แล้ว)
 * ตัวที่เลือกไว้เก็บที่แม่ เพราะต้องส่งต่อให้ handleSubmit หลังบันทึกผลิตภัณฑ์เสร็จ
 */
function SnLinkField({
  selected,
  onChange,
  disabled,
}: {
  selected: Set<number>
  onChange: (next: Set<number>) => void
  disabled?: boolean
}) {
  const [search, setSearch] = useState('')

  const url = useMemo(() => {
    const params = new URLSearchParams({
      status: 'available',
      product_id: 'unassigned',
      per_page: String(SN_PICK_LIMIT),
    })
    if (search) params.set('search', search)
    return `/api/admin/sn?${params}`
  }, [search])

  const { data, loading, error } = useApiList<AvailableSnResponse>(url)
  const serials = data?.serials ?? []
  const total = data?.meta.total ?? 0

  const allShownSelected = serials.length > 0 && serials.every((s) => selected.has(s.id))

  function toggleOne(id: number) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  function toggleAllShown() {
    const next = new Set(selected)
    // เลือก/ยกเลิกเฉพาะตัวที่แสดงอยู่ ไม่แตะตัวที่เลือกไว้จากผลค้นหาชุดก่อน
    for (const s of serials) {
      if (allShownSelected) next.delete(s.id)
      else next.add(s.id)
    }
    onChange(next)
  }

  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-medium text-navy-700">เชื่อม Serial Number</span>

      <div className="rounded-xl border border-navy-200">
        <div className="flex flex-wrap items-center gap-2 border-b border-navy-100 p-2.5">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            placeholder="ค้นหาด้วย SN…"
            className="min-w-0 flex-1 font-mono"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={toggleAllShown}
            disabled={disabled || serials.length === 0}
          >
            {allShownSelected ? 'ล้างที่แสดงอยู่' : 'เลือกทั้งหมดที่แสดง'}
          </Button>
        </div>

        {error && (
          <p className="px-3.5 py-3 text-sm text-rose-700">{error}</p>
        )}

        {!error && (
          <div className="scrollbar-thin max-h-56 divide-y divide-navy-50 overflow-y-auto">
            {loading && <p className="px-3.5 py-6 text-center text-sm text-navy-400">กำลังโหลด…</p>}

            {!loading && serials.length === 0 && (
              <p className="px-3.5 py-6 text-center text-sm text-navy-400">
                {search ? 'ไม่พบ SN ว่างที่ตรงกับคำค้น' : 'ยังไม่มี SN ว่างให้เชื่อม — ไปสร้างที่หน้า Serial Number ก่อน'}
              </p>
            )}

            {!loading &&
              serials.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 px-3.5 py-2 transition hover:bg-brand-50/40"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleOne(s.id)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-navy-300 text-brand-600 focus:ring-brand-300"
                  />
                  <span className="flex-1 font-mono text-sm text-navy-800">{s.sn}</span>
                  {s.category && <Badge tone="slate">{s.category}</Badge>}
                  <span className="text-xs text-navy-300">{formatDate(s.created_at)}</span>
                </label>
              ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-100 px-3.5 py-2 text-xs text-navy-400">
          <span>
            {total > SN_PICK_LIMIT
              ? `แสดง ${SN_PICK_LIMIT.toLocaleString('th-TH')} ตัวแรกจาก ${total.toLocaleString('th-TH')} ตัวที่ว่างอยู่ — ใช้ช่องค้นหาเพื่อจำกัดผลลัพธ์`
              : `SN ว่างทั้งหมด ${total.toLocaleString('th-TH')} ตัว`}
          </span>
          {selected.size > 0 && (
            <span className="inline-flex items-center gap-1.5 font-medium text-brand-700">
              <Link2 className="h-3.5 w-3.5" />
              เลือกไว้ {selected.size.toLocaleString('th-TH')} ตัว
              <button
                type="button"
                onClick={() => onChange(new Set())}
                disabled={disabled}
                className="ml-1 font-medium text-navy-400 transition hover:text-navy-700"
              >
                ล้างทั้งหมด
              </button>
            </span>
          )}
        </div>
      </div>

      <span className="mt-1.5 block text-xs leading-relaxed text-navy-400">
        ไม่บังคับ — เลือก SN ที่สร้างไว้แล้วและยังไม่ได้ผูกกับผลิตภัณฑ์ใด มาเชื่อมกับผลิตภัณฑ์นี้ตอนกดบันทึก
        (สร้าง SN ใหม่ได้ที่หน้า{' '}
        <Link href="/admin/serial-numbers" className="font-medium text-brand-600 hover:underline">
          Serial Number
        </Link>
        )
      </span>
    </div>
  )
}
