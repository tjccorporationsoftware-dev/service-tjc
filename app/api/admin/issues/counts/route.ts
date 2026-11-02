import { queryOne } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/** จำนวนเคสที่ยังต้องทำ — ป้ายตัวเลขบนเมนูหลังบ้าน (เรียกทุกครั้งที่เปลี่ยนหน้า จึงตอบแค่ตัวเลข) */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const row = await queryOne<{ pending: number | null; in_progress: number | null }>(
    `SELECT SUM(status = 'pending') AS pending, SUM(status = 'in_progress') AS in_progress
     FROM issue_reports`
  )

  return Response.json({ pending: Number(row?.pending ?? 0), in_progress: Number(row?.in_progress ?? 0) })
}
