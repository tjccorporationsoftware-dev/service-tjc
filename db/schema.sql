-- ระบบลงทะเบียนสินค้า (Product Registration System)
-- MariaDB 10.4+
--
-- เลิกใช้การรับประกันทั้งระบบแล้ว — คอลัมน์ที่ขึ้นต้นด้วย "เลิกใช้" ด้านล่างไม่มีโค้ดอ่านหรือเขียนอีก
-- แต่ยังต้องอยู่ใน schema เพราะ MIGRATIONS เก่าใน scripts/init-db.mjs (ซึ่งห้ามแก้) อ้างถึงชื่อคอลัมน์เหล่านี้
-- ถ้าตัดออก db:init บน DB ใหม่จะล้ม และไม่ DROP ทิ้งเพื่อไม่ให้ข้อมูลประกันเดิมของบริษัทอื่นหายตอนรัน db:init

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  -- รหัสอ้างอิงผลิตภัณฑ์ (SKU) ไม่บังคับ — เว้นว่างเก็บเป็น NULL ไม่ใช่ '' เพราะ UNIQUE
  -- ยอมให้มี NULL ซ้ำกันได้หลายแถว แต่ '' ซ้ำไม่ได้ (จะเพิ่มผลิตภัณฑ์ไร้รหัสได้แค่ตัวเดียว)
  code VARCHAR(10) UNIQUE,
  brand VARCHAR(100),
  model VARCHAR(100),
  -- ที่มาของสินค้า ตัดสินว่าใครเป็นคนออกรหัส SN
  --   in_house = ผลิตเอง    -> เราออกรหัส SN เองจากหน้า "ตั้งค่ารหัส SN" แล้วค่อยผูกทีหลัง
  --   resale   = ซื้อมาขายต่อ -> มี SN ติดมากับตัวสินค้าจากโรงงานเดิม วางเข้าระบบได้เลย
  source_type ENUM('in_house','resale') NOT NULL DEFAULT 'in_house',
  -- เลิกใช้: ระยะประกัน / ช่วงวันประกันของผลิตภัณฑ์ (ดูหัวไฟล์)
  warranty_years INT NOT NULL DEFAULT 0,
  warranty_months INT NOT NULL DEFAULT 0,
  warranty_days INT NOT NULL DEFAULT 0,
  warranty_start_date DATE,
  warranty_end_date DATE,
  -- ใครเป็นคนเพิ่มผลิตภัณฑ์นี้
  --   admin    = แอดมินเพิ่มจากหน้า "ผลิตภัณฑ์"
  --   customer = ลูกค้าพิมพ์ชื่อสินค้าเองตอนลงทะเบียนแล้วไม่ตรงกับตัวไหนในระบบ ระบบจึงสร้างให้
  --              (สร้างแบบ is_active = 0 ไม่โชว์เป็นตัวเลือกให้ลูกค้าคนอื่นจนกว่าแอดมินจะเปิดใช้งาน)
  added_by ENUM('admin','customer') NOT NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,   -- 0 = ไม่โชว์เป็นตัวเลือกในหน้าลงทะเบียนของลูกค้า
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,       -- bcrypt
  display_name VARCHAR(255),
  role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- รูปแบบรหัส SN ที่ตั้งไว้ล่วงหน้า ไม่ผูกกับผลิตภัณฑ์ใด ๆ — สร้าง SN ก่อน แล้วค่อยผูกผลิตภัณฑ์ทีหลัง
CREATE TABLE IF NOT EXISTS sn_schemes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(255) NOT NULL,               -- ชื่อเรียกที่แอดมินตั้ง เช่น "เตียงผู้ป่วยไฟฟ้า"
  prefix VARCHAR(10) NOT NULL,                -- ตัวนำหน้า เช่น B
  model_code VARCHAR(10) NOT NULL,            -- รหัสรุ่น เช่น 01
  next_sequence INT NOT NULL DEFAULT 1,       -- เลขลำดับการผลิตถัดไป
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_prefix_model (prefix, model_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS serial_numbers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sn VARCHAR(50) NOT NULL UNIQUE,
  product_id INT,                            -- NULL = ยังไม่ผูกผลิตภัณฑ์ (สร้าง SN ไว้ก่อนได้)
  scheme_id INT,                              -- รูปแบบรหัสที่ใช้ตอนสร้าง (เผื่อตรวจสอบย้อนหลัง)
  status ENUM('available','registered','void') NOT NULL DEFAULT 'available',
  generated_by INT,                          -- admin ที่สร้าง — NULL = ลูกค้าพิมพ์ SN ที่ไม่มีในระบบมาเองตอนลงทะเบียน
  batch_id VARCHAR(36),                      -- รหัสชุดที่ generate พร้อมกัน (ใช้ export)
  category VARCHAR(100),                     -- หมวดหมู่ที่แอดมินกรอกตอนสร้าง SN แต่ละชุด
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (scheme_id) REFERENCES sn_schemes(id),
  FOREIGN KEY (generated_by) REFERENCES admins(id),
  INDEX idx_sn (sn),
  INDEX idx_batch (batch_id),
  INDEX idx_status (status),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  serial_number_id INT NOT NULL UNIQUE,      -- 1 SN ลงทะเบียนได้ครั้งเดียว
  -- phone/customer_name/email เป็น NULL ได้ = แถวเปล่าที่แอดมินสร้างไว้ด้วยปุ่ม "เริ่มประกัน" (ยุคก่อนเลิกใช้)
  -- รอลูกค้ามา "รับ" (claim) ผ่านหน้าลงทะเบียน — ระบบปัจจุบันไม่สร้างแถวแบบนี้แล้ว
  phone VARCHAR(15),
  customer_name VARCHAR(255),
  email VARCHAR(255),
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- เลิกใช้: วันประกันของเครื่อง (ดูหัวไฟล์)
  warranty_start DATE,
  warranty_end DATE,
  customer_reported_warranty_start DATE,
  customer_reported_warranty_end DATE,
  consent_accepted_at DATETIME,              -- เวลาที่ลูกค้ายอมรับประกาศความเป็นส่วนตัว (PDPA)
  FOREIGN KEY (serial_number_id) REFERENCES serial_numbers(id),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS issue_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  registration_id INT NOT NULL,
  description TEXT NOT NULL,
  status ENUM('pending','in_progress','resolved','closed') NOT NULL DEFAULT 'pending',
  in_warranty TINYINT(1) NOT NULL DEFAULT 1, -- เลิกใช้ (ดูหัวไฟล์)
  admin_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (registration_id) REFERENCES registrations(id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS issue_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_report_id INT NOT NULL,
  file_type ENUM('image','video') NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_name VARCHAR(255),
  file_size INT,                             -- bytes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_report_id) REFERENCES issue_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log: ใครทำอะไรเมื่อไหร่ (generate SN, อัปเดตเคส ฯลฯ)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT,
  action VARCHAR(100) NOT NULL,
  detail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id),
  INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
