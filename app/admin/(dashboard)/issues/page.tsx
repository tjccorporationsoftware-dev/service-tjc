'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Building2, FolderOpen, Inbox, Package, Paperclip, PencilLine } from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  ISSUE_STATUS_TONE,
  Pagination,
  Select,
  Textarea,
  formatDateTime,
} from '@/components/admin/ui'
import { WarrantyNote } from '@/components/warranty-note'
import { ISSUE_STATUS_LABEL } from '@/lib/display'
import { useApiList } from '@/lib/use-api-list'

type Attachment = { type: string; url: string }

type IssueItem = {
  id: number
  product_name: string
  model: string | null
  sn: string | null
  /** อาการของสินค้านี้ — เคสยุคก่อนเป็น null (อาการอยู่ที่ description ของเคส) */
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
  reporter_name: string | null
  reporter_phone: string | null
  reporter_email: string | null
  org_name: string | null
  org_province: string | null
  project_name: string | null
  project_code: string | null
  contract_no: string | null
  project_warranty_start: string | null
  project_warranty_end: string | null
  /** อยู่ในประกัน ณ วันแจ้ง · null = ไม่มีข้อมูลประกันของโครงการ */
  in_warranty: boolean | null
  items: IssueItem[]
  attachments: Attachment[]
}

type StatusCounts = { all: number; pending: number; in_progress: number; resolved: number; closed: number }

type ListResponse = {
  issues: Issue[]
  counts: StatusCounts
  meta: { total: number; page: number; total_pages: number }
}

type Filters = { search: string; status: string; warranty: string }

const EMPTY_META = { total: 0, page: 1, total_pages: 1 }

const WARRANTY_FILTERS = [
  { value: '', label: 'ทุกสถานะประกัน' },
  { value: 'in', label: 'อยู่ในประกัน ณ วันแจ้ง' },
  { value: 'expired', label: 'หมดประกัน ณ วันแจ้ง' },
  { value: 'none', label: 'ไม่มีข้อมูลประกัน' },
]

/**
 * เปิดพร้อมตัวกรองได้จาก query string (?status= / ?warranty= / ?search=) — หน้าภาพรวมลิงก์มาแบบนี้
 * key ผูกกับ query string ให้ตัวกรองเริ่มใหม่เมื่อกดลิงก์ที่ชี้มาหน้านี้ซ้ำด้วยตัวกรองอื่น
 */
export default function IssuesPage() {
  return (
    <Suspense>
      <IssuesFromUrl />
    </Suspense>
  )
}

function IssuesFromUrl() {
  const params = useSearchParams()
  return (
    <IssuesView
      key={params.toString()}
      initial={{
        search: params.get('search') ?? '',
        status: params.get('status') ?? '',
        warranty: params.get('warranty') ?? '',
      }}
    />
  )
}

function IssuesView({ initial }: { initial: Filters }) {
  const [filters, setFilters] = useState<Filters>(initial)
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState({ status: '', admin_note: '' })
  const [saving, setSaving] = useState(false)

  const url = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), per_page: '10' })
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    if (filters.warranty) params.set('warranty', filters.warranty)
    return `/api/admin/issues?${params}`
  }, [page, filters])

  const { data, loading, error: listError, reload } = useApiList<ListResponse>(url)
  const issues = data?.issues ?? []
  const meta = data?.meta ?? EMPTY_META

  // จำนวนบนแท็บค้างค่าเดิมไว้ระหว่างโหลด ไม่ให้แท็บกะพริบเป็นศูนย์ทุกครั้งที่พิมพ์ค้นหา
  const [counts, setCounts] = useState<StatusCounts | null>(null)
  if (data?.counts && data.counts !== counts) setCounts(data.counts)

  function updateFilters(next: Partial<Filters>) {
    setPage(1)
    setFilters({ ...filters, ...next })
  }

  function startEdit(issue: Issue) {
    setEditing(issue.id)
    setDraft({ status: issue.status, admin_note: issue.admin_note ?? '' })
  }

  async function save(issueId: number) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'อัปเดตไม่สำเร็จ')
        return
      }
      setError('')
      setEditing(null)
      reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">เคสแจ้งปัญหา</h1>
        <p className="mt-0.5 text-sm text-navy-400">
          เคสที่ลูกค้าแจ้งเข้ามา — อัปเดตสถานะและหมายเหตุที่ลูกค้าเห็นได้ที่นี่ (ระบบงานเปลี่ยนสถานะให้เองเมื่อรับเรื่อง/ปิดงาน)
        </p>
      </div>

      {(error || listError) && <Alert tone="error">{error || listError}</Alert>}

      <Card className="space-y-3">
        <div className="-mx-1 flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="สถานะเคส">
          {[['', 'ทั้งหมด'] as const, ...Object.entries(ISSUE_STATUS_LABEL)].map(([value, label]) => {
            const active = filters.status === value
            const count = counts ? counts[(value || 'all') as keyof StatusCounts] : null
            return (
              <button
                key={value}
                role="tab"
                aria-selected={active}
                onClick={() => updateFilters({ status: value })}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-navy-500 hover:bg-navy-50 hover:text-navy-800'
                }`}
              >
                {label}
                {count !== null && (
                  <span
                    className={`tabular rounded-full px-2 py-0.5 text-xs ${
                      active ? 'bg-brand-100 text-brand-700' : 'bg-navy-100 text-navy-600'
                    }`}
                  >
                    {count.toLocaleString('th-TH')}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Input
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="ค้นหา เลขเคส / หน่วยงาน / โครงการ / สินค้า / SN / ชื่อหรือเบอร์ผู้แจ้ง / อาการ…"
          />
          <Select value={filters.warranty} onChange={(e) => updateFilters({ warranty: e.target.value })}>
            {WARRANTY_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {loading && (
        <Card className="flex items-center justify-center py-12 text-sm text-navy-400">
          กำลังโหลด…
        </Card>
      )}
      {!loading && issues.length === 0 && (
        <Card className="flex flex-col items-center py-12 text-center">
          <Inbox className="mb-3 h-9 w-9 text-navy-200" strokeWidth={1.5} />
          <p className="text-sm text-navy-400">ไม่พบเคสตามเงื่อนไขที่เลือก</p>
        </Card>
      )}

      {!loading &&
        issues.map((issue) => (
          <Card key={issue.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              {/* basis-80: จอแคบให้วันที่ปัดลงบรรทัดใหม่ แทนการบีบข้อมูลเคสเหลือคอลัมน์แคบ ๆ */}
              <div className="min-w-0 grow basis-80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold text-navy-900">{issue.case_number}</span>
                  <Badge tone={ISSUE_STATUS_TONE[issue.status]}>
                    {ISSUE_STATUS_LABEL[issue.status]}
                  </Badge>
                  {issue.in_warranty !== null &&
                    (issue.in_warranty ? (
                      <Badge tone="green">อยู่ในประกัน ณ วันแจ้ง</Badge>
                    ) : (
                      <Badge tone="red">นอกประกัน ณ วันแจ้ง</Badge>
                    ))}
                  <span className="inline-flex items-center gap-1 text-xs text-navy-400">
                    <Package className="h-3.5 w-3.5" />
                    {issue.items.length} รายการ
                    {fileCount(issue) > 0 && (
                      <>
                        <Paperclip className="ml-1.5 h-3.5 w-3.5" />
                        ไฟล์แนบ {fileCount(issue)}
                      </>
                    )}
                  </span>
                </div>
                {issue.org_name && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-sm text-navy-700">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
                    <span>
                      {issue.org_name}
                      {issue.org_province && <span className="text-navy-400"> · {issue.org_province}</span>}
                    </span>
                  </p>
                )}
                {issue.project_name && (
                  <p className="flex items-start gap-1.5 text-sm text-navy-500">
                    <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
                    <span>
                      {issue.project_name}
                      {(issue.project_code || issue.contract_no) && (
                        <span className="text-navy-400">
                          {' '}
                          · {[issue.project_code, issue.contract_no && `สัญญา ${issue.contract_no}`].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                  </p>
                )}
                {issue.project_warranty_start && issue.project_warranty_end && (
                  <p className="mt-0.5 pl-5.5">
                    <WarrantyNote start={issue.project_warranty_start} end={issue.project_warranty_end} />
                  </p>
                )}
                <p className="mt-1 text-sm text-navy-500">
                  ผู้แจ้ง {issue.reporter_name || 'ไม่ระบุชื่อ'} · <span className="tabular">{issue.reporter_phone || '-'}</span>
                  {issue.reporter_email && <span> · {issue.reporter_email}</span>}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-navy-300">
                <div>แจ้ง {formatDateTime(issue.created_at)}</div>
                <div>อัปเดต {formatDateTime(issue.updated_at)}</div>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {issue.items.map((item, index) => (
                <li key={item.id} className="rounded-xl bg-navy-50/60 p-3.5 text-sm">
                  <p className="flex items-start gap-1.5 font-medium text-navy-900">
                    <Package className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
                    <span>
                      {issue.items.length > 1 && `${index + 1}. `}
                      {item.product_name}
                      {item.model && <span className="font-normal text-navy-500"> · {item.model}</span>}
                      {item.sn && <span className="font-mono font-normal text-navy-500"> · SN {item.sn}</span>}
                    </span>
                  </p>
                  {item.description && (
                    <p className="mt-1 pl-5.5 whitespace-pre-wrap text-navy-700">{item.description}</p>
                  )}
                  <div className="pl-5.5">
                    <AttachmentThumbs files={item.attachments} />
                  </div>
                </li>
              ))}
            </ul>

            {issue.description && (
              <p className="mt-3 rounded-xl border border-navy-100 p-3.5 text-sm whitespace-pre-wrap text-navy-700">
                {issue.items.some((item) => item.description) && (
                  <span className="mb-1 block text-xs font-semibold text-navy-400">รายละเอียดเพิ่มเติมจากลูกค้า</span>
                )}
                {issue.description}
              </p>
            )}

            {/* ไฟล์ระดับเคส — เคสหลายรายการที่แจ้งก่อนแยกไฟล์ตามรายการ */}
            <AttachmentThumbs files={issue.attachments} />

            {editing === issue.id ? (
              <div className="mt-4 space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
                <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-navy-700">สถานะ</span>
                    <Select
                      value={draft.status}
                      onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                    >
                      {Object.entries(ISSUE_STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-navy-700">
                      หมายเหตุ (ลูกค้าเห็นข้อความนี้)
                    </span>
                    <Textarea
                      rows={3}
                      value={draft.admin_note}
                      onChange={(e) => setDraft({ ...draft, admin_note: e.target.value })}
                      placeholder="เช่น นัดรับเครื่องวันที่ … / เปลี่ยนอะไหล่เรียบร้อยแล้ว"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => save(issue.id)} disabled={saving}>
                    {saving ? 'กำลังบันทึก…' : 'บันทึก'}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(null)} disabled={saving}>
                    ยกเลิก
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={() => startEdit(issue)}>
                  <PencilLine className="h-4 w-4" />
                  อัปเดตสถานะ / หมายเหตุ
                </Button>
                {issue.admin_note && (
                  <p className="text-sm text-navy-400">
                    หมายเหตุ: <span className="text-navy-700">{issue.admin_note}</span>
                  </p>
                )}
              </div>
            )}
          </Card>
        ))}

      {!loading && issues.length > 0 && (
        <Card>
          <Pagination meta={meta} onChange={setPage} />
        </Card>
      )}
    </div>
  )
}

function fileCount(issue: Issue) {
  return issue.attachments.length + issue.items.reduce((sum, item) => sum + item.attachments.length, 0)
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
              className="h-24 w-24 rounded-xl border border-navy-100 object-cover shadow-soft transition hover:opacity-80"
            />
          </a>
        ) : (
          // คลิป .mov จาก iPhone บางไฟล์เป็น HEVC ซึ่ง Chrome บางเครื่องเล่นในหน้าไม่ได้ — มีลิงก์ให้เปิด/โหลดไฟล์เสมอ
          <div key={file.url} className="flex flex-col items-start gap-1">
            <video src={file.url} controls className="h-24 rounded-xl border border-navy-100 shadow-soft" />
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-navy-500 underline-offset-2 hover:text-brand-600 hover:underline"
            >
              เปิด/ดาวน์โหลดวิดีโอ
            </a>
          </div>
        )
      )}
    </div>
  )
}
