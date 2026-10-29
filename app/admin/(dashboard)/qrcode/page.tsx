'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Mail,
  MessageCircle,
  MessageSquareText,
  RotateCcw,
  Share2,
} from 'lucide-react'
import { Alert, Button, Card, CardHeader, Field, Input, Select, Textarea } from '@/components/admin/ui'
import { buildCustomerLink, type Prefill } from '@/lib/customer-link'
import { SITE } from '@/lib/site-content'

/**
 * prefill = ช่องที่กรอกไว้ให้ลูกค้าในลิงก์ได้ (lib/customer-link.ts) · intro/subject = ข้อความตั้งต้นตอนส่งลิงก์ให้ลูกค้า
 * หน้าแจ้งปัญหา / เช็คสถานะ ลูกค้ายังต้องกรอกเบอร์โทรเอง — ห้ามใส่เบอร์ลงลิงก์ (PDPA)
 */
const DESTINATIONS = [
  {
    value: 'register',
    label: 'ลงทะเบียนผลิตภัณฑ์',
    path: '/register',
    prefill: 'product',
    subject: 'ลิงก์ลงทะเบียนสินค้า',
    intro: 'กรุณาลงทะเบียนสินค้าผ่านลิงก์ด้านล่าง เพื่อรับบริการหลังการขาย และแจ้งปัญหาได้ทันทีเมื่อต้องการ',
  },
  {
    value: 'report',
    label: 'แจ้งปัญหาการใช้งาน',
    path: '/report',
    prefill: 'sn',
    subject: 'ลิงก์แจ้งปัญหาการใช้งาน',
    intro: 'หากสินค้ามีปัญหาการใช้งาน แจ้งปัญหาพร้อมแนบรูปหรือวิดีโอได้ที่ลิงก์ด้านล่าง โดยใช้เบอร์โทรที่ลงทะเบียนไว้',
  },
  {
    value: 'status',
    label: 'ตรวจสอบสถานะ',
    path: '/status',
    prefill: 'sn',
    subject: 'ลิงก์ตรวจสอบสถานะงานบริการ',
    intro: 'ติดตามสถานะงานบริการได้ที่ลิงก์ด้านล่าง โดยใช้เบอร์โทรที่ลงทะเบียนไว้',
  },
  {
    value: 'home',
    label: 'หน้าแรก',
    path: '/',
    prefill: 'none',
    subject: 'ลิงก์ศูนย์บริการหลังการขาย',
    intro: 'ลงทะเบียนสินค้า แจ้งปัญหา และติดตามสถานะงานบริการได้ที่ลิงก์ด้านล่าง',
  },
  {
    value: 'custom',
    label: 'กำหนดเอง…',
    path: '',
    prefill: 'none',
    subject: 'ข้อมูลจากฝ่ายบริการหลังการขาย',
    intro: 'รายละเอียดเพิ่มเติมตามลิงก์ด้านล่าง',
  },
] as const

type Destination = (typeof DESTINATIONS)[number]['value']

const DEFAULT_INTROS = Object.fromEntries(DESTINATIONS.map((d) => [d.value, d.intro])) as Record<Destination, string>

const EMPTY_PREFILL: Prefill = { sn: '', product_name: '', product_brand: '', product_model: '' }

const SIZE_OPTIONS = [240, 320, 480, 640]

/** ปุ่มส่ง (ลิงก์ <a>) หน้าตาเดียวกับ Button variant="secondary" */
const SEND_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-700 transition ' +
  'hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-700'

/** หลังบ้านเปิดผ่านเครื่องตัวเอง / วง LAN — ลิงก์ที่สร้างจะชี้มาที่นี่ ลูกค้าข้างนอกเปิดไม่ได้ */
function isPrivateHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local') ||
    /^(127|10)\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  )
}

/** Clipboard API ใช้ได้เฉพาะ https / localhost — เปิดผ่าน http ทาง IP ให้ถอยไปใช้ execCommand */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

export default function QrCodePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [origin, setOrigin] = useState('')
  const [canShare, setCanShare] = useState(false)
  const [destination, setDestination] = useState<Destination>('register')
  const [customPath, setCustomPath] = useState('/register')
  const [prefill, setPrefill] = useState<Prefill>(EMPTY_PREFILL)
  const [intros, setIntros] = useState(DEFAULT_INTROS)
  const [size, setSize] = useState(320)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'link' | 'message' | null>(null)

  // window / navigator ใช้ได้เฉพาะฝั่ง client — ต้องรอ mount ก่อนถึงจะรู้ origin จริง
  // (เช่น http://localhost:3000 ตอน dev หรือ IP วง LAN ตอนทดสอบสแกนจากมือถือ)
  useEffect(() => {
    void Promise.resolve().then(() => {
      setOrigin(window.location.origin)
      setCanShare(typeof navigator.share === 'function')
    })
  }, [])

  const target = DESTINATIONS.find((d) => d.value === destination)!
  const sn = prefill.sn.trim()
  const productText = [prefill.product_name, prefill.product_brand, prefill.product_model]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ')

  const customRaw = customPath.trim()
  const targetUrl = !origin
    ? ''
    : destination === 'custom'
      ? /^https?:\/\//i.test(customRaw)
        ? customRaw
        : `${origin}${customRaw.startsWith('/') ? customRaw : `/${customRaw}`}`
      : buildCustomerLink(
          origin,
          target.path,
          target.prefill === 'product' ? prefill : target.prefill === 'sn' ? { sn } : {}
        )

  const intro = intros[destination]
  const message = [
    intro.trim(),
    target.prefill !== 'none' && sn ? `Serial Number: ${sn.toUpperCase()}` : '',
    target.prefill === 'product' && productText ? `สินค้า: ${productText}` : '',
    targetUrl,
  ]
    .filter(Boolean)
    .join('\n')

  const localHost = origin && isPrivateHost(new URL(origin).hostname) ? new URL(origin).host : ''

  useEffect(() => {
    if (!canvasRef.current || !targetUrl) return
    setError('')
    QRCode.toCanvas(canvasRef.current, targetUrl, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#101823', light: '#ffffff' },
    }).catch(() => setError('สร้าง QR Code ไม่สำเร็จ — ลิงก์อาจไม่ถูกต้อง'))
  }, [targetUrl, size])

  function changePrefill(field: keyof Prefill, value: string) {
    setPrefill((current) => ({ ...current, [field]: value }))
  }

  function downloadPng() {
    const canvas = canvasRef.current
    if (!canvas || !targetUrl) return
    const link = document.createElement('a')
    link.download = `qrcode-${destination}${target.prefill !== 'none' && sn ? `-${sn.toUpperCase()}` : ''}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function copy(kind: 'link' | 'message') {
    if (!targetUrl) return
    const ok = await copyText(kind === 'link' ? targetUrl : message)
    if (!ok) {
      setError('คัดลอกไม่สำเร็จ — กรุณาเลือกข้อความแล้วคัดลอกเอง')
      return
    }
    setCopied(kind)
    setTimeout(() => setCopied(null), 1500)
  }

  async function share() {
    try {
      await navigator.share({ title: target.subject, text: message })
    } catch {
      // ผู้ใช้กดปิดหน้าต่างแชร์ — ไม่ต้องแจ้งอะไร
    }
  }

  const encodedMessage = encodeURIComponent(message)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">สร้าง QR Code และลิงก์</h1>
        <p className="mt-0.5 text-sm text-navy-400">
          สร้างคิวอาร์โค้ดสำหรับพิมพ์บนฉลากสินค้าหรือเอกสาร หรือสร้างลิงก์ส่งให้ลูกค้าทาง LINE / SMS / อีเมล
          — กรอก Serial Number ไว้ล่วงหน้าได้ ลูกค้าไม่ต้องพิมพ์เอง
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {localHost && (
        <Alert tone="warning">
          ตอนนี้เปิดหลังบ้านผ่าน <span className="font-mono">{localHost}</span> — ลิงก์และ QR Code จะชี้มาที่เครื่องนี้
          ลูกค้าที่อยู่นอกเครือข่ายจะเปิดไม่ได้ ก่อนส่งให้ลูกค้าจริงให้เข้าหลังบ้านผ่านโดเมนของเว็บไซต์
        </Alert>
      )}

      {/* grid-cols-1 / minmax(0,…) — ลิงก์ยาว ๆ (truncate) ต้องไม่ดันคอลัมน์ให้กว้างจนการ์ด QR หลุดจอหรือหน้าล้นบนมือถือ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="ตั้งค่าปลายทาง" />
          <div className="space-y-4">
            <Field label="หน้าที่ต้องการเชื่อมโยง" required>
              <Select
                value={destination}
                onChange={(e) => setDestination(e.target.value as Destination)}
              >
                {DESTINATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>

            {destination === 'custom' && (
              <Field label="พาธหรือ URL" hint="เช่น /register หรือ https://example.com/promo">
                <Input
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="/register"
                />
              </Field>
            )}

            {target.prefill !== 'none' && (
              <div className="space-y-4 rounded-xl border border-dashed border-navy-200 p-4">
                <div>
                  <p className="text-sm font-medium text-navy-700">กรอกไว้ให้ลูกค้า (ไม่บังคับ)</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-navy-400">
                    ลูกค้าเปิดลิงก์แล้วช่องเหล่านี้จะกรอกไว้ให้ แก้ไขได้ตามจริง ส่วนชื่อ เบอร์โทร และอีเมลลูกค้ากรอกเองเสมอ
                    (ไม่ใส่ข้อมูลส่วนตัวลงในลิงก์)
                  </p>
                </div>
                <Field label="Serial Number">
                  <Input
                    value={prefill.sn}
                    onChange={(e) => changePrefill('sn', e.target.value.toUpperCase())}
                    placeholder={`เช่น ${SITE.examples.serial}`}
                    className="font-mono"
                    maxLength={50}
                  />
                </Field>
                {target.prefill === 'product' && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="ชื่อสินค้า">
                      <Input
                        value={prefill.product_name}
                        onChange={(e) => changePrefill('product_name', e.target.value)}
                        placeholder={`เช่น ${SITE.examples.productName}`}
                        maxLength={255}
                      />
                    </Field>
                    <Field label="ยี่ห้อ">
                      <Input
                        value={prefill.product_brand}
                        onChange={(e) => changePrefill('product_brand', e.target.value)}
                        placeholder={`เช่น ${SITE.examples.brand}`}
                        maxLength={100}
                      />
                    </Field>
                    <Field label="รุ่น">
                      <Input
                        value={prefill.product_model}
                        onChange={(e) => changePrefill('product_model', e.target.value)}
                        placeholder={`เช่น ${SITE.examples.model}`}
                        maxLength={100}
                      />
                    </Field>
                  </div>
                )}
                {target.prefill === 'product' && (
                  <p className="text-xs leading-relaxed text-navy-400">
                    ถ้า Serial Number นี้ผูกผลิตภัณฑ์ไว้ในระบบแล้ว หน้าลงทะเบียนจะใช้ข้อมูลสินค้าตามระบบแทน ·
                    ชื่อภาษาไทยทำให้ลิงก์ยาวขึ้นมาก (อักษรไทยถูกแปลงเป็นรหัสในลิงก์) ถ้าอยากได้ลิงก์สั้นใส่แค่ Serial Number ก็พอ
                  </p>
                )}
              </div>
            )}

            <Field
              label="ขนาด QR Code (พิกเซล)"
              hint="ยิ่งใหญ่ยิ่งพิมพ์คมชัด แนะนำ 320px ขึ้นไปสำหรับพิมพ์สติกเกอร์"
            >
              <Select value={String(size)} onChange={(e) => setSize(Number(e.target.value))}>
                {SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s} × {s}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="rounded-xl border border-navy-100 bg-navy-50/60 px-4 py-3">
              <p className="text-xs font-medium text-navy-400">ลิงก์ปลายทาง</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-mono text-sm text-navy-800" title={targetUrl}>
                  {targetUrl || '—'}
                </p>
                <button
                  type="button"
                  onClick={() => copy('link')}
                  disabled={!targetUrl}
                  className="shrink-0 text-navy-400 transition hover:text-brand-600 disabled:opacity-40"
                  aria-label="คัดลอกลิงก์"
                >
                  {copied === 'link' ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                {targetUrl && (
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-navy-400 transition hover:text-brand-600"
                    aria-label="เปิดลิงก์ในแท็บใหม่"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col items-center gap-4">
          <canvas ref={canvasRef} className="max-w-full rounded-xl border border-navy-100 shadow-soft" />
          <Button onClick={downloadPng} disabled={!targetUrl} className="w-full">
            <Download className="h-4 w-4" />
            ดาวน์โหลด PNG
          </Button>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="ส่งลิงก์ให้ลูกค้า"
          description="ข้อความด้านล่างแนบ Serial Number และลิงก์ให้อัตโนมัติ แก้ไขข้อความนำได้ตามต้องการ"
          action={
            intro !== DEFAULT_INTROS[destination] && (
              <Button
                variant="ghost"
                onClick={() => setIntros((current) => ({ ...current, [destination]: DEFAULT_INTROS[destination] }))}
              >
                <RotateCcw className="h-4 w-4" />
                ใช้ข้อความตั้งต้น
              </Button>
            )
          }
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Field label="ข้อความนำ">
              <Textarea
                rows={3}
                value={intro}
                onChange={(e) => setIntros((current) => ({ ...current, [destination]: e.target.value }))}
                maxLength={500}
              />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium text-navy-700">ตัวอย่างข้อความที่ลูกค้าจะได้รับ</p>
              <p className="rounded-xl border border-navy-100 bg-navy-50/60 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-navy-800 wrap-anywhere">
                {message || '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button onClick={() => copy('message')} disabled={!targetUrl}>
              {copied === 'message' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === 'message' ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}
            </Button>
            {canShare && (
              <Button variant="secondary" onClick={share} disabled={!targetUrl}>
                <Share2 className="h-4 w-4" />
                แชร์…
              </Button>
            )}
            {targetUrl && (
              <>
                <a
                  href={`https://line.me/R/share?text=${encodedMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={SEND_CLASS}
                >
                  <MessageCircle className="h-4 w-4" />
                  ส่งทาง LINE
                </a>
                <a href={`sms:?&body=${encodedMessage}`} className={SEND_CLASS}>
                  <MessageSquareText className="h-4 w-4" />
                  ส่ง SMS
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(target.subject)}&body=${encodedMessage}`}
                  className={SEND_CLASS}
                >
                  <Mail className="h-4 w-4" />
                  ส่งอีเมล
                </a>
              </>
            )}
            <p className="mt-1 text-xs leading-relaxed text-navy-400">
              ปุ่ม LINE / SMS / อีเมล จะเปิดแอปในเครื่องพร้อมข้อความ ให้เลือกผู้รับแล้วกดส่งเอง — SMS ใช้ได้บนมือถือ
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
