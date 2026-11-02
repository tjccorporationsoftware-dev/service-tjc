'use client'

import { Suspense, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ZodError } from 'zod'
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  FolderOpen,
  House,
  Lightbulb,
  Loader2,
  LockKeyhole,
  Mail,
  Paperclip,
  Phone,
  Plus,
  QrCode,
  Search,
  Send,
  Trash2,
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
  Textarea,
  TipCard,
  TipList,
} from '@/components/ui'
import { ErrorDialog } from '@/components/error-dialog'
import { AttachmentUsage, ItemAttachments, TOTAL_TOO_BIG, sizeOf } from '@/components/item-attachments'
import { OrgSearch, type OrgOption } from '@/components/org-search'
import { ProductInput, type ProductOption } from '@/components/product-input'
import { WarrantyNote } from '@/components/warranty-note'
import { readPrefill } from '@/lib/customer-link'
import { PROJECT_YEAR_MIN, currentThaiYear, thaiYearOf } from '@/lib/display'
import { SITE } from '@/lib/site-content'
import type { LookupProject } from '@/lib/tjc-api'
import { reportSchema, MAX_REPORT_ITEMS, UPLOAD_LIMITS } from '@/lib/validations'

/** รายการแนะนำสินค้าต่อช่อง — โครงการใหญ่มีหลายร้อยรายการ พิมพ์เพิ่มเพื่อกรองให้แคบลง */
const MAX_SUGGESTIONS = 100

/**
 * หน่วยงานของผู้แจ้ง
 * - search = ยังไม่ได้เลือก (แสดงช่องค้นหา)
 * - picked = เลือกจากข้อมูลหน้างานของระบบงาน — projects เป็น null ระหว่างโหลด
 * - manual = พิมพ์ชื่อเอง (ค้นไม่เจอ / ปิดการค้นหาไว้)
 */
type Org =
  | { mode: 'search' }
  | { mode: 'manual'; name: string }
  | { mode: 'picked'; org: OrgOption; projects: LookupProject[] | null; error: string }

/** สินค้าหนึ่งรายการในฟอร์ม — key ใช้เป็น React key เท่านั้น ไม่ได้ส่งไป API */
type ItemForm = {
  key: number
  project_item_id: number | null
  product_name: string
  model: string
  sn: string
  description: string
  /** ไฟล์แนบของรายการนี้ — ใบงานฝั่งระบบงานเก็บไฟล์แยกตามรายการ */
  images: File[]
  video: File | null
}

const blankItem = (key: number, init: Partial<ItemForm> = {}): ItemForm => ({
  key,
  project_item_id: null,
  product_name: '',
  model: '',
  sn: '',
  description: '',
  images: [],
  video: null,
  ...init,
})

const EMPTY_REPORTER = { reporter_name: '', phone: '', email: '' }

/** ปีของโครงการที่ลูกค้าเลือก — '' = ยังไม่ได้เลือก · 'unknown' = ไม่แน่ใจ */
type YearChoice = number | 'unknown' | ''

type Success = {
  case_number: string
  org_name: string
  project_name: string | null
  /** ปีของโครงการที่บันทึก (พ.ศ.) · 0 = ไม่แน่ใจ */
  project_year: number | null
  warranty: { start: string; end: string } | null
  items: { product_name: string; model: string | null; sn: string | null }[]
  attachments: number
}

// ฉบับร่าง — โปรดให้ฝ่ายกฎหมาย/ผู้ดูแลระบบตรวจสอบและแก้ไขเนื้อหาจริงก่อนใช้งานจริง
const PRIVACY_TEXT = `ประกาศความเป็นส่วนตัว
เราจัดเก็บชื่อ เบอร์โทรศัพท์ อีเมล ชื่อหน่วยงาน ข้อมูลสินค้า รายละเอียดปัญหา และไฟล์ที่ท่านแนบ เพื่อวัตถุประสงค์ในการให้บริการหลังการขาย ติดต่อกลับ และติดตามงานบริการ ข้อมูลจะถูกเก็บรักษาเท่าที่จำเป็นตามวัตถุประสงค์ดังกล่าว และจะไม่เปิดเผยต่อบุคคลภายนอกโดยไม่ได้รับอนุญาต เว้นแต่ตามที่กฎหมายกำหนด ท่านมีสิทธิขอเข้าถึง แก้ไข หรือขอให้ลบข้อมูลส่วนบุคคลของท่านได้ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)

กรุณาเก็บเลขที่เคสและเบอร์โทรที่ใช้แจ้งไว้ สำหรับติดตามสถานะงานบริการ`

const norm = (value: string | null | undefined) => (value ?? '').trim().toLowerCase()

/** ข้อความ error แรก — ถ้าเป็นช่องในรายการสินค้า บอกด้วยว่ารายการที่เท่าไร */
function describeIssue(error: ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'ข้อมูลไม่ถูกต้อง'
  const [head, index] = issue.path
  return head === 'items' && typeof index === 'number' && issue.path.length > 2
    ? `รายการที่ ${index + 1}: ${issue.message}`
    : issue.message
}

// useSearchParams ต้องอยู่ใต้ Suspense (เหมือนหน้า login แอดมิน)
export default function ReportPage() {
  return (
    <Suspense>
      <ReportForm />
    </Suspense>
  )
}

/**
 * แจ้งปัญหาหน้าเดียวจบ — ค้นหน่วยงาน → เลือกโครงการ → สินค้า (หลายรายการได้ แต่ละรายการมีอาการ + ไฟล์แนบของตัวเอง) → ผู้แจ้ง
 * หน่วยงาน/โครงการ/สินค้ามาจากข้อมูลหน้างานของระบบงาน (/api/lookup/*) ไม่เจอก็พิมพ์เองได้ทุกช่อง
 * ทั้งหมดส่งในคำขอเดียวไป POST /api/issues
 */
function ReportForm() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<ProductOption[]>([])
  const [org, setOrg] = useState<Org>({ mode: 'search' })
  // false = ยังไม่ได้เชื่อมระบบงาน ค้นหาหน่วยงานไม่ได้ — ซ่อนทางกลับไปหน้าค้นหา
  const [searchable, setSearchable] = useState(true)
  const [projectId, setProjectId] = useState<number | null>(null)
  // ปีของโครงการ — ใช้เมื่อไม่ได้เลือกโครงการจากระบบงาน (ระบบงานมีแต่โครงการปีล่าสุด ปีเก่าลูกค้าต้องบอกเอง)
  const [yearChoice, setYearChoice] = useState<YearChoice>('')
  // ลิงก์ที่เจ้าหน้าที่ส่งมา (หน้าสร้าง QR) อาจกรอก SN / สินค้าไว้ให้แล้ว — ใส่ในรายการแรก (ดู lib/customer-link.ts)
  const [items, setItems] = useState<ItemForm[]>(() => {
    const prefill = readPrefill(searchParams)
    return [
      blankItem(0, {
        sn: prefill.sn,
        product_name: prefill.product_name,
        model: [prefill.product_brand, prefill.product_model].filter(Boolean).join(' '),
      }),
    ]
  })
  const nextKey = useRef(1)
  const [reporter, setReporter] = useState(EMPTY_REPORTER)
  const [description, setDescription] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  // ข้อความในหน้าต่างแจ้งเตือนกลางจอ (ErrorDialog) — ว่าง = ปิด
  const [popup, setPopup] = useState('')
  // ไฟล์รวมทุกรายการใหญ่เกิน (Cloudflare ตอบ 413) — แสดงใต้รายการสินค้า ซึ่งเป็นที่แนบไฟล์
  const [fileError, setFileError] = useState('')
  const [success, setSuccess] = useState<Success | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => {})
    // ยังไม่ได้เชื่อมระบบงาน = ค้นหาหน่วยงานไม่ได้ ให้พิมพ์ชื่อเองตั้งแต่แรก
    fetch('/api/lookup/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data.enabled !== false) return
        setSearchable(false)
        setOrg((current) => (current.mode === 'search' ? { mode: 'manual', name: '' } : current))
      })
      .catch(() => {})
  }, [])

  // SN มากับลิงก์ — ค้นข้อมูลสินค้าครั้งเดียวตอนเปิดหน้า เหมือนลูกค้าพิมพ์เองแล้วออกจากช่อง
  const lookupLinkedSerial = useEffectEvent(() => {
    void lookupSerial(items[0].key, items[0].sn)
  })
  const linkedSn = searchParams.get('sn')
  useEffect(() => {
    if (linkedSn) lookupLinkedSerial()
  }, [linkedSn])

  const projects = org.mode === 'picked' ? (org.projects ?? []) : []
  const project = projects.find((p) => p.id === projectId) ?? null
  // เลือกโครงการจากระบบงานแล้ว = รู้ปีจากข้อมูลโครงการ ไม่ต้องให้ลูกค้าเลือกซ้ำ (server ก็ใช้ปีของโครงการเหมือนกัน)
  const projectYear = project ? thaiYearOf(project.date) : null
  // สินค้าแนะนำ: โครงการที่เลือก → ทุกโครงการของหน่วยงาน → ผลิตภัณฑ์ที่เปิดใช้งานของเว็บนี้
  const projectOptions = (project ? [project] : projects).flatMap((p) =>
    p.items.map((item) => ({ option: { id: item.id, name: item.name, brand: null, model: item.model }, projectId: p.id }))
  )
  const fromProjects = projectOptions.length > 0
  const baseOptions: ProductOption[] = fromProjects ? projectOptions.map((o) => o.option) : products

  function suggestionsFor(item: ItemForm): ProductOption[] {
    const term = norm(item.product_name)
    return baseOptions
      .filter((o) => norm(o.name).includes(term) || norm(o.model).includes(term))
      .slice(0, MAX_SUGGESTIONS)
  }

  const itemBytes = (item: ItemForm) => sizeOf(item.images) + (item.video?.size ?? 0)
  const totalBytes = items.reduce((sum, item) => sum + itemBytes(item), 0)

  function updateItem(key: number, patch: Partial<ItemForm>) {
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function selectProduct(key: number, option: ProductOption) {
    const owner = fromProjects ? projectOptions.find((o) => o.option.id === option.id) : undefined
    updateItem(key, {
      project_item_id: owner ? option.id : null,
      product_name: option.name,
      model: [option.brand, option.model].filter(Boolean).join(' '),
    })
    // เลือกสินค้าจากรายการรวมของทุกโครงการ = รู้แล้วว่าเป็นโครงการไหน เลือกโครงการให้เลย
    if (owner && projectId === null) setProjectId(owner.projectId)
  }

  function addItem() {
    setItems((list) => [...list, blankItem(nextKey.current++)])
  }

  function removeItem(key: number) {
    setItems((list) => list.filter((item) => item.key !== key))
  }

  /** เลือกโครงการใหม่ — สินค้าที่เลือกจากโครงการอื่นไว้ยังอยู่ แต่ถือว่าพิมพ์เอง (ไม่อ้างอิงรายการของโครงการเดิม) */
  function chooseProject(id: number | null) {
    setProjectId(id)
    if (id === null) return
    const allowed = new Set(projects.find((p) => p.id === id)?.items.map((item) => item.id))
    setItems((list) =>
      list.map((item) =>
        item.project_item_id !== null && !allowed.has(item.project_item_id) ? { ...item, project_item_id: null } : item
      )
    )
  }

  async function pickOrg(picked: OrgOption) {
    setOrg({ mode: 'picked', org: picked, projects: null, error: '' })
    setProjectId(null)
    setYearChoice('')
    try {
      const res = await fetch(`/api/lookup/projects?customer_id=${picked.id}`)
      const data = await res.json()
      setOrg((current) => {
        if (current.mode !== 'picked' || current.org.id !== picked.id) return current
        return res.ok
          ? { ...current, projects: data.projects ?? [] }
          : { ...current, projects: [], error: data.error ?? 'โหลดโครงการไม่สำเร็จ — กรอกสินค้าเองได้เลย' }
      })
      // หน่วยงานที่มีโครงการเดียว เลือกให้เลย
      if (res.ok && data.projects?.length === 1) setProjectId(data.projects[0].id)
    } catch {
      setOrg((current) =>
        current.mode === 'picked' && current.org.id === picked.id
          ? { ...current, projects: [], error: 'โหลดโครงการไม่สำเร็จ — กรอกสินค้าเองได้เลย' }
          : current
      )
    }
  }

  function resetOrg(next: Org) {
    setOrg(next)
    setProjectId(null)
    setYearChoice('')
    // สินค้าที่เลือกจากหน่วยงานเดิมยังคงชื่อไว้ แต่ไม่อ้างอิงรายการของหน่วยงานเดิมแล้ว
    setItems((list) => list.map((item) => ({ ...item, project_item_id: null })))
  }

  async function lookupSerial(key: number, sn: string) {
    if (sn.length < 5) return
    try {
      const res = await fetch(`/api/sn/check?sn=${encodeURIComponent(sn)}`)
      // 404 = SN ที่ไม่มีในระบบ / 409 = สร้างไว้แต่ยังไม่ผูกสินค้า — ลูกค้ากรอกสินค้าเอง
      if (!res.ok) return
      const data = await res.json()
      // เติมให้เฉพาะรายการที่ยังไม่ได้กรอกชื่อสินค้า และ SN ยังเป็นค่าเดิม (ลูกค้าอาจแก้ไปแล้วระหว่างรอ)
      setItems((list) =>
        list.map((item) =>
          item.key === key && item.sn === sn && !item.product_name.trim()
            ? {
                ...item,
                project_item_id: null,
                product_name: data.product_name ?? '',
                model: [data.brand, data.model].filter(Boolean).join(' '),
              }
            : item
        )
      )
    } catch {
      // ค้นไม่ได้ก็กรอกต่อได้ตามปกติ
    }
  }

  /** กดส่งไม่สำเร็จ — ขึ้นทั้ง Alert ในฟอร์ม และหน้าต่างกลางจอ (ลูกค้าอยู่ที่ปุ่มส่งท้ายฟอร์ม อาจไม่ได้เลื่อนขึ้นไปดู) */
  function fail(message: string) {
    setError(message)
    setPopup(message)
  }

  /** แจ้งเพิ่มอีกเรื่อง — คงหน่วยงาน/โครงการ และข้อมูลผู้แจ้งไว้ (มักแจ้งต่อจากที่เดิม คนเดิม) */
  function startAnother() {
    setSuccess(null)
    setItems([blankItem(nextKey.current++)])
    setDescription('')
    setError('')
    setFileError('')
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (projectYear === null && yearChoice === '') {
      fail('กรุณาเลือกปีของโครงการ — ถ้าจำไม่ได้ เลือก “ไม่แน่ใจ”')
      return
    }
    const payload = {
      org_customer_id: org.mode === 'picked' ? org.org.id : null,
      org_name: org.mode === 'picked' ? org.org.name : org.mode === 'manual' ? org.name : '',
      org_province: org.mode === 'picked' ? (org.org.province ?? '') : '',
      project_ref_id: project?.id ?? null,
      project_name: project?.name ?? '',
      project_code: project?.code ?? '',
      contract_no: project?.contract_no ?? '',
      // null = ลูกค้าเลือก "ไม่แน่ใจ"
      project_year: projectYear ?? (typeof yearChoice === 'number' ? yearChoice : null),
      items: items.map((item) => ({
        project_item_id: item.project_item_id,
        product_name: item.product_name,
        model: item.model,
        sn: item.sn,
        description: item.description,
      })),
      ...reporter,
      description,
      consent,
    }
    const parsed = reportSchema.safeParse(payload)
    if (!parsed.success) {
      fail(describeIssue(parsed.error))
      return
    }
    setError('')
    setFileError('')
    setSubmitting(true)

    const body = new FormData()
    body.set('payload', JSON.stringify(parsed.data))
    // ไฟล์ของรายการที่ i ส่งในช่อง images_<i> / video_<i> — ลำดับเดียวกับ items ใน payload
    items.forEach((item, index) => {
      item.images.forEach((file) => body.append(`images_${index}`, file))
      if (item.video) body.append(`video_${index}`, item.video)
    })

    try {
      const res = await fetch('/api/issues', { method: 'POST', body })
      // Cloudflare ตอบ 413 เป็นหน้า HTML (อ่านเป็น JSON ไม่ได้) เมื่อคำขอใหญ่เกิน 100MB
      // ขึ้นในส่วนไฟล์แนบ ซึ่งอยู่เหนือปุ่มส่งพอดี
      if (res.status === 413) {
        setFileError(TOTAL_TOO_BIG)
        setPopup(TOTAL_TOO_BIG)
        return
      }
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) {
        fail(data?.error ?? 'แจ้งปัญหาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
        return
      }
      setSuccess(data.issue)
    } catch {
      fail('ส่งข้อมูลไม่สำเร็จ — ไฟล์อาจมีขนาดใหญ่เกินไป หรือการเชื่อมต่อขาดระหว่างส่ง')
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
          title="รับเรื่องเรียบร้อย"
          description="ทีมงานได้รับเรื่องของท่านแล้ว กรุณาเก็บเลขที่เคสไว้เพื่อติดตามสถานะ"
        />
        <PageBody className="max-w-2xl">
          <Card className="p-6 text-center shadow-soft-lg sm:p-8">
            <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/60 px-6 py-7">
              <p className="text-sm text-navy-500">เลขที่เคส</p>
              <p className="tabular mt-1 font-mono text-3xl font-bold tracking-wide text-brand-700 sm:text-4xl">
                {success.case_number}
              </p>
            </div>
            <dl className="mt-6 space-y-4 text-left">
              <div>
                <dt className="text-xs text-navy-400">หน่วยงาน</dt>
                <dd className="mt-0.5 wrap-anywhere text-navy-900">{success.org_name}</dd>
                {success.project_name && (
                  <dd className="mt-0.5 text-sm wrap-anywhere text-navy-500">โครงการ: {success.project_name}</dd>
                )}
                {success.project_year ? (
                  <dd className="mt-0.5 text-sm text-navy-500">ปีของโครงการ: พ.ศ. {success.project_year}</dd>
                ) : null}
                {success.warranty && (
                  <dd className="mt-1">
                    <WarrantyNote start={success.warranty.start} end={success.warranty.end} />
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs text-navy-400">สินค้าที่แจ้ง {success.items.length} รายการ</dt>
                {success.items.map((item, index) => (
                  <dd key={index} className="mt-0.5 wrap-anywhere text-navy-900">
                    {index + 1}. {item.product_name}
                    {item.model && <span className="text-navy-500"> · {item.model}</span>}
                    {item.sn && <span className="tabular font-mono text-sm text-navy-500"> · SN {item.sn}</span>}
                  </dd>
                ))}
              </div>
              <div>
                <dt className="text-xs text-navy-400">ไฟล์แนบ</dt>
                <dd className="mt-0.5 text-navy-900">{success.attachments} ไฟล์</dd>
              </div>
            </dl>
            <p className="mt-6 rounded-xl bg-navy-50/70 px-4 py-3 text-left text-sm leading-relaxed text-navy-500">
              ติดตามความคืบหน้าได้ที่หน้าเช็คสถานะ ด้วยเลขที่เคสนี้และเบอร์โทรที่ใช้แจ้ง
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <LinkButton href={`/status?case=${encodeURIComponent(success.case_number)}`} size="lg" className="sm:flex-1">
                <Search className="h-4 w-4" />
                ติดตามสถานะเคส
              </LinkButton>
              <LinkButton href="/" variant="secondary" size="lg" className="sm:flex-1">
                <House className="h-4 w-4" />
                กลับหน้าแรก
              </LinkButton>
            </div>
            <button
              type="button"
              onClick={startAnother}
              className="mt-4 w-full text-center text-sm font-medium text-navy-400 transition hover:text-brand-600"
            >
              แจ้งปัญหาเรื่องอื่นเพิ่ม
            </button>
          </Card>
        </PageBody>
      </>
    )
  }

  return (
    <>
      <ErrorDialog message={popup} title="ส่งเรื่องไม่สำเร็จ" onClose={() => setPopup('')} />

      <PageHero
        icon={Wrench}
        title="แจ้งปัญหา"
        description="ค้นหาหน่วยงานของท่าน เลือกสินค้าที่มีปัญหา (แจ้งหลายรายการพร้อมกันได้) แนบรูปหรือวิดีโอ แล้วส่งครั้งเดียวจบ ทีมงานจะรับเรื่องและอัปเดตสถานะให้ติดตามได้ตลอด"
      />

      <PageBody className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <Card className="p-6 shadow-soft-lg sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && <Alert tone="error">{error}</Alert>}

            <FormSection number={1} title="หน่วยงานและโครงการ">
              {org.mode === 'search' && (
                <Field label="ชื่อหน่วยงาน" required hint="พิมพ์บางส่วนของชื่อแล้วเลือกจากรายการ ระบบจะแสดงโครงการและสินค้าที่ส่งมอบให้หน่วยงานนั้น">
                  <OrgSearch
                    onSelect={(picked) => void pickOrg(picked)}
                    onManual={(name) => resetOrg({ mode: 'manual', name })}
                  />
                </Field>
              )}

              {org.mode === 'manual' && (
                <div>
                  <Field label="ชื่อหน่วยงาน" required>
                    <InputWithIcon
                      icon={Building2}
                      value={org.name}
                      onChange={(e) => setOrg({ mode: 'manual', name: e.target.value })}
                      placeholder="เช่น โรงเรียนบ้านหนองบัว หรือ บริษัท เอบีซี จำกัด"
                      maxLength={255}
                      required
                    />
                  </Field>
                  {searchable && (
                    <button
                      type="button"
                      onClick={() => resetOrg({ mode: 'search' })}
                      className="mt-2 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                    >
                      ค้นหาจากรายชื่อหน่วยงานแทน
                    </button>
                  )}
                </div>
              )}

              {org.mode === 'picked' && (
                <>
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                      <div className="min-w-0">
                        <p className="font-medium wrap-anywhere text-navy-900">{org.org.name}</p>
                        {(org.org.affiliation || org.org.province) && (
                          <p className="text-sm text-navy-500">
                            {[org.org.affiliation, org.org.province].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => resetOrg({ mode: 'search' })}
                      className="shrink-0 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                    >
                      เปลี่ยน
                    </button>
                  </div>

                  {org.projects === null ? (
                    <p className="flex items-center gap-2 text-sm text-navy-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดโครงการ…
                    </p>
                  ) : org.error ? (
                    <Alert tone="warning">{org.error}</Alert>
                  ) : (
                    <fieldset>
                      <legend className="mb-1.5 text-sm font-medium text-navy-700">โครงการ</legend>
                      <p className="mb-2.5 text-xs leading-relaxed text-navy-400">
                        เลือกโครงการที่ซื้อสินค้าที่มีปัญหา — รายการสินค้าในข้อ 2 จะแสดงตามโครงการที่เลือก
                      </p>
                      <div role="radiogroup" aria-label="โครงการ" className="space-y-2">
                        {org.projects.map((p) => (
                          <ProjectChoice
                            key={p.id}
                            selected={projectId === p.id}
                            onSelect={() => chooseProject(p.id)}
                            title={p.name}
                            detail={[
                              p.code,
                              p.contract_no && `สัญญา ${p.contract_no}`,
                              thaiYearOf(p.date) && `ปี ${thaiYearOf(p.date)}`,
                              `สินค้า ${p.items.length} รายการ`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                            warranty={p.warranty}
                          />
                        ))}
                        <ProjectChoice
                          selected={projectId === null}
                          onSelect={() => chooseProject(null)}
                          title="ไม่แน่ใจว่าโครงการไหน"
                          detail="เลือกสินค้าจากทุกโครงการของหน่วยงานนี้ หรือพิมพ์ชื่อสินค้าเอง"
                        />
                      </div>
                    </fieldset>
                  )}
                </>
              )}

              <YearPicker fixedYear={projectYear} value={yearChoice} onChange={setYearChoice} />
            </FormSection>

            <FormSection
              number={2}
              title="สินค้าที่มีปัญหา"
              hint="แจ้งหลายรายการพร้อมกันได้ แต่ละรายการบอกอาการและแนบรูป/วิดีโอของตัวเอง · Serial Number ไม่บังคับ"
              divided
            >
              {items.map((item, index) => (
                <div key={item.key} className="space-y-4 rounded-2xl border border-navy-100 bg-navy-50/30 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-navy-800">รายการที่ {index + 1}</p>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-navy-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        ลบรายการนี้
                      </button>
                    )}
                  </div>

                  <Field
                    label="สินค้า"
                    required
                    hint={
                      fromProjects
                        ? 'เลือกจากรายการสินค้าในโครงการ หรือพิมพ์ชื่อเองถ้าไม่มีในรายการ'
                        : 'พิมพ์ชื่อสินค้า หรือเลือกจากรายการที่ขึ้นมาถ้ามีสินค้าที่ตรงกัน'
                    }
                  >
                    <ProductInput
                      value={item.product_name}
                      onChange={(value) => updateItem(item.key, { product_name: value, project_item_id: null })}
                      suggestions={suggestionsFor(item)}
                      onSelect={(option) => selectProduct(item.key, option)}
                      placeholder={`เช่น ${SITE.examples.productName}`}
                      maxLength={255}
                      required
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="ยี่ห้อ / รุ่น">
                      <Input
                        value={item.model}
                        onChange={(e) => updateItem(item.key, { model: e.target.value })}
                        placeholder={`เช่น ${SITE.examples.brand} ${SITE.examples.model}`}
                        maxLength={255}
                      />
                    </Field>
                    <Field label="Serial Number" hint="ไม่บังคับ — ถ้ามีช่วยให้ตรวจสอบได้เร็วขึ้น">
                      <InputWithIcon
                        icon={QrCode}
                        value={item.sn}
                        onChange={(e) => updateItem(item.key, { sn: e.target.value.toUpperCase() })}
                        onBlur={() => void lookupSerial(item.key, item.sn.trim())}
                        placeholder={`เช่น ${SITE.examples.serial}`}
                        className="tabular font-mono"
                        maxLength={50}
                      />
                    </Field>
                  </div>

                  <Field label="อาการที่พบ" required>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItem(item.key, { description: e.target.value })}
                      rows={3}
                      placeholder={SITE.examples.problem}
                      maxLength={2000}
                      required
                    />
                  </Field>

                  <ItemAttachments
                    files={{ images: item.images, video: item.video }}
                    otherBytes={totalBytes - itemBytes(item)}
                    onChange={(files) => {
                      updateItem(item.key, files)
                      setFileError('')
                    }}
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                onClick={addItem}
                disabled={items.length >= MAX_REPORT_ITEMS}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4" />
                {items.length >= MAX_REPORT_ITEMS
                  ? `แจ้งได้ครั้งละไม่เกิน ${MAX_REPORT_ITEMS} รายการ`
                  : 'เพิ่มสินค้าอีกรายการ'}
              </Button>

              {fileError && <Alert tone="error">{fileError}</Alert>}
              {totalBytes > 0 && <AttachmentUsage bytes={totalBytes} />}
            </FormSection>

            <FormSection
              number={3}
              title="ข้อมูลผู้แจ้ง"
              hint="ใช้เบอร์โทรนี้คู่กับเลขที่เคสเพื่อติดตามสถานะในภายหลัง"
              divided
            >
              <Field label="ชื่อผู้แจ้ง" required>
                <InputWithIcon
                  icon={User}
                  value={reporter.reporter_name}
                  onChange={(e) => setReporter({ ...reporter, reporter_name: e.target.value })}
                  placeholder="เช่น สมชาย ใจดี"
                  maxLength={255}
                  required
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="เบอร์โทรศัพท์ที่ติดต่อได้" required hint="ตัวเลข 10 หลัก ขึ้นต้นด้วย 0">
                  <InputWithIcon
                    icon={Phone}
                    value={reporter.phone}
                    onChange={(e) => setReporter({ ...reporter, phone: e.target.value.replace(/\D/g, '') })}
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
                    value={reporter.email}
                    onChange={(e) => setReporter({ ...reporter, email: e.target.value })}
                    placeholder="name@example.com"
                    maxLength={255}
                    required
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection
              number={4}
              title="รายละเอียดเพิ่มเติม"
              hint="ไม่บังคับ"
              divided
            >
              <Field label="รายละเอียดเพิ่มเติม" hint="เช่น สถานที่ติดตั้ง ช่วงเวลาที่สะดวกให้เข้าตรวจ หรือข้อมูลอื่นที่อยากแจ้ง">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={5000}
                />
              </Field>
            </FormSection>

            <FormSection number={5} title="ความเป็นส่วนตัว" divided>
              <div>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-navy-100 bg-navy-50/40 p-3.5 text-xs leading-relaxed whitespace-pre-line text-navy-500">
                  {PRIVACY_TEXT}
                </div>
                <label className="mt-3 flex items-start gap-2.5 text-sm text-navy-700">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
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

            <Button type="submit" size="lg" className="w-full" disabled={submitting || !consent}>
              <Send className="h-5 w-5" />
              {submitting ? 'กำลังส่ง…' : 'ส่งเรื่องแจ้งปัญหา'}
            </Button>
          </form>
        </Card>

        <aside className="space-y-4">
          <TipCard icon={Building2} title="หาหน่วยงานไม่เจอ?">
            <TipList
              items={[
                'พิมพ์แค่บางคำของชื่อ เช่น ชื่อโรงเรียนหรือชื่อตำบล แทนการพิมพ์ชื่อเต็ม',
                'ระบบค้นจากหน่วยงานที่เคยมีโครงการกับเรา ถ้าไม่พบ กด “ใช้ชื่อตามที่พิมพ์” ได้เลย',
              ]}
            />
          </TipCard>
          <TipCard icon={FolderOpen} title="แจ้งหลายสินค้าพร้อมกัน">
            กด “เพิ่มสินค้าอีกรายการ” แล้วบอกอาการของแต่ละรายการ ทั้งหมดจะอยู่ในเลขที่เคสเดียวกัน
          </TipCard>
          <TipCard icon={QrCode} title="Serial Number อยู่ตรงไหน?">
            <TipList items={SITE.snLocations} />
            <p className="mt-3 text-xs text-navy-400">ไม่บังคับกรอก — สินค้าบางชนิดไม่มี Serial Number</p>
          </TipCard>
          <TipCard icon={Lightbulb} title="แจ้งอย่างไรให้แก้ไขได้เร็ว">
            <TipList items={SITE.reportTips} />
          </TipCard>
          <TipCard icon={Paperclip} title="ไฟล์ที่แนบได้">
            <TipList items={[UPLOAD_LIMITS.image.label, UPLOAD_LIMITS.video.label, UPLOAD_LIMITS.totalLabel]} />
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
 * ปีของโครงการ (พ.ศ.) — เจ้าหน้าที่ใช้หาโครงการปีเก่าที่ยังไม่อยู่ในระบบงาน (ขึ้นเป็นป้ายในกล่องเคสของระบบแจ้งซ่อม)
 * เลือกโครงการจากระบบงานแล้วแสดงปีของโครงการนั้นแทน ไม่ต้องเลือกซ้ำ
 */
function YearPicker({
  fixedYear,
  value,
  onChange,
}: {
  fixedYear: number | null
  value: YearChoice
  onChange: (value: YearChoice) => void
}) {
  if (fixedYear !== null) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-navy-50/70 px-4 py-2.5 text-sm text-navy-600">
        <CalendarDays className="h-4 w-4 shrink-0 text-brand-600" />
        <span>
          ปีของโครงการ <span className="tabular font-semibold text-navy-900">พ.ศ. {fixedYear}</span> — ตามโครงการที่เลือก
        </span>
      </p>
    )
  }

  const thisYear = currentThaiYear()
  const years: YearChoice[] = [
    ...Array.from({ length: thisYear - PROJECT_YEAR_MIN + 1 }, (_, index) => thisYear - index),
    'unknown',
  ]

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-navy-700">
        ปีที่ซื้อ / ปีของโครงการ (พ.ศ.)
        <span className="ml-0.5 text-rose-500">*</span>
      </legend>
      <p className="mb-2.5 text-xs leading-relaxed text-navy-400">
        ช่วยให้เจ้าหน้าที่ค้นข้อมูลโครงการได้เร็วขึ้น — ถ้าจำไม่ได้ เลือก “ไม่แน่ใจ”
      </p>
      <div role="radiogroup" aria-label="ปีของโครงการ" className="flex flex-wrap gap-2">
        {years.map((year) => {
          const selected = value === year
          return (
            <button
              key={year}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(year)}
              className={`tabular rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                selected
                  ? 'border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-100'
                  : 'border-navy-200 bg-white text-navy-600 hover:border-brand-200 hover:bg-brand-50/40'
              }`}
            >
              {year === 'unknown' ? 'ไม่แน่ใจ' : year}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** ตัวเลือกโครงการแบบการ์ด (ทำหน้าที่เหมือน radio) */
function ProjectChoice({
  selected,
  onSelect,
  title,
  detail,
  warranty,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  detail: string
  warranty?: LookupProject['warranty']
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
        selected
          ? 'border-brand-400 bg-brand-50/70 ring-2 ring-brand-100'
          : 'border-navy-100 bg-white hover:border-brand-200 hover:bg-brand-50/30'
      }`}
    >
      <span
        className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-brand-600' : 'border-navy-300'
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-brand-600" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium wrap-anywhere text-navy-900">{title}</span>
        <span className="mt-0.5 block text-xs wrap-anywhere text-navy-400">{detail}</span>
        {warranty && (
          <span className="mt-1 block">
            <WarrantyNote start={warranty.start} end={warranty.end} />
          </span>
        )}
      </span>
    </button>
  )
}
