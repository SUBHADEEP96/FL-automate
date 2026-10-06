-- West Bengal Excise (WBSBCL / e-Abgari) FL Off-Shop Database Schema
-- Optimized for SQLite via better-sqlite3 with WAL mode enabled

PRAGMA foreign_keys = ON;

-- 1. Product & Brand Master
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,             -- Item / Brand Code (e.g. IMFL-RC-750)
  ean TEXT UNIQUE NOT NULL,              -- 13-digit EAN-13 barcode
  name TEXT NOT NULL,                    -- Full Brand Name
  category TEXT NOT NULL CHECK(category IN ('IMFL', 'Beer', 'Wine', 'CS')),
  sub_category TEXT,                     -- Whisky, Rum, Vodka, Strong Beer, Red Wine
  pack_size_ml INTEGER NOT NULL,         -- 60, 180, 375, 750, 650, 500, 330
  strength_pct REAL NOT NULL,            -- % v/v Alcohol (e.g. 42.8 for IMFL, 8.0 for strong beer)
  mrp REAL NOT NULL,                     -- Maximum Retail Price in INR
  cost_price REAL NOT NULL,              -- Wholesale purchase cost
  current_stock INTEGER NOT NULL DEFAULT 0, -- Counter stock in bottles
  min_stock_alert INTEGER DEFAULT 12,    -- Reorder threshold
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Excise Security Holograms (2D DataMatrix Track & Trace)
CREATE TABLE IF NOT EXISTS holograms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serial_number TEXT UNIQUE NOT NULL,    -- e.g. WB26EX00918237
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK(status IN ('IN_STOCK', 'SOLD', 'DAMAGED', 'RETURNED')),
  inward_challan_id INTEGER REFERENCES inward_challans(id),
  sale_id INTEGER REFERENCES sales(id),
  scanned_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Inward Consignments (Depot Inward Challan)
CREATE TABLE IF NOT EXISTS inward_challans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challan_no TEXT UNIQUE NOT NULL,       -- e.g. WBSBCL/KOL/2026/CH-8841
  challan_date TEXT NOT NULL,            -- YYYY-MM-DD
  source_depot TEXT NOT NULL,            -- WBSBCL Depot Name
  vehicle_no TEXT,
  total_cases INTEGER NOT NULL DEFAULT 0,
  total_bottles INTEGER NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK(status IN ('RECEIVED', 'VERIFIED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challan_id INTEGER NOT NULL REFERENCES inward_challans(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  batch_no TEXT NOT NULL,
  cases INTEGER NOT NULL,
  bottles_per_case INTEGER NOT NULL,
  total_bottles INTEGER NOT NULL,
  purchase_rate REAL NOT NULL,
  mrp REAL NOT NULL
);

-- 4. Sales Transactions
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_no TEXT UNIQUE NOT NULL,          -- e.g. WB-FL-20261007-0001
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cashier_id TEXT NOT NULL DEFAULT 'COUNTER_01',
  cashier_name TEXT NOT NULL DEFAULT 'Counter Staff',
  payment_mode TEXT NOT NULL CHECK(payment_mode IN ('CASH', 'UPI', 'CARD', 'SPLIT')),
  subtotal REAL NOT NULL,
  discount REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total REAL NOT NULL,
  cash_tendered REAL DEFAULT 0,
  change_returned REAL DEFAULT 0,
  upi_ref_no TEXT,
  status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'CANCELLED', 'REFUNDED'))
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL,
  rate REAL NOT NULL,
  mrp REAL NOT NULL,
  bulk_litres REAL NOT NULL,             -- (qty * ml) / 1000
  london_proof_litres REAL NOT NULL,     -- BL * (strength / 57.12)
  hologram_serials TEXT                  -- JSON array of scanned 2D hologram serials
);

-- 5. Daily Stock Register (DSR) & End-Of-Day (EOD)
CREATE TABLE IF NOT EXISTS daily_stock_register (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE NOT NULL,             -- YYYY-MM-DD
  opening_time DATETIME,
  closing_time DATETIME,
  closed_by TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'FINALIZED', 'SUBMITTED_TO_EABGARI')),
  total_opening_bottles INTEGER DEFAULT 0,
  total_inward_bottles INTEGER DEFAULT 0,
  total_sales_bottles INTEGER DEFAULT 0,
  total_breakage_bottles INTEGER DEFAULT 0,
  total_closing_bottles INTEGER DEFAULT 0,
  total_bulk_litres REAL DEFAULT 0.0,
  total_london_proof_litres REAL DEFAULT 0.0,
  total_sales_value REAL DEFAULT 0.0,
  discrepancy_count INTEGER DEFAULT 0,
  eabgari_ack_no TEXT,
  eabgari_submission_time DATETIME
);

CREATE TABLE IF NOT EXISTS dsr_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dsr_id INTEGER NOT NULL REFERENCES daily_stock_register(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  opening_bottles INTEGER NOT NULL DEFAULT 0,
  inward_bottles INTEGER NOT NULL DEFAULT 0,
  sales_bottles INTEGER NOT NULL DEFAULT 0,
  breakage_bottles INTEGER NOT NULL DEFAULT 0,
  expected_closing_bottles INTEGER NOT NULL DEFAULT 0,
  physical_closing_bottles INTEGER NOT NULL DEFAULT 0,
  discrepancy_bottles INTEGER NOT NULL DEFAULT 0,
  bulk_litres REAL NOT NULL DEFAULT 0.0,
  london_proof_litres REAL NOT NULL DEFAULT 0.0,
  sales_value REAL NOT NULL DEFAULT 0.0
);

-- 6. Store Configuration & e-Abgari Portal Credentials
CREATE TABLE IF NOT EXISTS shop_settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  shop_name TEXT NOT NULL,
  license_no TEXT NOT NULL,
  licensee_name TEXT NOT NULL,
  district TEXT NOT NULL,
  excise_range TEXT NOT NULL,
  address TEXT NOT NULL,
  gstin TEXT,
  retailer_code TEXT NOT NULL,
  portal_username TEXT NOT NULL,
  portal_password TEXT NOT NULL,
  portal_url TEXT NOT NULL DEFAULT 'http://localhost:5001/portal-simulator',
  auto_submit_enabled INTEGER DEFAULT 0,
  printer_width_mm INTEGER DEFAULT 80,
  footer_message TEXT DEFAULT 'Govt of WB Excise Regulated Retail Outlet. Please drink responsibly.'
);
