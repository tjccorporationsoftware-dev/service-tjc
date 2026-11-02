import { execute } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getSettings, isMissingSettingsTable, saveSettings } from '@/lib/settings'
import { settingsSchema, firstIssueMessage } from '@/lib/validations'

/**
 * GET /api/admin/settings — ค่าตั้งค่าปัจจุบัน
 * PUT /api/admin/settings — บันทึก (ตอนนี้มีแค่ชื่อบริษัทที่ส่งไปกับเคสใน /api/service/issues*)
 */

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  return Response.json({ settings: await getSettings() })
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }

  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 })
  }
  const { company_name } = parsed.data

  try {
    await saveSettings({ company_name })
  } catch (err) {
    if (isMissingSettingsTable(err)) {
      return Response.json(
        { error: 'ฐานข้อมูลยังไม่มีตารางตั้งค่า — ผู้ดูแลระบบต้องรัน npm run db:init ก่อน แล้วบันทึกอีกครั้ง' },
        { status: 503 }
      )
    }
    console.error('save settings failed:', err)
    return Response.json({ error: 'บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 500 })
  }

  await execute('INSERT INTO audit_logs (admin_id, action, detail) VALUES (?, ?, ?)', [
    auth.session.id,
    'settings.update',
    company_name ? `ตั้งชื่อบริษัทเป็น "${company_name}"` : 'ล้างชื่อบริษัท',
  ])

  return Response.json({ settings: { company_name: company_name || null } })
}
