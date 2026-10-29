'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CalendarDays,
  CheckCircle2,
  Inbox,
  ListChecks,
  MessageSquareText,
  Package,
  Phone,
  Plus,
  QrCode,
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
  formatDate,
  formatDateTime,
} from '@/components/ui'
import { readPrefill } from '@/lib/customer-link'
import { ISSUE_STATUS_LABEL } from '@/lib/display'
import { SITE } from '@/lib/site-content'

type Attachment = { type: string; url: string }

type Issue = {
  id: number
  case_number: string
  description: string
  status: string
  admin_note: string | null
  created_at: string
  updated_at: string
  attachments: Attachment[]
}

type Result = {
  registration: {
    sn: string
    product_name: string
    phone: string
    registered_at: string
  }
  issues: Issue[]
}

/** สิ่งที่จะเห็นหลังค้นหา — โชว์ก่อนค้นหาให้รู้ว่าหน้านี้ใช้ทำอะไร */
const PREVIEW = [
  { icon: Package, title: 'ข้อมูลสินค้า', text: 'สินค้าและ Serial Number ที่ลงทะเบียนไว้' },
  { icon: ListChecks, title: 'ประวัติคำขอรับบริการ', text: 'ทุกเคสที่เคยแจ้ง พร้อมรูปและวิดีโอที่แนบ' },
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
  // ลิงก์ที่เจ้าหน้าที่ส่งมา (หน้าสร้าง QR) อาจกรอก SN ไว้ให้แล้ว เหลือเบอร์โทรที่ลูกค้าต้องกรอกเอง (ไม่ใส่เบอร์ลงลิงก์ — PDPA)
  const [form, setForm] = useState(() => ({ sn: readPrefill(searchParams).sn, phone: '' }))
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const params = new URLSearchParams({ sn: form.sn, phone: form.phone })
      const res = await fetch(`/api/issues/status?${params}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'ค้นหาไม่สำเร็จ')
        return
      }
      setResult(data)
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHero
        icon={Search}
        title="ตรวจสอบสถานะ"
        description="ค้นหาด้วย Serial Number และหมายเลขโทรศัพท์ที่ใช้ลงทะเบียน เพื่อดูข้อมูลสินค้าและความคืบหน้าของคำขอรับบริการ"
      />

      <PageBody className="max-w-4xl space-y-6">
        <Card className="p-6 shadow-soft-lg sm:p-8">
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Serial Number" required>
              <InputWithIcon
                icon={QrCode}
                value={form.sn}
                onChange={(e) => setForm({ ...form, sn: e.target.value.toUpperCase() })}
                placeholder={`เช่น ${SITE.examples.serial}`}
                className="font-mono"
                required
              />
            </Field>
            <Field label="หมายเลขโทรศัพท์" required>
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
          <>
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <Package className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-navy-400">สินค้าที่ลงทะเบียน</p>
                    <h2 className="text-lg font-semibold wrap-anywhere text-navy-900">{result.registration.product_name}</h2>
                  </div>
                </div>
                <Badge tone="green">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  ลงทะเบียนแล้ว
                </Badge>
              </div>
              <dl className="mt-6 grid gap-4 border-t border-navy-100 pt-5 sm:grid-cols-3">
                <Detail icon={QrCode} label="Serial Number" value={result.registration.sn} mono />
                <Detail icon={Phone} label="เบอร์โทร" value={result.registration.phone} mono />
                <Detail
                  icon={CalendarDays}
                  label="วันที่ลงทะเบียน"
                  value={formatDate(result.registration.registered_at)}
                />
              </dl>
            </Card>

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

              {result.issues.length === 0 ? (
                <Card className="flex flex-col items-center py-12 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-navy-300">
                    <Inbox className="h-7 w-7" strokeWidth={1.5} />
                  </span>
                  <p className="mt-4 font-medium text-navy-700">ยังไม่มีรายการแจ้งปัญหาสำหรับสินค้านี้</p>
                  <p className="mt-1 text-sm text-navy-400">หากพบอาการผิดปกติ แจ้งปัญหาพร้อมแนบรูปได้เลย</p>
                </Card>
              ) : (
                result.issues.map((issue) => (
                  <Card key={issue.id} className="p-6 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="tabular font-mono text-lg font-bold text-navy-900">{issue.case_number}</span>
                      <Badge tone={ISSUE_STATUS_TONE[issue.status]}>{ISSUE_STATUS_LABEL[issue.status]}</Badge>
                    </div>

                    <IssueProgress status={issue.status} />

                    <p className="mt-5 text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere text-navy-700">
                      {issue.description}
                    </p>

                    {issue.attachments.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {issue.attachments.map((file) =>
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
                            <video
                              key={file.url}
                              src={file.url}
                              controls
                              className="h-20 rounded-xl border border-navy-100 shadow-soft"
                            />
                          )
                        )}
                      </div>
                    )}

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
                      ส่งคำขอเมื่อ {formatDateTime(issue.created_at)} · อัปเดตล่าสุด{' '}
                      {formatDateTime(issue.updated_at)}
                    </p>
                  </Card>
                ))
              )}
            </section>
          </>
        )}
      </PageBody>
    </>
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
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
      <div className="min-w-0">
        <dt className="text-xs text-navy-400">{label}</dt>
        <dd className={`mt-0.5 wrap-anywhere text-navy-900 ${mono ? 'tabular font-mono' : ''}`}>{value}</dd>
      </div>
    </div>
  )
}
