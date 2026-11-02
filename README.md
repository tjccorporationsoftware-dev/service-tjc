# ระบบลงทะเบียนสินค้า (Product Registration System)

Next.js 16 (App Router) + MariaDB — ครอบคลุมทั้งฝั่งลูกค้าและฝั่งแอดมิน

## เริ่มใช้งาน

ต้องเปิด **MariaDB ใน XAMPP** ไว้ก่อน จากนั้น:

```bash
npm install
npm run db:init    # สร้าง database + ตาราง + แอดมินคนแรก (ผลิตภัณฑ์ตัวอย่างเฉพาะเมื่อ SEED_PRODUCTS=true)
npm run dev        # http://localhost:3000
```

บัญชีแอดมินคนแรกถูกสร้างตอน `db:init` จากค่า `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` ใน `.env.local` — ต้องยาวอย่างน้อย 12 ตัวอักษร
และไม่ขึ้นต้นด้วย admin/password/1234 (สคริปต์ปฏิเสธ ไม่มีค่าเริ่มต้นแล้ว) ตั้งให้ต่างกันทุกชุด deploy และเปลี่ยนรหัสผ่านทันทีหลังขึ้นระบบจริง

### เปลี่ยนรหัสผ่านแอดมิน

```bash
npm run admin:password -- admin รหัสผ่านใหม่
```

> ⚠️ **ห้ามแก้ช่อง `password_hash` ผ่าน phpMyAdmin โดยตรง**
> ช่องนี้เก็บ **bcrypt hash** (60 ตัวอักษร ขึ้นต้นด้วย `$2b$`) ไม่ใช่รหัสผ่านดิบ
> ถ้าใส่รหัสผ่านดิบลงไป เช่น `1234` จะ login ไม่ได้ทันที เพราะ `bcrypt.compare()` เทียบไม่ตรง
> ให้ใช้คำสั่งด้านบนแทน แล้วระบบจะ hash ให้เอง

## หน้าจอในระบบ

**ฝั่งลูกค้า (public)**

| หน้า | URL | หน้าที่ |
|------|-----|---------|
| หน้าแรก | `/` | ทางเข้าแต่ละฟีเจอร์ |
| แจ้งปัญหา | `/report` | **หน้าเดียวจบ** — ค้นหน่วยงาน → เลือกโครงการ → สินค้าหลายรายการ (แต่ละรายการมี SN ไม่บังคับ + อาการ) → ผู้แจ้ง → รูป/วิดีโอ |
| เช็คสถานะ | `/status` | ค้นด้วยเลขที่เคสหรือ SN + เบอร์โทรที่ใช้แจ้ง (เห็นเฉพาะเคสที่แจ้งด้วยเบอร์นั้น) |
| (เดิม) ลงทะเบียน | `/register` | ส่งต่อไป `/report` พร้อม query เดิม — คงไว้ให้ QR / ลิงก์ที่แจกไปก่อนหน้ายังใช้ได้ |

`/report` รับ `?sn=&product=&brand=&model=` เติมสินค้ารายการแรกไว้ให้ · `/status` รับ `?case=` หรือ `?sn=`
(ลิงก์ที่สร้างจากหน้า `/admin/qrcode` — `lib/customer-link.ts`) ไม่มีพารามิเตอร์ชื่อ/เบอร์โทร/อีเมลโดยตั้งใจ (PDPA)

**ฝั่งแอดมิน (ต้อง login)**

| หน้า | URL | หน้าที่ |
|------|-----|---------|
| เข้าสู่ระบบ | `/admin/login` | |
| ภาพรวม | `/admin/dashboard` | สรุปเคสแจ้งปัญหา — จำนวนตามสถานะ, เคสที่ยังเปิดแยกตามประกัน ณ วันแจ้ง, เคสรอรับเรื่องเกิน 3 วัน, เคสล่าสุด, หน่วยงานที่แจ้งบ่อย 90 วัน |
| เคสแจ้งปัญหา | `/admin/issues?status=&warranty=&search=` | แท็บสถานะพร้อมจำนวน + กรองประกัน ณ วันแจ้ง + ค้นหา (รวมเลขเคส) · ดูรูป/วิดีโอรายสินค้า · อัปเดตสถานะและหมายเหตุ — เมนูมีตัวเลขเคสรอดำเนินการ |
| ลิงก์ & QR ส่งลูกค้า | `/admin/qrcode` | QR Code ไปหน้าลูกค้า (พิมพ์ฉลาก) + ลิงก์ส่งลูกค้าทาง LINE / SMS / อีเมล กรอก SN/สินค้าไว้ล่วงหน้าได้ |
| ตั้งค่า | `/admin/settings` | ชื่อบริษัทที่ส่งไปกับทุกเคสในระบบแจ้งซ่อมของพนักงาน (`company_name` ใน `/api/service/issues*`) |

หน้าหลังบ้านระบบเดิม (ผลิตภัณฑ์, Serial Number, ตั้งค่ารหัส SN, การลงทะเบียน, คู่มือ) ถูกตัดออกตอนเริ่มระบบใหม่ (พ.ย. 2026)
— ตาราง `products` / `serial_numbers` / `sn_schemes` / `registrations` ยังอยู่ใน DB และ `/api/products`, `/api/sn/check` ฝั่งลูกค้ายังอ่านอยู่

## API

**Public**

| Method | Endpoint |
|--------|----------|
| `GET` | `/api/products` |
| `GET` | `/api/sn/check?sn=` |
| `GET` | `/api/lookup/customers?q=` (ค้นหน่วยงานจากระบบงาน — ไม่ส่ง `q` = ถามว่าเปิดการค้นหาไว้ไหม) |
| `GET` | `/api/lookup/projects?customer_id=` (โครงการ + รายการสินค้าของหน่วยงาน) |
| `POST` | `/api/issues` (multipart/form-data — ช่อง `payload` = JSON ตาม `reportSchema` + `images` / `video`) |
| `GET` | `/api/issues/status?q=&phone=` (`q` = เลขที่เคสหรือ SN) |
| `GET` | `/api/files/*` (ไฟล์แนบ) |

**Admin** (ต้องมี session cookie)

| Method | Endpoint |
|--------|----------|
| `POST` | `/api/admin/login` · `/api/admin/logout` |
| `GET` | `/api/admin/issues?search=&status=&warranty=in\|expired\|none&page=` (ตอบ `counts` แยกสถานะไว้ทำแท็บ) |
| `GET` | `/api/admin/issues/counts` (จำนวนเคสรอดำเนินการ/กำลังดำเนินการ — ตัวเลขบนเมนู) |
| `PATCH` | `/api/admin/issues/:id` |
| `GET` | `/api/admin/stats` (ภาพรวมเคส) |
| `GET` `PUT` | `/api/admin/settings` |

## โครงสร้าง

```
app/
├── (customer)/          # หน้าลูกค้า + layout ของฝั่ง public
├── admin/
│   ├── login/
│   └── (dashboard)/     # หน้าที่ต้อง login — แยก route group เพื่อให้ login ไม่ติด layout นี้
└── api/                 # Route Handlers
lib/
├── db.ts                # MariaDB pool (mysql2) + helper query/execute/withTransaction
├── session-token.ts     # sign/verify JWT — แยกไว้ให้ proxy.ts ใช้ได้
├── auth.ts              # cookie helper + requireAdmin() สำหรับ route handler
├── issues.ts            # อ่านสินค้า/ไฟล์แนบของเคส + กติกาประกัน ณ วันแจ้ง (coveredAtReport / WARRANTY_SQL)
├── validations.ts       # Zod schemas + ข้อจำกัดไฟล์อัปโหลด
├── uploads.ts           # บันทึกไฟล์ + กัน path traversal
├── display.ts           # ป้ายสถานะ, เลขเคส, mask เบอร์โทร (PDPA)
├── rate-limit.ts        # rate limit endpoint public
└── use-api-list.ts      # hook ดึงข้อมูลตารางฝั่ง client
proxy.ts                 # ป้องกัน /admin/* และ /api/admin/*
db/schema.sql            # schema ทั้งหมด
scripts/init-db.mjs      # สร้าง DB + migration (+ ผลิตภัณฑ์ตัวอย่างเมื่อ SEED_PRODUCTS=true)
uploads/                 # ไฟล์แนบ (ไม่ commit)
```

## รายละเอียดที่ควรรู้

**รูปแบบ SN** — `WR-{PRODUCT_CODE}-{YYMM}-{RANDOM6}` เช่น `WR-TV43-2607-A3F9K2`
ชุดอักขระตัด `O` `0` `I` `1` ออกเพื่อไม่ให้อ่านสับสน และมี UNIQUE index กันซ้ำในระดับ DB

**ระบบประกันของเว็บนี้เลิกใช้แล้ว** — ไม่มีการตั้งระยะประกันต่อผลิตภัณฑ์/ต่อ SN อีก
คอลัมน์ `warranty_*` / `customer_reported_warranty_*` / `in_warranty` ยังอยู่ในฐานข้อมูลแต่ไม่มีโค้ดใช้แล้ว
(เหตุผลอยู่หัวไฟล์ `db/schema.sql`)

**วันรับประกันของโครงการ** (พ.ย. 2026) มาจากระบบงานแทน — `warranty_lookup_api.php` คำนวณจาก `projects`
แบบเดียวกับ `project_dashboard.php` (วันเริ่มประกัน + ระยะประกัน + วันส่งมอบ) ลูกค้าเห็นที่การ์ดโครงการ หน้าสำเร็จ และหน้าเช็คสถานะ
เคสเก็บค่าไว้ที่ `issue_reports.project_warranty_start/end` (เอาจากระบบงานตอนบันทึกเท่านั้น ไม่รับจากหน้าเว็บ) หลังบ้านแสดงพร้อมสถานะ ณ วันนี้

`/api/service/issues*` ส่ง `in_warranty` / `warranty_start` / `warranty_end` ของโครงการ (`in_warranty` นับ ณ วันที่ลูกค้าแจ้ง)
เคสที่ไม่มีข้อมูลประกันส่งค่าคงที่ `in_warranty: 0, warranty_start: null, warranty_end: null` แบบเดิม (`LEGACY_WARRANTY_FIELDS`)
เพราะระบบแจ้งซ่อม tjc-api อ่านฟิลด์เหล่านี้อยู่

**ข้อมูลที่ส่งไประบบแจ้งซ่อม** (`toServiceIssue()` ใน `lib/service-api.ts`) — ฟิลด์ชุดเดิมยังอยู่ชื่อเดิม
(`description` = อาการทุกรายการรวมเป็นข้อความเดียว, `sn` = SN แรกที่มี, `product_name` = สินค้าเดียวหรือ "… และอีก n รายการ")
และเพิ่ม `items[]` (สินค้า + SN + อาการรายการละชิ้น), `note` (รายละเอียดเพิ่มเติม), `org_name` / `org_province`,
`project_name` / `project_code` / `contract_no` — `ServiceRequest.php` ฝั่ง tjc-api ใช้เติมใบงาน 1 สินค้าต่อ 1 กล่อง
และ `project_year` = ปีของโครงการ (พ.ศ.) ที่ลูกค้าเลือก (`0` = ไม่แน่ใจ, `null` = เคสก่อนมีช่องนี้) — ขึ้นเป็นป้ายเด่นในกล่องเคสของ `service_dashboard.php`

**ปีของโครงการ** — ระบบงานมีแต่โครงการตั้งแต่ปี 2569 หน้าแจ้งปัญหาจึงให้ลูกค้าเลือกปี (2566 ถึงปีปัจจุบัน หรือ "ไม่แน่ใจ" — ปีต่ำสุดอยู่ที่ `PROJECT_YEAR_MIN` ใน `lib/display.ts` ปีใหม่เพิ่มเองตามปฏิทิน) เมื่อไม่ได้เลือกโครงการจากระบบงาน
ถ้าเลือกโครงการแล้ว server ใช้ปีของโครงการนั้นเอง (ไม่เชื่อค่าที่หน้าเว็บส่งมา) · เก็บที่ `issue_reports.project_year` · หลังบ้านค้นด้วยปีได้ (พิมพ์ `2567`)

**ชื่อบริษัทในเคสที่ส่งไประบบแจ้งซ่อม** — `/api/service/issues` และ `/api/service/issues/:id` ใส่ `company_name` ทุกเคส
ค่ามาจากหน้า "ตั้งค่า" ในหลังบ้าน (ตาราง `settings`) เป็น `null` ถ้ายังไม่ได้ตั้ง
deploy โค้ดชุดนี้แล้วต้องรัน `npm run db:init` หนึ่งครั้งเพื่อสร้างตาราง `settings` (ก่อนรัน API ยังทำงานได้ แค่ `company_name` เป็น `null` และหน้าตั้งค่าบันทึกไม่ได้)

**แจ้งปัญหาตามหน่วยงาน / โครงการ หลายสินค้าต่อเคส** (`POST /api/issues`)
ลูกค้าค้นหน่วยงานของตัวเอง → เลือกโครงการ → เลือกสินค้าจากรายการที่ส่งมอบในโครงการ (หรือพิมพ์เอง) กี่รายการก็ได้
แต่ละรายการมี SN (ไม่บังคับ — สินค้าบางชนิดไม่มี) และอาการของตัวเอง ทั้งหมดอยู่ในเลขที่เคสเดียว

- **ข้อมูลหน่วยงาน/โครงการ/สินค้า** มาจากระบบงานของพนักงาน (tjc-api — `project_dashboard.php` / `project_details.php`)
  ผ่าน `warranty_lookup_api.php` ฝั่งนั้น (`lib/tjc-api.ts`) — key ตัวเดียวกับ `SERVICE_API_KEY` บอกว่าเป็นบริษัทไหน
  จึงค้นเจอเฉพาะหน่วยงาน/โครงการของบริษัทนั้น ไม่มีราคา เบอร์โทร หรือที่อยู่ส่งออกมา
- **ตั้ง `TJC_API_URL`** (เช่น `https://tjc-api.example.com` — โฟลเดอร์ที่มี `warranty_lookup_api.php`) ใน `.env.local`
  ไม่ตั้ง = ปิดการค้นหา ลูกค้าพิมพ์หน่วยงาน/สินค้าเองได้ตามปกติ · ระบบงานล่ม = หน้าเว็บบอกให้พิมพ์เอง ไม่ปิดทางแจ้ง
- **ค้นไม่เจอ** → ลูกค้ากด "ใช้ชื่อตามที่พิมพ์" แล้วพิมพ์สินค้าเองทั้งหมด
- **ตอนบันทึก** server ถามระบบงานซ้ำว่าหน่วยงาน/โครงการ/สินค้าที่เลือกมีอยู่จริงและตรงกัน แล้วใช้ชื่อจากระบบงานแทนที่หน้าเว็บส่งมา
- **เคสไม่ผูกกับ SN / registration แล้ว** — ผู้แจ้ง หน่วยงาน โครงการ อยู่ในแถว `issue_reports` สินค้าอยู่ที่ `issue_items`
  SN เดียวกันแจ้งซ้ำกี่ครั้ง กี่เบอร์ก็ได้ — หน้าเช็คสถานะเห็นเฉพาะเคสที่แจ้งด้วยเบอร์ที่กรอก
- **เคสยุคก่อน** (1 เคส = 1 SN ที่ลงทะเบียน) `db:init` คัดลอกผู้แจ้งและสินค้ามาไว้ที่ `reporter_*` / `issue_items` ให้แล้ว
  ตาราง `registrations` / ผลิตภัณฑ์ที่ลูกค้าเพิ่มเอง (`added_by = 'customer'`) ยังอยู่เป็นข้อมูลเดิม แต่ไม่มีเคสใหม่เพิ่มเข้าไปอีก

**ไฟล์แนบ** เก็บที่ `uploads/` (นอก `public/`) แล้วเสิร์ฟผ่าน `/api/files/*`
เพราะไฟล์ที่อัปโหลดหลัง build จะไม่ถูกเสิร์ฟถ้าวางใน `public/` และการผ่าน route handler
ทำให้เพิ่มการตรวจสิทธิ์ได้ภายหลัง ใน DB เก็บแค่ path

**ไฟล์แนบแยกตามรายการสินค้า** (ตรงกับใบงาน `ServiceRequest.php` ที่เก็บไฟล์แยกกล่อง) — หน้าแจ้งปัญหาส่งช่อง `images_<i>` / `video_<i>`
ตามลำดับรายการ เก็บที่ `issue_attachments.issue_item_id` · API ระบบงานส่ง `item_index` ของแต่ละไฟล์ · ไฟล์ที่ไม่มีรายการ (`NULL`) = ไฟล์ระดับเคส ของเคสหลายรายการที่แจ้งก่อนแยกไฟล์

**ข้อจำกัดไฟล์** — รูป jpg/png/heic/webp ≤ 25MB สูงสุด 5 รูป**ต่อรายการ**, วิดีโอ mp4/mov/3gp/webm (mov = คลิปจาก iPhone, 3gp/webm = Android บางรุ่น/บางแอป) ≤ 50MB 1 คลิป**ต่อรายการ**
และรูป + วิดีโอทุกรายการรวมกันไม่เกิน 95MB ต่อการแจ้ง 1 ครั้ง — เว็บจริงอยู่หลัง Cloudflare ซึ่งตัดคำขอที่ใหญ่เกิน 100MB (Apache ด้านหลังต้องตั้ง `LimitRequestBody` ไม่ต่ำกว่า 100MB ด้วย)
ชื่อไฟล์ถูกตั้งใหม่เป็น UUID เสมอ (ไม่ใช้ชื่อจากผู้ใช้)

**ความปลอดภัยที่ทำไว้แล้ว**
- Validate ทุก input ด้วย Zod ทั้ง client และ server · ช่อง `payload` ของฟอร์มแจ้งปัญหาจำกัด 256KB และคำขอทั้งก้อนถูกตัดด้วย `Content-Length` ก่อนอ่าน body
- Prepared statements ทุก query (LIMIT/OFFSET ถูก clamp เป็น integer ก่อนต่อ string)
- bcrypt hash รหัสผ่าน + ข้อความ error เดียวกันทั้งกรณี user ผิดและรหัสผิด · login สำเร็จลง `audit_logs` พร้อม IP, ล้มเหลวลง console
- `proxy.ts` ป้องกันทั้ง `/admin/*` และ `/api/admin/*` + ตรวจ `Origin` ของคำขอเปลี่ยนแปลงข้อมูล (CSRF ชั้นที่สองถัดจาก cookie SameSite=Lax) · layout หลังบ้าน redirect เองอีกชั้นถ้าไม่มี session
- Session = JWT HS256 (`jose`) pin algorithm + issuer + audience (`SESSION_AUDIENCE` หรือ `DB_NAME`) — cookie ของชุด deploy หนึ่งใช้กับอีกชุดไม่ได้แม้ secret ซ้ำ · `JWT_SECRET` ต้องยาว ≥ 32 ตัวอักษร
- `next` ตาม `?next=` หลัง login เฉพาะ path ภายในเว็บ (กัน open redirect)
- Security headers จาก `next.config.ts`: CSP (ทุกอย่างจากเว็บนี้เอง, `frame-ancestors 'none'`), HSTS, nosniff, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` และปิด `X-Powered-By`
- ไฟล์แนบ: ตรวจ magic bytes ให้ตรงชนิดที่อ้าง (jpg/png/webp/heic/mp4/mov/3gp/webm) ชื่อไฟล์ UUID นอก `public/` · เสิร์ฟด้วย content-type ตายตัว + nosniff + `CSP: sandbox` + `Cross-Origin-Resource-Policy: same-origin` + `Referrer-Policy: no-referrer`
- Rate limit endpoint public (แจ้งปัญหา 5/นาที, login 10/5 นาที, lookup 60/นาที, เช็คสถานะ 30/นาที) — ดู `TRUSTED_PROXY_HOPS` ด้านล่าง
- ปิดบังเบอร์โทรในหน้า public ตาม PDPA (`08x-xxx-5678`)
- `TJC_API_URL` ตอน production ต้องเป็น `https://` (หรือ `http://localhost` บนเครื่องเดียวกัน) ไม่งั้นปิดการค้นหา
- Audit log การอัปเดตเคส / ตั้งค่า / login (ตาราง `audit_logs`)

**ตัวแปร env ที่เกี่ยวกับความปลอดภัย** (ไฟล์ `.env.local` ของแต่ละชุด deploy — ห้าม commit)

| ตัวแปร | ค่าที่ควรตั้ง |
|---|---|
| `JWT_SECRET` | สุ่มใหม่ทุกชุด deploy `openssl rand -hex 32` (≥ 32 ตัวอักษร) |
| `SERVICE_API_KEY` | สุ่ม ≥ 32 ตัวอักษร ให้ตรงกับ `warranty_config.php` ของ tjc-api-server — ไม่ตั้ง = ปิด `/api/service/*` |
| `SEED_ADMIN_PASSWORD` | ≥ 12 ตัวอักษร ใช้แค่ตอน `db:init` ครั้งแรก แล้วเปลี่ยนด้วย `admin:password` |
| `TRUSTED_PROXY_HOPS` | จำนวน reverse proxy หน้าแอป — `1` = Apache อย่างเดียว · `2` = Cloudflare → Apache (เว็บจริง) · `0` = รันตรงไม่มี proxy · ตั้งผิดแล้ว rate limit นับ IP ผิดตัว |
| `RATE_LIMIT_ENABLED` | production ไม่ต้องตั้ง (เปิดเอง) · ตั้ง `false` ได้เฉพาะเครื่อง dev |
| `SESSION_AUDIENCE` | ไม่บังคับ — ค่าเริ่มต้นใช้ `DB_NAME` ผูก cookie กับชุด deploy |
| `DB_USER` / `DB_PASSWORD` | production ใช้ผู้ใช้เฉพาะแอป (สิทธิ์ SELECT/INSERT/UPDATE/DELETE ในฐานของตัวเอง) ไม่ใช่ root ว่าง ๆ — แอปเตือนตอน boot ถ้ายังเป็นแบบนั้น |

**Rate limit เก็บใน memory** (ล้าง bucket หมดอายุทุกนาที เพดาน 50,000) — ถ้า deploy หลาย instance ต้องย้ายไป Redis

## ล้างข้อมูลทดสอบ

```sql
-- เก็บ products และ admins ไว้
DELETE FROM issue_attachments;
DELETE FROM issue_reports;
DELETE FROM registrations;
DELETE FROM serial_numbers;
DELETE FROM audit_logs;
```
แล้วลบไฟล์ในโฟลเดอร์ `uploads/`

## คำสั่ง

```bash
npm run dev       # dev server
npm run build     # production build
npm start         # รัน production build
npm run db:init   # สร้าง/อัปเดต schema + แอดมินคนแรก (ผลิตภัณฑ์ตัวอย่างเมื่อ SEED_PRODUCTS=true) (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
npm run admin:password -- <username> <password>   # ตั้งรหัสผ่านแอดมิน
npx eslint .      # lint
npx tsc --noEmit  # typecheck
```
