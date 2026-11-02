import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AdminShell } from '@/components/admin/sidebar'

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts กันไว้ชั้นหนึ่งแล้ว — ตรวจซ้ำตรงนี้ (defense in depth) เผื่อ proxy ถูกข้ามหรือ matcher เปลี่ยน
  const session = await getSession()
  if (!session) redirect('/admin/login')

  return (
    <AdminShell
      session={{
        username: session.username,
        displayName: session.displayName,
        role: session.role,
      }}
    >
      {children}
    </AdminShell>
  )
}
