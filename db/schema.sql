-- =====================================================================
-- OmniCRM Agro & Equipment - Database Schema (MariaDB/MySQL)
-- Versi PRD 1.0 (Fase 1 Hybrid MVP)
-- =====================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS email_events;
DROP TABLE IF EXISTS inbox_messages;
DROP TABLE IF EXISTS activity_records;
DROP TABLE IF EXISTS stock_allocations;
DROP TABLE IF EXISTS inventory_stocks;
DROP TABLE IF EXISTS warehouses;
DROP TABLE IF EXISTS approval_requests;
DROP TABLE IF EXISTS deal_line_items;
DROP TABLE IF EXISTS deals;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS b2c_profiles;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS seasonal_promos;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================ USERS & RBAC ============================
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  role          ENUM('admin','hos','manager','agent') NOT NULL DEFAULT 'agent',
  email         VARCHAR(160) NOT NULL UNIQUE,
  phone         VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  region        VARCHAR(120) NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================= MASTER DATA: PELANGGAN =======================
CREATE TABLE accounts (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_name  VARCHAR(180) NOT NULL,
  legal_type    VARCHAR(60) NULL,
  land_size_ha  DECIMAL(10,2) NULL,
  credit_limit  DECIMAL(14,2) NULL DEFAULT 0,
  region        VARCHAR(120) NULL,
  address       VARCHAR(255) NULL,
  phone         VARCHAR(30) NULL,
  email         VARCHAR(160) NULL,
  priority      ENUM('normal','vip','strategis') NOT NULL DEFAULT 'normal',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE contacts (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id        INT UNSIGNED NOT NULL,
  first_name        VARCHAR(100) NOT NULL,
  job_title         VARCHAR(120) NULL,
  whatsapp_number   VARCHAR(30) NULL,
  email             VARCHAR(160) NULL,
  CONSTRAINT fk_contact_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE b2c_profiles (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name        VARCHAR(120) NOT NULL,
  whatsapp_number  VARCHAR(30) NULL,
  email            VARCHAR(160) NULL,
  land_size_ha     DECIMAL(10,2) NULL,
  current_crop     VARCHAR(120) NULL,
  region           VARCHAR(120) NULL,
  village          VARCHAR(120) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================= MASTER DATA: PRODUK ========================
CREATE TABLE products (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_name     VARCHAR(180) NOT NULL,
  category         ENUM('agrochemical','equipment') NOT NULL,
  uom              VARCHAR(20) NOT NULL DEFAULT 'Pcs',
  manufacturer     VARCHAR(120) NULL,
  requires_demplot TINYINT(1) NOT NULL DEFAULT 0,
  is_active        TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE product_variants (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id             INT UNSIGNED NOT NULL,
  sku                    VARCHAR(40) NOT NULL UNIQUE,
  variant_name           VARCHAR(180) NOT NULL,
  price                  DECIMAL(14,2) NOT NULL DEFAULT 0,
  -- Atribut spesifik kimia (volume per unit, tanggal kedaluwarsa batch)
  agro_chemical_attrs    JSON NULL,
  -- Atribut spesifik alat (brand, masa garansi bulan)
  equipment_attrs        JSON NULL,
  is_active              TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================ MULTI-GUDANG ============================
CREATE TABLE warehouses (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  warehouse_name VARCHAR(160) NOT NULL,
  location_type ENUM('hazmat','equipment','mixed') NOT NULL DEFAULT 'mixed',
  region        VARCHAR(120) NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory_stocks (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  warehouse_id  INT UNSIGNED NOT NULL,
  variant_id    INT UNSIGNED NOT NULL,
  qty_available DECIMAL(14,2) NOT NULL DEFAULT 0,
  qty_allocated DECIMAL(14,2) NOT NULL DEFAULT 0,
  qty_warning   DECIMAL(14,2) NOT NULL DEFAULT 10,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wh_variant (warehouse_id, variant_id),
  CONSTRAINT fk_stock_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_variant   FOREIGN KEY (variant_id)   REFERENCES product_variants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reservasi stok; kedaluwarsa otomatis 3x24 jam jika transaksi tak selesai
CREATE TABLE stock_allocations (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  inventory_id  INT UNSIGNED NOT NULL,
  deal_id       INT UNSIGNED NULL,
  qty           DECIMAL(14,2) NOT NULL,
  allocated_by  INT UNSIGNED NOT NULL,
  expires_at    DATETIME NOT NULL,
  status        ENUM('active','released','converted') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at   DATETIME NULL,
  CONSTRAINT fk_alloc_stock FOREIGN KEY (inventory_id) REFERENCES inventory_stocks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================== PIPELINE ==============================
CREATE TABLE deals (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ref_no            VARCHAR(24) NOT NULL UNIQUE,
  customer_type     ENUM('B2B','B2C') NOT NULL,
  account_id        INT UNSIGNED NULL,
  b2c_profile_id    INT UNSIGNED NULL,
  pipeline_stage    ENUM('Prospecting','Sample Testing','Quotation & Negotiation','PO Verification','Pending Approval','Closed Won','Closed Lost') NOT NULL DEFAULT 'Prospecting',
  total_value       DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_percent  DECIMAL(5,2) NOT NULL DEFAULT 0,
  discount_status   ENUM('none','auto','pending','approved','rejected') NOT NULL DEFAULT 'none',
  owner_id          INT UNSIGNED NOT NULL,
  urgency           ENUM('normal','urgent') NOT NULL DEFAULT 'normal',
  closing_date      DATE NULL,
  notes             TEXT NULL,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_deal_account FOREIGN KEY (account_id)     REFERENCES accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_deal_b2c     FOREIGN KEY (b2c_profile_id) REFERENCES b2c_profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_deal_owner   FOREIGN KEY (owner_id)       REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE deal_line_items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  deal_id       INT UNSIGNED NOT NULL,
  variant_id    INT UNSIGNED NOT NULL,
  quantity      DECIMAL(12,2) NOT NULL,
  unit_price    DECIMAL(14,2) NOT NULL,
  subtotal      DECIMAL(14,2) NOT NULL,
  CONSTRAINT fk_item_deal    FOREIGN KEY (deal_id)    REFERENCES deals(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================== APPROVAL WORKFLOW ======================
CREATE TABLE approval_requests (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  deal_id         INT UNSIGNED NOT NULL,
  requested_by    INT UNSIGNED NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL,
  value_before    DECIMAL(14,2) NOT NULL,
  value_after     DECIMAL(14,2) NOT NULL,
  requested_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by     INT UNSIGNED NULL,
  reviewed_at     DATETIME NULL,
  review_note     VARCHAR(500) NULL,
  tier            ENUM('manager','hos') NOT NULL DEFAULT 'manager',
  token           CHAR(64) NOT NULL UNIQUE,
  wa_email_sent   TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_appr_deal    FOREIGN KEY (deal_id)      REFERENCES deals(id) ON DELETE CASCADE,
  CONSTRAINT fk_appr_reqby   FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_appr_revby   FOREIGN KEY (reviewed_by)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== KAMERA DEMPLOT / TIMELINE ====================
CREATE TABLE activity_records (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  deal_id       INT UNSIGNED NULL,
  agent_id      INT UNSIGNED NOT NULL,
  kind          ENUM('note','photo','call','wa','email') NOT NULL DEFAULT 'note',
  title         VARCHAR(180) NULL,
  description   TEXT NULL,
  media_url     VARCHAR(300) NULL,
  media_size_kb INT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_act_deal  FOREIGN KEY (deal_id)  REFERENCES deals(id) ON DELETE SET NULL,
  CONSTRAINT fk_act_agent FOREIGN KEY (agent_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== SHARED INBOX (WA/EMAIL) ====================
CREATE TABLE inbox_messages (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  direction       ENUM('inbound','outbound') NOT NULL,
  channel         ENUM('whatsapp','email') NOT NULL DEFAULT 'whatsapp',
  counterpart     VARCHAR(180) NOT NULL,
  counterpart_phone VARCHAR(30) NULL,
  counterpart_email VARCHAR(160) NULL,
  deal_id         INT UNSIGNED NULL,
  subject         VARCHAR(180) NULL,
  body            TEXT NOT NULL,
  status          ENUM('queued','sent','delivered','read','opened') NOT NULL DEFAULT 'sent',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE email_events (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id  INT UNSIGNED NOT NULL,
  event       ENUM('queued','delivered','opened','bounced') NOT NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_email_event FOREIGN KEY (message_id) REFERENCES inbox_messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================ OTOMASI PROMOSI MUSIMAN ================
CREATE TABLE seasonal_promos (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(180) NOT NULL,
  target_crop      VARCHAR(120) NOT NULL,
  target_region    VARCHAR(120) NULL,
  channel          ENUM('whatsapp','email','both') NOT NULL DEFAULT 'whatsapp',
  message_template TEXT NOT NULL,
  trigger_days_before INT NOT NULL DEFAULT 30,
  status           ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by       INT UNSIGNED NOT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_promo_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ======================= TAMBAHAN SISTEM ========================
CREATE TABLE audit_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL,
  action      VARCHAR(120) NOT NULL,
  entity_type VARCHAR(60) NULL,
  entity_id   VARCHAR(40) NULL,
  detail      JSON NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE system_settings (
  id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  skey   VARCHAR(80) NOT NULL UNIQUE,
  svalue JSON NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;