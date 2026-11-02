'use client'

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Alert, Button, Card, CardHeader, Field, Input } from '@/components/admin/ui'
import { useApiList } from '@/lib/use-api-list'
import type { Settings } from '@/lib/settings'

type SettingsResponse = { settings: Settings }

export default function SettingsPage() {
  const { data, loading, error } = useApiList<SettingsResponse>('/api/admin/settings')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">ตั้งค่าระบบ</h1>
        <p className="mt-0.5 text-sm text-navy-400">ค่าที่ใช้กับทั้งระบบชุดนี้</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <Card>
          <div className="flex items-center gap-2 text-sm text-navy-400">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
          </div>
        </Card>
      ) : (
        // ฟอร์มตั้งค่าเริ่มจากค่าที่โหลดมา — แยกเป็นคอมโพเนนต์ลูกเพื่อไม่ต้อง setState ใน effect
        data && <CompanyForm initial={data.settings} />
      )}
    </div>
  )
}

function CompanyForm({ initial }: { initial: Settings }) {
  const [companyName, setCompanyName] = useState(initial.company_name ?? '')
  const [saved, setSaved] = useState(initial.company_name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const trimmed = companyName.trim()
  const dirty = trimmed !== (saved ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: trimmed }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'บันทึกไม่สำเร็จ')
        return
      }
      setSaved(body.settings.company_name)
      setCompanyName(body.settings.company_name ?? '')
      setSuccess(
        body.settings.company_name
          ? `บันทึกแล้ว — เคสที่ระบบ service ดึงไปหลังจากนี้จะมีชื่อบริษัท "${body.settings.company_name}"`
          : 'ล้างชื่อบริษัทแล้ว — เคสที่ส่งไประบบ service จะไม่มีชื่อบริษัท'
      )
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="ข้อมูลบริษัท"
        description="ส่งไปพร้อมทุกเคสที่ระบบ service ของพนักงานดึงไปเปิดใบงาน ใช้แยกว่าเคสมาจากบริษัทไหน"
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}
        {!saved && !success && (
          <Alert tone="warning">ยังไม่ได้ตั้งชื่อบริษัท — เคสที่ส่งไประบบ service ตอนนี้จะไม่มีชื่อบริษัทติดไปด้วย</Alert>
        )}

        <Field label="ชื่อบริษัท" hint="เว้นว่างได้ — เคสจะถูกส่งไปโดยไม่มีชื่อบริษัท">
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="เช่น บริษัท ตัวอย่าง จำกัด"
            maxLength={255}
          />
        </Field>

        <div className="rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-3 text-sm">
          <p className="text-navy-500">ตัวอย่างที่ระบบ service จะได้รับในแต่ละเคส (หลังกดบันทึก)</p>
          <code className="mt-1 block font-mono text-[0.85rem] wrap-anywhere text-navy-800">
            &quot;company_name&quot;: {trimmed ? JSON.stringify(trimmed) : 'null'}
          </code>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            บันทึก
          </Button>
        </div>
      </form>
    </Card>
  )
}
