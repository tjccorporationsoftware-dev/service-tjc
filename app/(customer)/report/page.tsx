'use client'

import { Suspense, useEffect, useEffectEvent, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  House,
  ImagePlus,
  Lightbulb,
  Paperclip,
  Phone,
  QrCode,
  Search,
  Send,
  Trash2,
  Video as VideoIcon,
  Wrench,
} from 'lucide-react'
import {
  Alert,
  Button,
  Card,
  Field,
  FormSection,
  InputWithIcon,
  LinkButton,
  PageBody,
  PageHero,
  Textarea,
  TipCard,
  TipList,
} from '@/components/ui'
import { ErrorDialog } from '@/components/error-dialog'
import { readPrefill } from '@/lib/customer-link'
import { SITE } from '@/lib/site-content'
import { UPLOAD_LIMITS } from '@/lib/validations'

/**
 * ระบุทั้ง MIME และนามสกุล เพราะเบราว์เซอร์บนมือถือบางตัวไม่รู้จัก MIME ของ HEIC
 * ถ้าใส่แต่ MIME รูปที่ถ่ายจาก iPhone จะถูกเทาไว้จนเลือกไม่ได้ในหน้าต่างเลือกไฟล์
 */
const IMAGE_ACCEPT =
  'image/jpeg,image/png,image/heic,image/heif,image/webp,.jpg,.jpeg,.png,.heic,.heif,.webp'
// .mov = คลิปจาก iPhone · .3gp/.webm = Android บางรุ่น/บางแอป — ต้องตรงกับ UPLOAD_LIMITS.video.mimeTypes
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/3gpp,video/webm,.mp4,.mov,.3gp,.webm'

const toMB = (bytes: number) => bytes / 1024 / 1024
const sizeOf = (files: File[]) => files.reduce((sum, f) => sum + f.size, 0)
/** เตือนเมื่อรูป + วิดีโอรวมกันเกิน UPLOAD_LIMITS.totalMaxSize (Cloudflare ตัดคำขอเกิน 100MB) */
const TOTAL_TOO_BIG = `ไฟล์แนบใหญ่เกินกำหนด — ${UPLOAD_LIMITS.totalLabel} กรุณาลดจำนวนรูปหรือใช้คลิปที่สั้นลง`
/** ใช้ถึงสัดส่วนนี้ของเพดานรวมแล้วเตือนว่าใกล้เต็ม (ส่วนที่เกินถูกกันไว้ตั้งแต่ตอนเลือกไฟล์) */
const NEAR_FULL_RATIO = 0.8

/** แถบพื้นที่ไฟล์แนบที่ใช้ไป — ปกติสีแบรนด์ ใกล้เต็มเปลี่ยนเป็นสีเหลืองพร้อมบอกว่าเหลืออีกเท่าไร */
function AttachmentUsage({ bytes }: { bytes: number }) {
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
            : 'พื้นที่ไฟล์แนบที่ใช้ไป'}
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

/** ช่องคลิก/ลากไฟล์มาวาง ใช้ทั้งรูปและวิดีโอ */
const DROPZONE =
  'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50/40 px-4 py-6 text-sm font-medium text-navy-500 transition hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60'

/** ผลค้น SN จาก /api/sn/check */
type SnInfo = {
  registered: boolean
  /** มีข้อมูลติดต่อของลูกค้าผูกอยู่แล้ว — แจ้งปัญหาได้ */
  claimed: boolean
  product_name: string
}

type Success = {
  case_number: string
  product_name: string
  attachments: number
}

// useSearchParams ต้องอยู่ใต้ Suspense (เหมือนหน้า login แอดมิน)
export default function ReportPage() {
  return (
    <Suspense>
      <ReportForm />
    </Suspense>
  )
}

function ReportForm() {
  const searchParams = useSearchParams()
  // ลิงก์ที่เจ้าหน้าที่ส่งมา (หน้าสร้าง QR) อาจกรอก SN ไว้ให้แล้ว — ดู lib/customer-link.ts
  const [form, setForm] = useState(() => ({ sn: readPrefill(searchParams).sn, phone: '', description: '' }))
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [video, setVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState('')
  const [snInfo, setSnInfo] = useState<SnInfo | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  // ข้อความในหน้าต่างแจ้งเตือนกลางจอ (ErrorDialog) — ว่าง = ปิด
  const [popup, setPopup] = useState('')
  // ข้อผิดพลาดตอนเลือกไฟล์ แสดงในส่วนไฟล์แนบ — ลูกค้ากำลังมองตรงนั้น ไม่ใช่บนสุดของฟอร์ม
  const [fileError, setFileError] = useState('')
  const [success, setSuccess] = useState<Success | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // สร้าง object URL ไว้แสดงพรีวิว แล้วคืนหน่วยความจำทุกครั้งที่ไฟล์เปลี่ยนหรือออกจากหน้า
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

  // SN มากับลิงก์ — ตรวจครั้งเดียวตอนเปิดหน้า ลูกค้าเห็นทันทีว่าเครื่องนี้ลงทะเบียนแล้วหรือยัง
  const checkLinkedSn = useEffectEvent(() => {
    void checkSn()
  })
  const linkedSn = searchParams.get('sn')
  useEffect(() => {
    if (linkedSn) checkLinkedSn()
  }, [linkedSn])

  async function checkSn() {
    if (!form.sn.trim()) return
    setChecking(true)
    setSnInfo(null)
    try {
      const res = await fetch(`/api/sn/check?sn=${encodeURIComponent(form.sn)}`)
      const data = await res.json()
      setSnInfo(res.ok ? data : null)
      if (!res.ok) setError(data.error ?? 'ตรวจสอบ Serial Number ไม่สำเร็จ')
      else setError('')
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setChecking(false)
    }
  }

  function addImages(fileList: FileList | null) {
    const incoming = Array.from(fileList ?? [])
    if (incoming.length === 0) return
    const combined = [...images, ...incoming]
    if (combined.length > UPLOAD_LIMITS.image.maxCount) {
      setFileError(UPLOAD_LIMITS.image.label)
      return
    }
    const tooBig = incoming.find((f) => f.size > UPLOAD_LIMITS.image.maxSize)
    if (tooBig) {
      const mb = Math.round(UPLOAD_LIMITS.image.maxSize / 1024 / 1024)
      setFileError(`รูป "${tooBig.name}" ใหญ่เกิน ${mb}MB`)
      return
    }
    // เตือนตั้งแต่ก่อนส่ง (นับวิดีโอที่เลือกไว้ด้วย) ดีกว่าให้อัปโหลดไปจนครบแล้วค่อยโดนปฏิเสธ
    if (sizeOf(combined) + (video?.size ?? 0) > UPLOAD_LIMITS.totalMaxSize) {
      setFileError(TOTAL_TOO_BIG)
      return
    }
    setFileError('')
    setImages(combined)
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index))
    setFileError('')
  }

  function setSingleVideo(fileList: FileList | null) {
    const file = fileList?.[0] ?? null
    if (file && file.size > UPLOAD_LIMITS.video.maxSize) {
      setFileError(`วิดีโอ "${file.name}" ใหญ่เกิน ${Math.round(toMB(UPLOAD_LIMITS.video.maxSize))}MB`)
      return
    }
    if (file && sizeOf(images) + file.size > UPLOAD_LIMITS.totalMaxSize) {
      setFileError(TOTAL_TOO_BIG)
      return
    }
    setFileError('')
    setVideo(file)
  }

  function handleDrop(kind: 'image' | 'video') {
    return (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault()
      if (kind === 'image') addImages(event.dataTransfer.files)
      else setSingleVideo(event.dataTransfer.files)
    }
  }

  /** กดส่งไม่สำเร็จ — ขึ้นทั้ง Alert ในฟอร์ม และหน้าต่างกลางจอ (ลูกค้าอยู่ที่ปุ่มส่งท้ายฟอร์ม อาจไม่ได้เลื่อนขึ้นไปดู) */
  function fail(message: string) {
    setError(message)
    setPopup(message)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setFileError('')
    setSubmitting(true)

    const body = new FormData()
    body.set('sn', form.sn)
    body.set('phone', form.phone)
    body.set('description', form.description)
    images.forEach((file) => body.append('images', file))
    if (video) body.append('video', video)

    try {
      const res = await fetch('/api/issues', { method: 'POST', body })
      // Cloudflare ตอบ 413 เป็นหน้า HTML (อ่านเป็น JSON ไม่ได้) เมื่อคำขอใหญ่เกิน 100MB
      // ขึ้นในส่วนไฟล์แนบ ซึ่งอยู่เหนือปุ่มส่งพอดี
      if (res.status === 413) {
        setFileError(TOTAL_TOO_BIG)
        setPopup(TOTAL_TOO_BIG)
        return
      }
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) {
        fail(data?.error ?? 'แจ้งปัญหาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
        return
      }
      setSuccess(data.issue)
    } catch {
      fail('ส่งข้อมูลไม่สำเร็จ — ไฟล์อาจมีขนาดใหญ่เกินไป หรือการเชื่อมต่อขาดระหว่างส่ง')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <>
        <PageHero
          tone="success"
          icon={CheckCircle2}
          title="รับเรื่องเรียบร้อย"
          description="ทีมงานได้รับคำขอของท่านแล้ว กรุณาเก็บเลขที่เคสไว้เพื่อติดตามสถานะ"
        />
        <PageBody className="max-w-2xl">
          <Card className="p-6 text-center shadow-soft-lg sm:p-8">
            <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/60 px-6 py-7">
              <p className="text-sm text-navy-500">เลขที่เคส</p>
              <p className="tabular mt-1 font-mono text-3xl font-bold tracking-wide text-brand-700 sm:text-4xl">
                {success.case_number}
              </p>
            </div>
            <dl className="mt-6 grid gap-4 text-left sm:grid-cols-2">
              <div>
                <dt className="text-xs text-navy-400">ผลิตภัณฑ์</dt>
                <dd className="mt-0.5 wrap-anywhere text-navy-900">{success.product_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-navy-400">ไฟล์แนบ</dt>
                <dd className="mt-0.5 text-navy-900">{success.attachments} รายการ</dd>
              </div>
            </dl>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/status" size="lg" className="sm:flex-1">
                <Search className="h-4 w-4" />
                ติดตามสถานะเคส
              </LinkButton>
              <LinkButton href="/" variant="secondary" size="lg" className="sm:flex-1">
                <House className="h-4 w-4" />
                กลับหน้าแรก
              </LinkButton>
            </div>
          </Card>
        </PageBody>
      </>
    )
  }

  return (
    <>
      <ErrorDialog message={popup} title="ส่งคำขอไม่สำเร็จ" onClose={() => setPopup('')} />

      <PageHero
        icon={Wrench}
        title="แจ้งปัญหาการใช้งาน"
        description="อธิบายอาการพร้อมแนบรูปหรือวิดีโอ ทีมงานจะรับเรื่องและอัปเดตสถานะให้ติดตามได้ตลอด"
      />

      <PageBody className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <Card className="p-6 shadow-soft-lg sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && <Alert tone="error">{error}</Alert>}

            <FormSection
              number={1}
              title="ข้อมูลเครื่อง"
              hint="ใช้ Serial Number และหมายเลขโทรศัพท์เดียวกับที่ลงทะเบียนไว้"
            >
              <Field label="Serial Number" required>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <InputWithIcon
                      icon={QrCode}
                      value={form.sn}
                      onChange={(e) => setForm({ ...form, sn: e.target.value.toUpperCase() })}
                      onBlur={checkSn}
                      placeholder={`เช่น ${SITE.examples.serial}`}
                      className="font-mono"
                      maxLength={50}
                      required
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={checkSn} disabled={checking}>
                    {checking ? 'กำลังตรวจ…' : 'ตรวจสอบ'}
                  </Button>
                </div>
              </Field>

              {snInfo && !snInfo.claimed && (
                <Alert tone="warning">
                  Serial Number นี้ยังไม่ถูกลงทะเบียน กรุณา{' '}
                  <a href="/register" className="font-medium underline">
                    ลงทะเบียนสินค้า
                  </a>{' '}
                  ผูกเบอร์โทรของท่านก่อนแจ้งปัญหา
                </Alert>
              )}
              {snInfo?.claimed && <Alert tone="success">{snInfo.product_name} · ลงทะเบียนแล้ว</Alert>}

              <Field label="หมายเลขโทรศัพท์ที่ใช้ลงทะเบียน" required>
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
            </FormSection>

            <FormSection number={2} title="รายละเอียดปัญหา" divided>
              <Field
                label="อาการหรือปัญหาที่พบ"
                required
                hint="กรุณาอธิบายอาการที่พบอย่างละเอียด อย่างน้อย 10 ตัวอักษร"
              >
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5}
                  placeholder={SITE.examples.problem}
                  required
                />
              </Field>
            </FormSection>

            <FormSection
              number={3}
              title="ไฟล์แนบ"
              hint="ไม่บังคับ แต่ช่วยให้ทีมงานเห็นอาการจริงและแก้ไขได้ตรงจุด"
              divided
            >
              <Field label="แนบรูปถ่าย" hint={UPLOAD_LIMITS.image.label}>
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
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  onDrop={handleDrop('image')}
                  onDragOver={(e) => e.preventDefault()}
                  disabled={images.length >= UPLOAD_LIMITS.image.maxCount}
                  className={DROPZONE}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
                    <ImagePlus className="h-5 w-5" />
                  </span>
                  คลิกหรือลากรูปมาวางตรงนี้
                  <span className="text-xs text-navy-300">
                    เลือกแล้ว {images.length}/{UPLOAD_LIMITS.image.maxCount} รูป
                  </span>
                </button>

                {imagePreviews.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {imagePreviews.map((url, index) => (
                      <div key={url} className="group relative h-20 w-20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`ตัวอย่างรูปที่ ${index + 1}`}
                          className="h-full w-full rounded-xl border border-navy-100 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          aria-label="ลบรูปนี้"
                          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white shadow-soft transition hover:bg-rose-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>

              <Field label="แนบวิดีโอ" hint={UPLOAD_LIMITS.video.label}>
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
                {!video ? (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    onDrop={handleDrop('video')}
                    onDragOver={(e) => e.preventDefault()}
                    className={DROPZONE}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-soft">
                      <VideoIcon className="h-5 w-5" />
                    </span>
                    คลิกหรือลากวิดีโอมาวางตรงนี้
                  </button>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-navy-100 bg-navy-50/40 p-3">
                    <video src={videoPreview} className="h-14 w-20 rounded-lg object-cover" muted />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy-700">{video.name}</p>
                      <p className="text-xs text-navy-400">{(video.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideo(null)
                        setFileError('')
                      }}
                      aria-label="ลบวิดีโอนี้"
                      className="shrink-0 rounded-lg p-1.5 text-navy-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </Field>

              {fileError && <Alert tone="error">{fileError}</Alert>}

              {(images.length > 0 || video) && <AttachmentUsage bytes={sizeOf(images) + (video?.size ?? 0)} />}
            </FormSection>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting || (snInfo !== null && !snInfo.claimed)}
            >
              <Send className="h-5 w-5" />
              {submitting ? 'กำลังส่ง…' : 'ส่งคำขอรับบริการ'}
            </Button>
          </form>
        </Card>

        <aside className="space-y-4">
          <TipCard icon={ClipboardCheck} title="ยังไม่ได้ลงทะเบียน?">
            ต้องลงทะเบียนสินค้าก่อนจึงจะแจ้งปัญหาได้ ใช้เวลาเพียงไม่กี่นาที
            <Link
              href="/register"
              className="mt-3 flex w-fit items-center gap-1 font-semibold text-brand-600 transition hover:text-brand-700"
            >
              ลงทะเบียนสินค้า
              <ArrowRight className="h-4 w-4" />
            </Link>
          </TipCard>
          <TipCard icon={Lightbulb} title="แจ้งอย่างไรให้แก้ไขได้เร็ว">
            <TipList items={SITE.reportTips} />
          </TipCard>
          <TipCard icon={Paperclip} title="ไฟล์ที่แนบได้">
            <TipList items={[UPLOAD_LIMITS.image.label, UPLOAD_LIMITS.video.label, UPLOAD_LIMITS.totalLabel]} />
          </TipCard>
        </aside>
      </PageBody>
    </>
  )
}
