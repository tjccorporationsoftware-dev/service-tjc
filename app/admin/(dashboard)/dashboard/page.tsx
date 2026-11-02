'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlarmClock,
  ArrowRight,
  Building2,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
  Timer,
} from 'lucide-react'
import { Badge, Card, ISSUE_STATUS_TONE, StatCard, formatDateTime } from '@/components/admin/ui'
import { ISSUE_STATUS_LABEL } from '@/lib/display'

type CaseSummary = {
  id: number
  case_number: string
  status: string
  created_at: string
  org_name: string | null
  project_name: string | null
  product_summary: string
  item_count: number
  /** อยู่ในประกัน ณ วันแจ้ง · null = ไม่มีข้อมูลประกันของโครงการ */
  in_warranty: boolean | null
}

type Stats = {
  issues: {
    total: number
    this_month: number
    pending: number
    in_progress: number
    resolved: number
    closed: number
  }
  open_warranty: { in: number; expired: number; none: number }
  stale: { days: number; count: number; cases: (CaseSummary & { days_waiting: number })[] }
  recent: CaseSummary[]
  top_orgs: { days: number; orgs: { org_name: string; count: number }[] }
}

/** ลิงก์ไปหน้าเคสพร้อมตัวกรอง — หน้าเคสอ่านค่าเริ่มต้นจาก query string */
function issuesHref(filters: Record<string, string>) {
  return `/admin/issues?${new URLSearchParams(filters)}`
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => (data.error ? setError(data.error) : setStats(data)))
      .catch(() => setError('โหลดข้อมูลไม่สำเร็จ'))
  }, [])

  if (error) return <Card>{error}</Card>
  if (!stats) {
    return (
      <Card className="flex items-center justify-center gap-2 py-12 text-navy-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        กำลังโหลด…
      </Card>
    )
  }

  const { issues } = stats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">ภาพรวมงานบริการ</h1>
        <p className="mt-0.5 text-sm text-navy-400">
          สรุปเคสแจ้งปัญหาจากลูกค้า — กดที่ตัวเลขหรือรายการเพื่อเปิดเคสที่เมนูเคสแจ้งปัญหา
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href={issuesHref({ status: 'pending' })} className="block rounded-2xl transition hover:-translate-y-0.5">
          <StatCard
            icon={Clock}
            label="รอดำเนินการ"
            value={issues.pending}
            hint={issues.pending > 0 ? 'ยังไม่มีผู้รับเรื่อง' : 'ไม่มีเคสค้างรับเรื่อง'}
            tone={issues.pending > 0 ? 'amber' : 'slate'}
          />
        </Link>
        <Link
          href={issuesHref({ status: 'in_progress' })}
          className="block rounded-2xl transition hover:-translate-y-0.5"
        >
          <StatCard icon={Timer} label="กำลังดำเนินการ" value={issues.in_progress} tone="brand" />
        </Link>
        <Link href={issuesHref({ status: 'resolved' })} className="block rounded-2xl transition hover:-translate-y-0.5">
          <StatCard
            icon={CheckCircle2}
            label="แก้ไขแล้ว"
            value={issues.resolved}
            hint={`ปิดเคสแล้ว ${issues.closed.toLocaleString('th-TH')} เคส`}
            tone="green"
          />
        </Link>
        <Link href="/admin/issues" className="block rounded-2xl transition hover:-translate-y-0.5">
          <StatCard
            icon={CalendarPlus}
            label="แจ้งเข้ามาเดือนนี้"
            value={issues.this_month}
            hint={`ทั้งหมด ${issues.total.toLocaleString('th-TH')} เคส`}
            tone="slate"
          />
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WarrantyBreakdown counts={stats.open_warranty} />
        <StaleCases stale={stats.stale} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="เคสล่าสุด" href="/admin/issues" linkLabel="ดูทั้งหมด" />
          {stats.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-navy-300">ยังไม่มีเคสแจ้งเข้ามา</p>
          ) : (
            <ul className="divide-y divide-navy-50">
              {stats.recent.map((issue) => (
                <li key={issue.id}>
                  <Link
                    href={issuesHref({ search: issue.case_number })}
                    className="-mx-2 flex flex-wrap items-start justify-between gap-2 rounded-xl px-2 py-3 transition hover:bg-navy-50/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-sm font-medium text-navy-900">{issue.case_number}</span>
                        <WarrantyBadge value={issue.in_warranty} />
                      </p>
                      <p className="mt-0.5 truncate text-sm text-navy-600">{issue.product_summary}</p>
                      {issue.org_name && <p className="truncate text-xs text-navy-400">{issue.org_name}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={ISSUE_STATUS_TONE[issue.status]}>{ISSUE_STATUS_LABEL[issue.status]}</Badge>
                      <span className="text-xs text-navy-300">{formatDateTime(issue.created_at)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle title={`หน่วยงานที่แจ้งบ่อย · ${stats.top_orgs.days} วัน`} />
          {stats.top_orgs.orgs.length === 0 ? (
            <p className="py-6 text-center text-sm text-navy-300">ยังไม่มีเคสที่ระบุหน่วยงานในช่วงนี้</p>
          ) : (
            <ol className="space-y-1">
              {stats.top_orgs.orgs.map((org) => (
                <li key={org.org_name}>
                  <Link
                    href={issuesHref({ search: org.org_name })}
                    className="-mx-2 flex items-start gap-2.5 rounded-xl px-2 py-2 text-sm transition hover:bg-navy-50/60"
                  >
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-navy-300" />
                    <span className="min-w-0 flex-1 text-navy-700">{org.org_name}</span>
                    <span className="tabular shrink-0 font-semibold text-navy-900">
                      {org.count.toLocaleString('th-TH')}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </section>
    </div>
  )
}

function SectionTitle({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-semibold text-navy-900">{title}</h2>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 transition hover:text-brand-700"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

/** ป้ายประกัน ณ วันแจ้ง — ไม่มีข้อมูลประกันไม่แสดงป้าย */
function WarrantyBadge({ value }: { value: boolean | null }) {
  if (value === null) return null
  return value ? <Badge tone="green">ในประกัน</Badge> : <Badge tone="red">นอกประกัน</Badge>
}

const WARRANTY_ROWS = [
  { key: 'in', label: 'อยู่ในประกัน', icon: ShieldCheck, iconTone: 'text-emerald-600', bar: 'bg-emerald-500' },
  { key: 'expired', label: 'หมดประกันแล้ว', icon: ShieldX, iconTone: 'text-rose-600', bar: 'bg-rose-500' },
  { key: 'none', label: 'ไม่มีข้อมูลประกัน', icon: ShieldQuestion, iconTone: 'text-navy-400', bar: 'bg-navy-300' },
] as const

/** เคสที่ยังเปิดอยู่แยกตามประกัน ณ วันแจ้ง — ใช้ตัดสินว่างานไหนคิดค่าบริการ */
function WarrantyBreakdown({ counts }: { counts: Stats['open_warranty'] }) {
  const total = counts.in + counts.expired + counts.none

  return (
    <Card>
      <SectionTitle title="เคสที่ยังเปิดอยู่ · ประกัน ณ วันแจ้ง" />
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-navy-300">ไม่มีเคสที่รอดำเนินการหรือกำลังดำเนินการ</p>
      ) : (
        <ul className="space-y-3">
          {WARRANTY_ROWS.map((row) => {
            const value = counts[row.key]
            const Icon = row.icon
            return (
              <li key={row.key}>
                <Link
                  href={issuesHref({ warranty: row.key })}
                  className="-mx-2 block rounded-xl px-2 py-1.5 transition hover:bg-navy-50/60"
                  title={`${row.label} ${value.toLocaleString('th-TH')} จาก ${total.toLocaleString('th-TH')} เคส`}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Icon className={`h-4 w-4 shrink-0 ${row.iconTone}`} />
                    <span className="flex-1 text-navy-700">{row.label}</span>
                    <span className="tabular font-semibold text-navy-900">{value.toLocaleString('th-TH')}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-50">
                    <div
                      className={`h-full rounded-full ${row.bar}`}
                      style={{ width: `${value === 0 ? 0 : Math.max(2, (value / total) * 100)}%` }}
                    />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-navy-400">
        นับจากวันรับประกันของโครงการในระบบงาน เทียบกับวันที่ลูกค้าแจ้ง — เคสที่ไม่ได้เลือกโครงการจะไม่มีข้อมูลประกัน
      </p>
    </Card>
  )
}

function StaleCases({ stale }: { stale: Stats['stale'] }) {
  return (
    <Card>
      <SectionTitle
        title={`รอรับเรื่องเกิน ${stale.days} วัน${stale.count > 0 ? ` (${stale.count.toLocaleString('th-TH')})` : ''}`}
        href={stale.count > 0 ? issuesHref({ status: 'pending' }) : undefined}
        linkLabel="ดูเคสรอดำเนินการ"
      />
      {stale.cases.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="mb-2 h-7 w-7 text-emerald-500" strokeWidth={1.75} />
          <p className="text-sm text-navy-400">ไม่มีเคสค้าง — ทุกเคสมีผู้รับเรื่องภายใน {stale.days} วัน</p>
        </div>
      ) : (
        <ul className="divide-y divide-navy-50">
          {stale.cases.map((issue) => (
            <li key={issue.id}>
              <Link
                href={issuesHref({ search: issue.case_number })}
                className="-mx-2 flex items-start justify-between gap-3 rounded-xl px-2 py-2.5 transition hover:bg-navy-50/60"
              >
                <div className="min-w-0">
                  <span className="font-mono text-sm font-medium text-navy-900">{issue.case_number}</span>
                  <p className="truncate text-sm text-navy-600">{issue.product_summary}</p>
                  {issue.org_name && <p className="truncate text-xs text-navy-400">{issue.org_name}</p>}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700">
                  <AlarmClock className="h-3.5 w-3.5" />
                  รอมา {issue.days_waiting.toLocaleString('th-TH')} วัน
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
