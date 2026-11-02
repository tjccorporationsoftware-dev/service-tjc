'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Building2,
  CalendarDays,
  FolderOpen,
  Hash,
  ListChecks,
  MessageSquareText,
  Package,
  Phone,
  Plus,
  Search,
} from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  ISSUE_STATUS_TONE,
  InputWithIcon,
  PageBody,
  PageHero,
  formatDateTime,
} from '@/components/ui'
import { ErrorDialog } from '@/components/error-dialog'
import { WarrantyNote } from '@/components/warranty-note'
import { readPrefill } from '@/lib/customer-link'
import { ISSUE_STATUS_LABEL } from '@/lib/display'

type Attachment = { type: string; url: string }

type IssueItem = {
  product_name: string
  model: string | null
  sn: string | null
  description: string | null
  attachments: Attachment[]
}

type Issue = {
  id: number
  case_number: string
  description: string
  status: string
  admin_note: string | null
  created_at: string
  updated_at: string
  org_name: string | null
  project_name: string | null
  /** ปีของโครงการ (พ.ศ.) · 0 = ไม่แน่ใจ · null = เคสก่อนมีช่องนี้ */
  project_year: number | null
  warranty: { start: string; end: string } | null
  items: IssueItem[]
  attachments: Attachment[]
}

type Result = { phone: string; issues: Issue[] }

/** สิ่งที่จะเห็นหลังค้นหา — โชว์ก่อนค้นหาให้รู้ว่าหน้านี้ใช้ทำอะไร */
const PREVIEW = [
  { icon: Package, title: 'สินค้าที่แจ้ง', text: 'หน่วยงาน โครงการ และสินค้าทุกรายการในเคส' },
  { icon: ListChecks, title: 'ประวัติคำขอรับบริการ', text: 'ทุกเคสที่แจ้งด้วยเบอร์นี้ พร้อมรูปและวิดีโอที่แนบ' },
  { icon: MessageSquareText, title: 'ความคืบหน้า', text: 'สถานะล่าสุดและหมายเหตุจากเจ้าหน้าที่' },
]

// useSearchParams ต้องอยู่ใต้ Suspense (เหมือนหน้า login แอดมิน)
export default function StatusPage() {
  return (
    <Suspense>
      <StatusForm />
    </Suspense>
  )
}

function StatusForm() {
  const searchParams = useSearchParams()
  // หน้าแจ้งปัญหาส่งเลขที่เคสมาทาง ?case= · ลิงก์จากหน้าสร้าง QR ส่ง SN มาทาง ?sn=
  // เบอร์โทรลูกค้าต้องกรอกเองเสมอ (ไม่ใส่เบอร์ลงลิงก์ — PDPA)
  const [form, setForm] = useState(() => ({
    q: (searchParams.get('case') ?? '').trim().toUpperCase().slice(0, 50) || readPrefill(searchParams).sn,
    phone: '',
  }))
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  // ข้อความในหน้าต่างแจ้งเตือนกลางจอ (ErrorDialog) — ว่าง = ปิด
  const [popup, setPopup] = useState('')
  const [loading, setLoading] = useState(false)

  /** กดส่งไม่สำเร็จ — ขึ้นทั้ง Alert ในฟอร์ม และหน้าต่างกลางจอ (ลูกค้าอยู่ที่ปุ่มส่งท้ายฟอร์ม อาจไม่ได้เลื่อนขึ้นไปดู) */
  function fail(message: string) {
    setError(message)
    setPopup(message)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: form.q, phone: form.phone })
      const res = await fetch(`/api/issues/status?${params}`)
      const data = await res.json()
      if (!res.ok) {
        fail(data.error ?? 'ค้นหาไม่สำเร็จ')
        return
      }
      setResult(data)
    } catch {
      fail('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ErrorDialog message={popup} title="ค้นหาไม่สำเร็จ" onClose={() => setPopup('')} />

      <PageHero
        icon={Search}
        title="ตรวจสอบสถานะ"
        description="ค้นหาด้วยเลขที่เคสหรือ Serial Number คู่กับหมายเลขโทรศัพท์ที่ใช้แจ้งปัญหา เพื่อดูความคืบหน้าของคำขอรับบริการ"
      />

      <PageBody className="max-w-4xl space-y-6">
        <Card className="p-6 shadow-soft-lg sm:p-8">
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="เลขที่เคส หรือ Serial Number" required>
              <InputWithIcon
                icon={Hash}
                value={form.q}
                onChange={(e) => setForm({ ...form, q: e.target.value.toUpperCase() })}
                placeholder="เช่น CASE-000123"
                className="font-mono"
                maxLength={50}
                required
              />
            </Field>
            <Field label="หมายเลขโทรศัพท์ที่ใช้แจ้ง" required>
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
            <Button type="submit" disabled={loading} className="h-11 px-6">
              <Search className="h-4 w-4" />
              {loading ? 'กำลังค้นหา…' : 'ค้นหา'}
            </Button>
          </form>
          {error && (
            <div className="mt-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
        </Card>

        {!result && (
          <div className="grid gap-4 sm:grid-cols-3">
            {PREVIEW.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-dashed border-navy-200 bg-white/70 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h2 className="mt-3 font-semibold text-navy-900">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-navy-500">{text}</p>
              </div>
            ))}
          </div>
        )}

        {result && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
                ประวัติคำขอรับบริการ
                <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-sm font-semibold text-navy-600">
                  {result.issues.length}
                </span>
              </h2>
              <Link
                href="/report"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition hover:text-brand-700"
              >
                <Plus className="h-4 w-4" />
                แจ้งปัญหาใหม่
              </Link>
            </div>
            <p className="text-sm text-navy-500">
              เคสที่แจ้งด้วยเบอร์ <span className="tabular font-mono">{result.phone}</span>
            </p>

            {result.issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </section>
        )}
      </PageBody>
    </>
  )
}

function IssueCard({ issue }: { issue: Issue }) {
  // เคสยุคก่อนไม่มีอาการรายสินค้า — อาการอยู่ที่ description ของเคส
  const perItem = issue.items.some((item) => item.description)

  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="tabular font-mono text-lg font-bold text-navy-900">{issue.case_number}</span>
        <Badge tone={ISSUE_STATUS_TONE[issue.status]}>{ISSUE_STATUS_LABEL[issue.status]}</Badge>
      </div>

      <IssueProgress status={issue.status} />

      {(issue.org_name || issue.project_name || issue.project_year) && (
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {issue.org_name && <Detail icon={Building2} label="หน่วยงาน" value={issue.org_name} />}
          {issue.project_name && <Detail icon={FolderOpen} label="โครงการ" value={issue.project_name} />}
          {issue.project_year ? (
            <Detail icon={CalendarDays} label="ปีของโครงการ" value={`พ.ศ. ${issue.project_year}`} />
          ) : null}
        </dl>
      )}
      {issue.warranty && (
        <div className="mt-3">
          <WarrantyNote start={issue.warranty.start} end={issue.warranty.end} />
        </div>
      )}

      <ul className="mt-5 space-y-2.5">
        {issue.items.map((item, index) => (
          <li key={index} className="rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-sm">
            <div className="flex items-start gap-2.5">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
              <div className="min-w-0">
                <p className="font-medium wrap-anywhere text-navy-900">
                  {item.product_name}
                  {item.model && <span className="font-normal text-navy-500"> · {item.model}</span>}
                </p>
                {item.sn && <p className="tabular font-mono text-xs wrap-anywhere text-navy-500">SN {item.sn}</p>}
                {item.description && (
                  <p className="mt-1.5 leading-relaxed whitespace-pre-wrap wrap-anywhere text-navy-700">
                    {item.description}
                  </p>
                )}
                <AttachmentThumbs files={item.attachments} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {issue.description && (
        <div className="mt-4">
          {perItem && <p className="text-xs font-semibold text-navy-500">รายละเอียดเพิ่มเติม</p>}
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere text-navy-700">
            {issue.description}
          </p>
        </div>
      )}

      {/* ไฟล์ระดับเคส — เคสหลายรายการที่แจ้งก่อนแยกไฟล์ตามรายการ */}
      <AttachmentThumbs files={issue.attachments} />

      {issue.admin_note && (
        <div className="mt-5 flex gap-3 rounded-xl bg-brand-50/70 p-4 ring-1 ring-brand-100">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand-700">หมายเหตุจากเจ้าหน้าที่</p>
            <p className="mt-1 text-sm whitespace-pre-wrap wrap-anywhere text-navy-700">{issue.admin_note}</p>
          </div>
        </div>
      )}

      <p className="mt-5 border-t border-navy-100 pt-4 text-xs text-navy-400">
        ส่งคำขอเมื่อ {formatDateTime(issue.created_at)} · อัปเดตล่าสุด {formatDateTime(issue.updated_at)}
      </p>
    </Card>
  )
}

/** รูป/วิดีโอที่แนบ — ใช้ทั้งใต้แต่ละรายการสินค้าและไฟล์ระดับเคส */
function AttachmentThumbs({ files }: { files: Attachment[] }) {
  if (files.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {files.map((file) =>
        file.type === 'image' ? (
          <a key={file.url} href={file.url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.url}
              alt="ไฟล์แนบ"
              className="h-20 w-20 rounded-xl border border-navy-100 object-cover shadow-soft transition hover:opacity-80"
            />
          </a>
        ) : (
          <video key={file.url} src={file.url} controls className="h-20 rounded-xl border border-navy-100 shadow-soft" />
        )
      )}
    </div>
  )
}

/** ตำแหน่งของแต่ละสถานะบนแถบความคืบหน้า 3 ช่วง — resolved กับ closed ถือว่าถึงช่วงสุดท้ายเหมือนกัน */
const STATUS_STEP: Record<string, number> = { pending: 0, in_progress: 1, resolved: 2, closed: 2 }

function IssueProgress({ status }: { status: string }) {
  const current = STATUS_STEP[status] ?? 0
  const labels = ['รับเรื่องแล้ว', 'กำลังดำเนินการ', status === 'closed' ? 'ปิดเคส' : 'แก้ไขแล้ว']
  return (
    <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="ความคืบหน้าของคำขอ">
      {labels.map((label, index) => {
        const reached = index <= current
        return (
          <li key={label} aria-current={index === current ? 'step' : undefined}>
            <div className={`h-1.5 rounded-full ${reached ? 'bg-brand-500' : 'bg-navy-100'}`} />
            <p
              className={`mt-2 text-xs ${
                index === current ? 'font-semibold text-navy-900' : reached ? 'text-navy-500' : 'text-navy-300'
              }`}
            >
              {label}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
      <div className="min-w-0">
        <dt className="text-xs text-navy-400">{label}</dt>
        <dd className="mt-0.5 wrap-anywhere text-navy-900">{value}</dd>
      </div>
    </div>
  )
}
