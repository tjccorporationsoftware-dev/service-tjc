'use client'

import { Suspense, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  ChevronDown,
  FileSignature,
  Lock,
  LockKeyhole,
  Mail,
  Package,
  Phone,
  QrCode,
  Search,
  Sparkles,
  User,
  Wrench,
} from 'lucide-react'
import {
  Alert,
  Button,
  Card,
  Field,
  FormSection,
  Input,
  InputWithIcon,
  LinkButton,
  PageBody,
  PageHero,
  TipCard,
  TipList,
} from '@/components/ui'
import { readPrefill } from '@/lib/customer-link'
import { SITE } from '@/lib/site-content'
import { registerSchema, firstIssueMessage } from '@/lib/validations'

type Product = {
  id: number
  name: string
  brand: string | null
  model: string | null
}

/** SN ที่เจ้าหน้าที่ผูกผลิตภัณฑ์ไว้แล้ว (จาก /api/sn/check) — ลูกค้าไม่ต้องกรอกสินค้าเอง */
type KnownSerial = {
  sn: string
  product_name: string
  brand: string | null
  model: string | null
  /** มีคนลงทะเบียนผูกข้อมูลติดต่อไปแล้ว */
  taken: boolean
}

type Success = {
  sn: string
  customer_name: string
  email: string
  product_name: string
  brand: string | null
  model: string | null
}

const EMPTY_FORM = {
  customer_name: '',
  phone: '',
  email: '',
  sn: '',
  product_name: '',
  product_brand: '',
  product_model: '',
  consent: false,
}

type ProductField = 'product_name' | 'product_brand' | 'product_model'

// ฉบับร่าง — โปรดให้ฝ่ายกฎหมาย/ผู้ดูแลระบบตรวจสอบและแก้ไขเนื้อหาจริงก่อนใช้งานจริง
const PRIVACY_TEXT = `ประกาศความเป็นส่วนตัว
เราจัดเก็บชื่อ เบอร์โทรศัพท์ อีเมล และข้อมูลสินค้าของท่าน เพื่อวัตถุประสงค์ในการลงทะเบียนสินค้า ติดต่อกลับกรณีแจ้งปัญหา และให้บริการหลังการขาย ข้อมูลจะถูกเก็บรักษาเท่าที่จำเป็นตามวัตถุประสงค์ดังกล่าว และจะไม่เปิดเผยต่อบุคคลภายนอกโดยไม่ได้รับอนุญาต เว้นแต่ตามที่กฎหมายกำหนด ท่านมีสิทธิขอเข้าถึง แก้ไข หรือขอให้ลบข้อมูลส่วนบุคคลของท่านได้ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)

กรุณาเก็บ Serial Number และข้อมูลการลงทะเบียนไว้เป็นหลักฐานในการแจ้งปัญหาหรือขอรับบริการ`

const norm = (value: string | null | undefined) => (value ?? '').trim().toLowerCase()

// useSearchParams ต้องอยู่ใต้ Suspense (เหมือนหน้า login แอดมิน)
export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  // ลิงก์ที่เจ้าหน้าที่ส่งมา (หน้าสร้าง QR) อาจกรอก SN / สินค้าไว้ให้แล้ว — ดู lib/customer-link.ts
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...readPrefill(searchParams) }))
  const [knownSerial, setKnownSerial] = useState<KnownSerial | null>(null)
  const [checkingSn, setCheckingSn] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<Success | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // SN ล่าสุดที่สั่งค้น — ผลของ SN เก่าที่ตอบกลับมาช้ากว่าต้องทิ้ง
  const latestLookup = useRef('')

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => {})
  }, [])

  // SN มากับลิงก์ — ค้นข้อมูลสินค้าครั้งเดียวตอนเปิดหน้า เหมือนลูกค้าพิมพ์เองแล้วออกจากช่อง
  const lookupLinkedSerial = useEffectEvent(() => {
    void lookupSerial()
  })
  const linkedSn = searchParams.get('sn')
  useEffect(() => {
    if (linkedSn) lookupLinkedSerial()
  }, [linkedSn])

  const sn = form.sn.trim()
  // ผลค้นของ SN ก่อนหน้าไม่นับ — ลูกค้าแก้ SN แล้วช่องสินค้าต้องกลับมาให้พิมพ์เองได้
  const serial = knownSerial?.sn === sn ? knownSerial : null

  // กรองจากทั้ง 3 ช่องพร้อมกัน — พิมพ์ช่องไหนก็ช่วยกรองรายการแนะนำชุดเดียวกัน
  const suggestions = products.filter(
    (p) =>
      norm(p.name).includes(norm(form.product_name)) &&
      norm(p.brand).includes(norm(form.product_brand)) &&
      norm(p.model).includes(norm(form.product_model))
  )

  async function lookupSerial() {
    if (sn.length < 5) return
    latestLookup.current = sn
    setCheckingSn(true)
    try {
      const res = await fetch(`/api/sn/check?sn=${encodeURIComponent(sn)}`)
      if (latestLookup.current !== sn) return
      // 404 = SN ใหม่ที่ไม่มีในระบบ / 409 = สร้างไว้แต่ยังไม่ผูกผลิตภัณฑ์ — ทั้งคู่ให้ลูกค้ากรอกสินค้าเอง
      if (!res.ok) {
        setKnownSerial(null)
        return
      }
      const data = await res.json()
      setKnownSerial({
        sn,
        product_name: data.product_name,
        brand: data.brand ?? null,
        model: data.model ?? null,
        taken: Boolean(data.claimed),
      })
    } catch {
      // ค้นไม่ได้ก็กรอกต่อได้ตามปกติ — API ตรวจ SN ซ้ำอีกรอบตอนบันทึกอยู่แล้ว
      if (latestLookup.current === sn) setKnownSerial(null)
    } finally {
      if (latestLookup.current === sn) setCheckingSn(false)
    }
  }

  function changeProductField(field: ProductField, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function selectProduct(product: Product) {
    setForm((f) => ({
      ...f,
      product_name: product.name,
      product_brand: product.brand ?? '',
      product_model: product.model ?? '',
    }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    // SN ที่ผูกผลิตภัณฑ์ไว้แล้ว ส่งผลิตภัณฑ์ตามระบบไป (API ยึดตามระบบอยู่แล้ว แต่ต้องผ่าน validation)
    const payload = serial
      ? {
          ...form,
          product_name: serial.product_name,
          product_brand: serial.brand ?? '',
          product_model: serial.model ?? '',
        }
      : form
    const parsed = registerSchema.safeParse(payload)
    if (!parsed.success) {
      setError(firstIssueMessage(parsed.error))
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'ลงทะเบียนไม่สำเร็จ')
        return
      }
      setSuccess(data.registration)
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <>
        <PageHero
          tone="success"
          icon={CheckCircle2}
          title="ลงทะเบียนสำเร็จ"
          description="สินค้าของท่านอยู่ในระบบแล้ว แจ้งปัญหาได้ทันที — กรุณาเก็บ Serial Number ไว้อ้างอิง"
        />
        <PageBody className="max-w-2xl">
          <Card className="p-6 shadow-soft-lg sm:p-8">
            <div className="flex items-start gap-4 rounded-2xl bg-brand-50/70 p-5 ring-1 ring-brand-100">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
                <Package className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold wrap-anywhere text-navy-900">{success.product_name}</p>
                {(success.brand || success.model) && (
                  <p className="text-sm wrap-anywhere text-navy-500">
                    {[success.brand, success.model].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="tabular mt-2 font-mono text-sm font-medium wrap-anywhere text-brand-700">{success.sn}</p>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Detail label="ชื่อผู้ซื้อ/หน่วยงาน" value={success.customer_name} />
              <Detail label="อีเมล" value={success.email} />
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/report" size="lg" className="sm:flex-1">
                <Wrench className="h-4 w-4" />
                แจ้งปัญหา
              </LinkButton>
              <LinkButton href="/status" variant="secondary" size="lg" className="sm:flex-1">
                <Search className="h-4 w-4" />
                ไปหน้าเช็คสถานะ
              </LinkButton>
            </div>
            <button
              type="button"
              onClick={() => {
                setSuccess(null)
                setForm(EMPTY_FORM)
                setKnownSerial(null)
              }}
              className="mt-4 w-full text-center text-sm font-medium text-navy-400 transition hover:text-brand-600"
            >
              ลงทะเบียนเครื่องอื่น
            </button>
          </Card>
        </PageBody>
      </>
    )
  }

  return (
    <>
      <PageHero
        icon={FileSignature}
        title="ลงทะเบียนผลิตภัณฑ์"
        description="กรอกข้อมูลของท่านและสินค้าให้ครบถ้วน ใช้เวลาเพียงไม่กี่นาที แจ้งปัญหาได้ทันทีหลังลงทะเบียน"
      />

      <PageBody className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <Card className="p-6 shadow-soft-lg sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && <Alert tone="error">{error}</Alert>}

            <FormSection number={1} title="ข้อมูลผู้ลงทะเบียน">
              <Field label="ชื่อผู้ซื้อหรือชื่อหน่วยงาน" required>
                <InputWithIcon
                  icon={User}
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  placeholder="เช่น สมชาย ใจดี หรือ บริษัท เอบีซี จำกัด"
                  maxLength={255}
                  required
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="เบอร์โทรศัพท์ที่ติดต่อได้" required hint="ตัวเลข 10 หลัก ขึ้นต้นด้วย 0">
                  <InputWithIcon
                    icon={Phone}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="0812345678"
                    required
                  />
                </Field>

                <Field label="อีเมล" required>
                  <InputWithIcon
                    icon={Mail}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                    maxLength={255}
                    required
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection number={2} title="ข้อมูลสินค้า" divided>
              <Field
                label="Serial Number"
                required
                hint={
                  checkingSn
                    ? 'กำลังตรวจสอบ Serial Number…'
                    : 'ดูได้จากสติกเกอร์หรือป้ายบนตัวเครื่อง'
                }
              >
                <InputWithIcon
                  icon={QrCode}
                  value={form.sn}
                  onChange={(e) => setForm({ ...form, sn: e.target.value.toUpperCase() })}
                  onBlur={lookupSerial}
                  placeholder={`เช่น ${SITE.examples.serial}`}
                  className="tabular font-mono"
                  maxLength={50}
                  required
                />
              </Field>

              {serial?.taken && (
                <Alert tone="error">
                  Serial Number นี้ถูกลงทะเบียนไปแล้ว — หากเป็นเครื่องของท่าน กรุณาติดต่อเจ้าหน้าที่
                </Alert>
              )}

              {serial ? (
                <Field label="สินค้า">
                  <div className="flex items-start gap-3 rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-3 text-sm">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
                    <div className="min-w-0 wrap-anywhere">
                      <div className="font-medium text-navy-900">{serial.product_name}</div>
                      {(serial.brand || serial.model) && (
                        <div className="text-navy-500">
                          {[serial.brand, serial.model].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-navy-400">ข้อมูลสินค้าของ Serial Number นี้มีอยู่ในระบบแล้ว</div>
                    </div>
                  </div>
                </Field>
              ) : (
                <>
                  <Field label="ชื่อสินค้า" required hint="พิมพ์ได้เลย หรือเลือกจากรายการที่ขึ้นมาถ้ามีสินค้าที่ตรงกัน">
                    <ProductInput
                      value={form.product_name}
                      onChange={(value) => changeProductField('product_name', value)}
                      suggestions={suggestions}
                      onSelect={selectProduct}
                      placeholder={`เช่น ${SITE.examples.productName}`}
                      maxLength={255}
                      required
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="ยี่ห้อ">
                      <ProductInput
                        value={form.product_brand}
                        onChange={(value) => changeProductField('product_brand', value)}
                        suggestions={suggestions}
                        onSelect={selectProduct}
                        placeholder={`เช่น ${SITE.examples.brand}`}
                        maxLength={100}
                      />
                    </Field>
                    <Field label="รุ่น">
                      <ProductInput
                        value={form.product_model}
                        onChange={(value) => changeProductField('product_model', value)}
                        suggestions={suggestions}
                        onSelect={selectProduct}
                        placeholder={`เช่น ${SITE.examples.model}`}
                        maxLength={100}
                      />
                    </Field>
                  </div>
                </>
              )}
            </FormSection>

            <FormSection number={3} title="ความเป็นส่วนตัว" divided>
              <div>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-navy-100 bg-navy-50/40 p-3.5 text-xs leading-relaxed whitespace-pre-line text-navy-500">
                  {PRIVACY_TEXT}
                </div>
                <label className="mt-3 flex items-start gap-2.5 text-sm text-navy-700">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                    required
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy-300 text-brand-600 focus:ring-brand-300"
                  />
                  <span>
                    ข้าพเจ้ารับทราบและยินยอมตามประกาศความเป็นส่วนตัวข้างต้น
                    <span className="ml-0.5 text-rose-500">*</span>
                  </span>
                </label>
              </div>
            </FormSection>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting || !form.consent || Boolean(serial?.taken)}
            >
              <FileSignature className="h-5 w-5" />
              {submitting ? 'กำลังบันทึก…' : 'ลงทะเบียนผลิตภัณฑ์'}
            </Button>
          </form>
        </Card>

        <aside className="space-y-4">
          <TipCard icon={QrCode} title="Serial Number อยู่ตรงไหน?">
            <TipList items={SITE.snLocations} />
            <p className="mt-3 text-xs text-navy-400">
              ถ้า SN นี้มีข้อมูลสินค้าในระบบอยู่แล้ว ระบบจะแสดงให้อัตโนมัติ
            </p>
          </TipCard>
          <TipCard icon={Sparkles} title="ลงทะเบียนแล้วทำอะไรได้บ้าง">
            <TipList
              items={[
                'แจ้งปัญหาพร้อมแนบรูปหรือวิดีโอได้ทันที',
                'ติดตามสถานะเคสด้วย SN และเบอร์โทร',
                'ใช้ข้อมูลเดิมอ้างอิงทุกครั้งที่ขอรับบริการ',
              ]}
            />
          </TipCard>
          <TipCard icon={LockKeyhole} title="ข้อมูลของท่านปลอดภัย">
            เบอร์โทรถูกปิดบังทุกครั้งที่แสดงบนหน้าเว็บ และใช้เพื่อการให้บริการหลังการขายเท่านั้น
          </TipCard>
        </aside>
      </PageBody>
    </>
  )
}

/**
 * ช่องพิมพ์ข้อมูลสินค้าแบบอิสระ พร้อมรายการแนะนำจากผลิตภัณฑ์ที่เปิดใช้งาน — ใช้ซ้ำทั้งช่อง ชื่อ/ยี่ห้อ/รุ่น
 * ไม่บังคับให้เลือกจากรายการ พิมพ์อะไรมาก็บันทึกตามนั้น (API จับคู่กับผลิตภัณฑ์ที่มีอยู่ให้เองถ้าตรงกันทุกช่อง)
 * รายการแนะนำ (suggestions) มาจาก parent เพราะ parent รวมเงื่อนไขจากทั้ง 3 ช่องเข้าด้วยกัน
 */
function ProductInput({
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
  suggestions: Product[]
  onSelect: (product: Product) => void
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

  function select(product: Product) {
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-navy-400">{label}</dt>
      <dd className="mt-0.5 wrap-anywhere text-navy-900">{value}</dd>
    </div>
  )
}
