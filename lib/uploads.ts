import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { UPLOAD_LIMITS } from './validations'

/**
 * เก็บไฟล์แนบไว้นอก public/ แล้วเสิร์ฟผ่าน /api/files/*
 * เหตุผล: public/ ถูก snapshot ตอน build (ไฟล์ที่อัปโหลดหลัง build อาจไม่ถูกเสิร์ฟ)
 * และการผ่าน route handler ทำให้ควบคุมสิทธิ์การเข้าถึงได้ในอนาคต
 */
export const UPLOAD_ROOT = path.join(process.cwd(), 'uploads')

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heic', // เก็บเป็น .heic ตัวเดียว — สองชนิดนี้คือรูปแบบเดียวกัน ต่างแค่ชื่อที่ระบบส่งมา
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov', // วิดีโอจาก iPhone
  'video/3gpp': '3gp',
  'video/webm': 'webm',
}

/**
 * นามสกุล → MIME ใช้ตอนที่เบราว์เซอร์ไม่บอกชนิดไฟล์มา
 * มือถือบางรุ่น/บางเบราว์เซอร์ส่ง HEIC มาเป็น '' หรือ 'application/octet-stream'
 * ถ้าดูแค่ file.type อย่างเดียวจะปฏิเสธรูปที่ถ่ายจาก iPhone ทิ้งไปทั้งที่ไฟล์ใช้ได้
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  heif: 'image/heif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  '3gp': 'video/3gpp',
  webm: 'video/webm',
}

/** ชนิดไฟล์ที่แท้จริง — เชื่อ file.type ก่อน ถ้าไม่บอกมาค่อยเดาจากนามสกุล */
export function resolveMimeType(file: File): string {
  const declared = (file.type || '').toLowerCase()
  if (declared && declared !== 'application/octet-stream' && EXTENSION_BY_MIME[declared]) {
    return declared
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return MIME_BY_EXTENSION[ext] ?? declared
}

export type SavedUpload = {
  fileType: 'image' | 'video'
  /** path แบบ relative ที่เก็บลง DB เช่น 2026/07/uuid.jpg */
  filePath: string
  originalName: string
  fileSize: number
}

export class UploadError extends Error {}

/** ไบต์ต้นไฟล์ที่ต้องอ่านเพื่อดูลายเซ็น — กล่อง ftyp ของ MP4/MOV/HEIC อยู่ที่ offset 4 */
const SNIFF_BYTES = 16

const startsWith = (buf: Uint8Array, bytes: number[], offset = 0) =>
  bytes.every((b, i) => buf[offset + i] === b)
const ascii = (buf: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...buf.subarray(offset, offset + length))

/** ชนิดย่อย (brand) ในกล่อง ftyp ของไฟล์ตระกูล ISO Base Media — ตัวที่รูป/คลิปจากมือถือใช้จริง */
const FTYP_BRANDS: Record<string, readonly string[]> = {
  'image/heic': ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'],
  'image/heif': ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'],
  'video/mp4': ['isom', 'iso2', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'dash', 'M4V ', 'M4A ', 'f4v ', 'hvc1'],
  'video/quicktime': ['qt  '],
  'video/3gpp': ['3gp4', '3gp5', '3gp6', '3gp7', '3ge6', '3ge7', '3gg6', '3gr6', '3gs6'],
}

/**
 * เนื้อไฟล์ตรงกับชนิดที่อ้างไหม — file.type และนามสกุลเป็นค่าที่ฝั่งส่งตั้งเองได้ จึงดู magic bytes ด้วย
 * ไม่ตรง = ปฏิเสธ (กันไฟล์แปลกปลอมในชื่อ .jpg/.mp4 ถูกเก็บแล้วส่งต่อไปเครื่องพนักงานผ่านใบงาน)
 * ตระกูล ftyp ยอมให้ brand ของ MP4/MOV/3GP สลับกันได้ เพราะมือถือแต่ละยี่ห้อตั้งชื่อชนิดไฟล์ไม่ตรงกับ brand เสมอ
 */
export function matchesMagicBytes(head: Uint8Array, mime: string): boolean {
  switch (mime) {
    case 'image/jpeg':
      return startsWith(head, [0xff, 0xd8, 0xff])
    case 'image/png':
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'image/webp':
      return ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 4) === 'WEBP'
    case 'video/webm':
      return startsWith(head, [0x1a, 0x45, 0xdf, 0xa3])
    case 'image/heic':
    case 'image/heif':
    case 'video/mp4':
    case 'video/quicktime':
    case 'video/3gpp': {
      if (ascii(head, 4, 4) !== 'ftyp') return false
      const brand = ascii(head, 8, 4)
      const video = [...FTYP_BRANDS['video/mp4'], ...FTYP_BRANDS['video/quicktime'], ...FTYP_BRANDS['video/3gpp']]
      return (mime.startsWith('image/') ? FTYP_BRANDS[mime] : video).includes(brand)
    }
    default:
      return false
  }
}

export async function saveUpload(file: File, kind: 'image' | 'video'): Promise<SavedUpload> {
  const limits = UPLOAD_LIMITS[kind]

  const mime = resolveMimeType(file)
  if (!(limits.mimeTypes as readonly string[]).includes(mime)) {
    throw new UploadError(`ชนิดไฟล์ไม่รองรับ — ต้องเป็น ${limits.label}`)
  }
  if (file.size > limits.maxSize) {
    throw new UploadError(`ไฟล์ "${file.name}" ใหญ่เกินกำหนด — ${limits.label}`)
  }
  if (file.size === 0) {
    throw new UploadError(`ไฟล์ "${file.name}" ว่างเปล่า`)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (!matchesMagicBytes(buffer.subarray(0, SNIFF_BYTES), mime)) {
    throw new UploadError(`ไฟล์ "${file.name}" ไม่ใช่${kind === 'image' ? 'รูปภาพ' : 'วิดีโอ'}ชนิดที่ระบุ — ${limits.label}`)
  }

  // ตั้งชื่อไฟล์ใหม่เองทั้งหมด ไม่แตะชื่อเดิมจากผู้ใช้ → กัน path traversal
  const now = new Date()
  const dir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
  const ext = EXTENSION_BY_MIME[mime]
  const name = `${randomUUID()}.${ext}`
  const relativePath = `${dir}/${name}`

  await mkdir(path.join(UPLOAD_ROOT, dir), { recursive: true })
  await writeFile(path.join(UPLOAD_ROOT, dir, name), buffer)

  return {
    fileType: kind,
    filePath: relativePath,
    originalName: file.name.slice(0, 255),
    fileSize: file.size,
  }
}

/** แปลง path ใน DB เป็น URL ที่เปิดดูได้ */
export function fileUrl(filePath: string): string {
  return `/api/files/${filePath}`
}

/** คลี่ path ที่ผู้ใช้ส่งมาแล้วยืนยันว่ายังอยู่ใน UPLOAD_ROOT */
export function resolveUploadPath(segments: string[]): string | null {
  const resolved = path.resolve(UPLOAD_ROOT, ...segments)
  const root = path.resolve(UPLOAD_ROOT)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null
  return resolved
}

export const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  '3gp': 'video/3gpp',
  webm: 'video/webm',
}
