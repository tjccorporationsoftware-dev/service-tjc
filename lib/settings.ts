import { execute, query } from '@/lib/db'

/**
 * ค่าตั้งค่าของระบบที่แอดมินแก้ได้จากหน้า "ตั้งค่า" (/admin/settings) — เก็บในตาราง `settings` แถวละ 1 ค่า
 *
 * company_name = ชื่อบริษัทของระบบชุดนี้ (TJC / TANGJAI / ART ...) ส่งไปกับทุกเคสใน /api/service/issues*
 * ให้ระบบแจ้งซ่อมของพนักงานรู้ว่าเคสมาจากบริษัทไหน — ค่าต่อชุด deploy จึงอยู่ใน DB ไม่ใช่ใน site-content.ts
 */
export type Settings = {
  company_name: string | null
}

const KEYS = ['company_name'] as const satisfies readonly (keyof Settings)[]

/** deploy โค้ดใหม่แล้วยังไม่ได้รัน db:init = ยังไม่มีตาราง settings */
export function isMissingSettingsTable(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && err.code === 'ER_NO_SUCH_TABLE')
}

/**
 * อ่านค่าทั้งหมด — ยังไม่มีตาราง (ลืมรัน db:init) ถือว่ายังไม่ได้ตั้งค่า แทนที่จะล้ม
 * เพราะ /api/service/issues* เรียกฟังก์ชันนี้ และระบบแจ้งซ่อมต้องดึงเคสได้ต่อแม้ยังไม่ได้ตั้งชื่อบริษัท
 */
export async function getSettings(): Promise<Settings> {
  const settings: Settings = { company_name: null }
  try {
    const rows = await query<{ setting_key: string; setting_value: string | null }>(
      `SELECT setting_key, setting_value FROM settings WHERE setting_key IN (${KEYS.map(() => '?').join(',')})`,
      [...KEYS]
    )
    for (const row of rows) {
      if ((KEYS as readonly string[]).includes(row.setting_key)) {
        settings[row.setting_key as keyof Settings] = row.setting_value || null
      }
    }
  } catch (err) {
    if (!isMissingSettingsTable(err)) throw err
  }
  return settings
}

/** บันทึกค่า — ค่าว่างเก็บเป็น NULL (= ไม่ได้ตั้ง) */
export async function saveSettings(values: { [K in keyof Settings]: string }) {
  for (const key of KEYS) {
    await execute(
      `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, values[key] || null]
    )
  }
}
