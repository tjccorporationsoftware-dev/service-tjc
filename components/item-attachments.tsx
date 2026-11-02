'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2, Video as VideoIcon } from 'lucide-react'
import { Alert } from '@/components/ui'
import { UPLOAD_LIMITS } from '@/lib/validations'

/**
 * ไฟล์แนบของสินค้าหนึ่งรายการในหน้าแจ้งปัญหา — ใบงานของระบบงาน (ServiceRequest.php) แยกไฟล์ตามรายการ
 * หน้าแจ้งปัญหาจึงแนบแยกตามรายการให้ตรงกัน: รูป/วิดีโอจำกัดจำนวน "ต่อรายการ" แต่ขนาดรวม "ทุกรายการ" ไม่เกิน
 * UPLOAD_LIMITS.totalMaxSize เพราะทั้งหมดส่งในคำขอเดียว (Cloudflare ตัดคำขอเกิน 100MB)
 */

/**
 * ระบุทั้ง MIME และนามสกุล เพราะเบราว์เซอร์บนมือถือบางตัวไม่รู้จัก MIME ของ HEIC
 * ถ้าใส่แต่ MIME รูปที่ถ่ายจาก iPhone จะถูกเทาไว้จนเลือกไม่ได้ในหน้าต่างเลือกไฟล์
 */
const IMAGE_ACCEPT =
  'image/jpeg,image/png,image/heic,image/heif,image/webp,.jpg,.jpeg,.png,.heic,.heif,.webp'
// .mov = คลิปจาก iPhone · .3gp/.webm = Android บางรุ่น/บางแอป — ต้องตรงกับ UPLOAD_LIMITS.video.mimeTypes
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/3gpp,video/webm,.mp4,.mov,.3gp,.webm'

const toMB = (bytes: number) => bytes / 1024 / 1024
export const sizeOf = (files: File[]) => files.reduce((sum, f) => sum + f.size, 0)
/** เตือนเมื่อรูป + วิดีโอทุกรายการรวมกันเกิน UPLOAD_LIMITS.totalMaxSize */
export const TOTAL_TOO_BIG = `ไฟล์แนบใหญ่เกินกำหนด — ${UPLOAD_LIMITS.totalLabel} กรุณาลดจำนวนรูปหรือใช้คลิปที่สั้นลง`
/** ใช้ถึงสัดส่วนนี้ของเพดานรวมแล้วเตือนว่าใกล้เต็ม (ส่วนที่เกินถูกกันไว้ตั้งแต่ตอนเลือกไฟล์) */
const NEAR_FULL_RATIO = 0.8

export type ItemFiles = { images: File[]; video: File | null }

/** ช่องคลิก/ลากไฟล์มาวาง ใช้ทั้งรูปและวิดีโอ */
const DROPZONE =
  'flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-navy-200 bg-white px-4 py-4 text-sm font-medium text-navy-500 transition hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60'

/** แถบพื้นที่ไฟล์แนบที่ใช้ไปรวมทุกรายการ — ปกติสีแบรนด์ ใกล้เต็มเปลี่ยนเป็นสีเหลืองพร้อมบอกว่าเหลืออีกเท่าไร */
export function AttachmentUsage({ bytes }: { bytes: number }) {
  const limitMB = toMB(UPLOAD_LIMITS.totalMaxSize)
  const usedMB = toMB(bytes)
  const nearFull = bytes >= UPLOAD_LIMITS.totalMaxSize * NEAR_FULL_RATIO
  const percent = Math.min(100, (bytes / UPLOAD_LIMITS.totalMaxSize) * 100)

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={nearFull ? 'font-medium text-amber-700' : 'text-navy-400'}>
          {nearFull
            ? `ใกล้เต็มแล้ว — เหลืออีก ${Math.max(0, limitMB - usedMB).toFixed(1)} MB`
            : 'พื้นที่ไฟล์แนบที่ใช้ไป (รวมทุกรายการ)'}
        </span>
        <span className="tabular shrink-0 text-navy-500">
          {usedMB.toFixed(1)} / {Math.round(limitMB)} MB
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="พื้นที่ไฟล์แนบที่ใช้ไป"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-100"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${nearFull ? 'bg-amber-500' : 'bg-brand-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/**
 * รูป + วิดีโอของสินค้าหนึ่งรายการ
 * otherBytes = ขนาดไฟล์ของรายการอื่นทั้งหมด — ใช้กันเกินเพดานรวมตั้งแต่ตอนเลือกไฟล์
 */
export function ItemAttachments({
  files,
  otherBytes,
  onChange,
}: {
  files: ItemFiles
  otherBytes: number
  onChange: (files: ItemFiles) => void
}) {
  const { images, video } = files
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [videoPreview, setVideoPreview] = useState('')
  // ข้อผิดพลาดตอนเลือกไฟล์ แสดงใต้ช่องของรายการนี้ — ลูกค้ากำลังมองตรงนั้น
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // สร้าง object URL ไว้แสดงพรีวิว แล้วคืนหน่วยความจำทุกครั้งที่ไฟล์เปลี่ยนหรือลบรายการ
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file))
    void Promise.resolve().then(() => setImagePreviews(urls))
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [images])

  useEffect(() => {
    if (!video) {
      void Promise.resolve().then(() => setVideoPreview(''))
      return
    }
    const url = URL.createObjectURL(video)
    void Promise.resolve().then(() => setVideoPreview(url))
    return () => URL.revokeObjectURL(url)
  }, [video])

  function addImages(fileList: FileList | null) {
    const incoming = Array.from(fileList ?? [])
    if (incoming.length === 0) return
    const combined = [...images, ...incoming]
    if (combined.length > UPLOAD_LIMITS.image.maxCount) {
      setError(UPLOAD_LIMITS.image.label)
      return
    }
    const tooBig = incoming.find((f) => f.size > UPLOAD_LIMITS.image.maxSize)
    if (tooBig) {
      setError(`รูป "${tooBig.name}" ใหญ่เกิน ${Math.round(toMB(UPLOAD_LIMITS.image.maxSize))}MB`)
      return
    }
    // เตือนตั้งแต่ก่อนส่ง (นับไฟล์ของรายการอื่นด้วย) ดีกว่าให้อัปโหลดไปจนครบแล้วค่อยโดนปฏิเสธ
    if (sizeOf(combined) + (video?.size ?? 0) + otherBytes > UPLOAD_LIMITS.totalMaxSize) {
      setError(TOTAL_TOO_BIG)
      return
    }
    setError('')
    onChange({ images: combined, video })
  }

  function setSingleVideo(fileList: FileList | null) {
    const file = fileList?.[0] ?? null
    if (file && file.size > UPLOAD_LIMITS.video.maxSize) {
      setError(`วิดีโอ "${file.name}" ใหญ่เกิน ${Math.round(toMB(UPLOAD_LIMITS.video.maxSize))}MB`)
      return
    }
    if (file && sizeOf(images) + file.size + otherBytes > UPLOAD_LIMITS.totalMaxSize) {
      setError(TOTAL_TOO_BIG)
      return
    }
    setError('')
    onChange({ images, video: file })
  }

  function handleDrop(kind: 'image' | 'video') {
    return (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault()
      if (kind === 'image') addImages(event.dataTransfer.files)
      else setSingleVideo(event.dataTransfer.files)
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-navy-700">รูปหรือวิดีโอของรายการนี้</p>
      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        onChange={(e) => {
          addImages(e.target.files)
          e.target.value = ''
        }}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        onChange={(e) => {
          setSingleVideo(e.target.files)
          e.target.value = ''
        }}
        className="hidden"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          onDrop={handleDrop('image')}
          onDragOver={(e) => e.preventDefault()}
          disabled={images.length >= UPLOAD_LIMITS.image.maxCount}
          className={DROPZONE}
        >
          <ImagePlus className="h-5 w-5 text-brand-600" />
          แนบรูป
          <span className="text-xs text-navy-300">
            {images.length}/{UPLOAD_LIMITS.image.maxCount} รูป
          </span>
        </button>

        {!video ? (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            onDrop={handleDrop('video')}
            onDragOver={(e) => e.preventDefault()}
            className={DROPZONE}
          >
            <VideoIcon className="h-5 w-5 text-brand-600" />
            แนบวิดีโอ
            <span className="text-xs text-navy-300">ไม่เกิน {UPLOAD_LIMITS.video.maxCount} คลิป</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-3">
            <video src={videoPreview} className="h-14 w-20 shrink-0 rounded-lg object-cover" muted />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy-700">{video.name}</p>
              <p className="text-xs text-navy-400">{toMB(video.size).toFixed(1)} MB</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange({ images, video: null })
                setError('')
              }}
              aria-label="ลบวิดีโอนี้"
              className="shrink-0 rounded-lg p-1.5 text-navy-400 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {imagePreviews.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {imagePreviews.map((url, index) => (
            <div key={url} className="relative h-16 w-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`ตัวอย่างรูปที่ ${index + 1}`}
                className="h-full w-full rounded-xl border border-navy-100 object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  onChange({ images: images.filter((_, i) => i !== index), video })
                  setError('')
                }}
                aria-label="ลบรูปนี้"
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white shadow-soft transition hover:bg-rose-700"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
    </div>
  )
}
