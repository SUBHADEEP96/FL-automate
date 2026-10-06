# West Bengal FL Off-Shop POS Billing, Ledger & e-Abgari / WBSBCL Compliance System

Internal retail POS billing, inventory ledger, and automated West Bengal Excise compliance (`e-Abgari` / `WBSBCL`) application engineered specifically for **Foreign Liquor (FL "OFF" SHOP)** retail stores in West Bengal.

---

## 🏛️ Regulatory & Architectural Highlights

1. **Strict West Bengal State Excise Mathematics**:
   - **Bulk Litres (BL)**: \(\text{BL} = \frac{\sum(\text{Bottles} \times \text{ml})}{1000}\)
   - **London Proof Litres (LPL)**: \(\text{LPL} = \text{BL} \times \left(\frac{\text{Alcohol } \% \text{ v/v}}{57.12}\right)\)
     *(Based on Bengal Excise Act, 1909 standards where 57.12% v/v is 100° London Proof)*
2. **Track-and-Trace 2D Security Hologram Integration**:
   - Resolves both standard **EAN-13** barcodes and West Bengal **2D DataMatrix Excise Security Holograms** (`WB26...`).
   - Links individual security serial numbers directly to sales transactions and deducts counter stock atomically.
3. **Zero-Latency Keyboard Wedge Scanner (<40ms)**:
   - Uses inter-keystroke delta threshold timing to detect hardware barcode sweeps.
   - Sub-5ms in-memory and IndexedDB lookup via **Dexie.js**, supporting full offline scanning and checkout resilience.
4. **Direct ESC/POS 80mm Thermal Receipt Printing**:
   - **WebUSB API** & **WebSerial API** integration for sending raw binary ESC/POS buffers (`\x1B\x40`, cut commands, alignment, bold text) directly to 80mm thermal receipt printers without browser dialog delays.
   - Includes official store license number, GSTIN, timestamp, scanned hologram hash, and statutory excise health warning.
5. **WBSBCL / e-Abgari Automated Compliance Worker**:
   - Official **ExcelJS** generator producing multi-sheet formatted **Form DSR-3** daily returns with licensee metadata and formula calculations.
   - **Puppeteer Headless Automation Worker** that logs into the e-Abgari retailer portal, handles security CAPTCHA verification, uploads the certified DSR statement, and downloads the digital acknowledgement receipt and timestamped screenshot.
   - Built-in **e-Abgari Portal Simulator** (`/portal-simulator`) for safe offline testing and live demonstration.

---

## 📋 Store Data Customization Checklist (What You Need to Replace)

Currently, the project contains authentic seed sample data (for Shyambazar, Kolkata). Before deploying for real counter billing in your store, replace the items in this checklist:

### 1. Store License & Retailer Profile
| Item to Replace | Sample Value in Code | Where to Change | Description |
|---|---|---|---|
| **Shop Name** | `NEW SHYAMBAZAR FL OFF SHOP` | UI `⚙️ Settings` or `backend/db/seed.js` | Exact name on your retail excise license |
| **Excise License Number** | `WB/EX/FL/KOL-NORTH/0492/2024-25` | UI `⚙️ Settings` or `backend/db/seed.js` | Your sanctioned WB Excise License No |
| **Licensee / Enterprise** | `M/s Ghosh & Banerjee Enterprises` | UI `⚙️ Settings` or `backend/db/seed.js` | Name of the licensee firm/proprietorship |
| **District & Range** | `Kolkata North` / `Cossipore Range` | UI `⚙️ Settings` or `backend/db/seed.js` | Your district excise collectorate & range |
| **Premises Address** | `142/A, Bidhan Sarani, Kolkata...` | UI `⚙️ Settings` or `backend/db/seed.js` | Exact physical shop address |
| **GSTIN Number** | `19AAACG1234E1Z8` | UI `⚙️ Settings` or `backend/db/seed.js` | 15-digit GSTIN (West Bengal starts with `19`) |
| **WBSBCL Retailer Code** | `WBSBCL-RET-KOL-8912` | UI `⚙️ Settings` or `backend/db/seed.js` | Depot customer code allotted by WBSBCL |

> **Quick way to update**: Click the `⚙️` (Settings) icon in the top navigation bar of the web app, edit the fields, and click **Save Configuration**.

---

### 2. e-Abgari / WBSBCL Government Portal Credentials
| Parameter | Default (Simulator) | For Live Production |
|---|---|---|
| **Portal Endpoint URL** | `http://localhost:5001/portal-simulator` | Official State Portal (e.g. `https://excise.wb.gov.in/eAbgari/...`) |
| **Portal User ID / Retailer ID** | `RET_KOL_8912` | Your official login ID provided by the Excise Dept |
| **Portal Password** | `ExciseWb@2026!` | Your confidential e-Abgari password |

*(Credentials are stored locally in the SQLite database on your machine and are never sent to external servers)*

---

### 3. Product Catalog & Counter Opening Stock
The database is currently pre-seeded with 29 popular brands across IMFL, Beer, Wine, and CS.
To align this with your shop's stock:

1. Open `backend/db/seed.js`.
2. Update the `productsData` array with your shop's actual items:
   - `code`: Your SKU code (e.g. `IMFL-RC-750`)
   - `ean`: 13-digit barcode printed on the physical bottle label (e.g. `8901234001017`)
   - `name`: Brand name and pack size (e.g. `Royal Challenge Premium Whisky (750ml)`)
   - `category`: Must be `'IMFL'`, `'Beer'`, `'Wine'`, or `'CS'`
   - `pack_size_ml`: Bottle volume in ml (`750`, `375`, `180`, `60`, `650`, `500`, `330`)
   - `strength_pct`: Alcohol by volume % (e.g. `42.8` for IMFL, `8.0` for Strong Beer, `13.5` for Wine)
   - `mrp`: Official WB Gazette retail price in ₹
   - `cost_price`: Wholesale purchase rate from your WBSBCL invoice/challan
   - `stock`: Opening physical count of bottles in your store
3. Run `npm.cmd run seed` to re-populate your database.

---

### 4. Counter UPI Payment Handle (QR Code)
In `frontend/src/components/counter/PaymentModal.tsx`:
- Line 193: Replace `wbsbcl.ret8912@icici` with your shop's actual current account UPI ID (e.g. `yourshopname@icici` or `yourshopname@okhdfcbank`).

---

### 5. Cashier Staff Names & IDs
In `frontend/src/components/counter/CashierScreen.tsx` and `Header.tsx`:
- Change cashier ID (default: `COUNTER_01`) and staff name (default: `S. Banerjee`) to your actual billing clerks.

---

## 🖨️ Hardware Buying & Setup Guide

To operate this POS at maximum speed (sub-second scans and instant receipts), here is the hardware specification and setup guide:

### 1. Barcode & 2D QR / DataMatrix Scanner (CRITICAL)

#### ⚠️ Crucial Distinction: 1D vs 2D Scanner
- **1D Scanners (DO NOT BUY FOR EXCISE)**: Old traditional laser scanners only scan standard linear barcodes with vertical stripes (EAN-13, UPC). They **CANNOT** read 2D QR codes or West Bengal Excise Security Holograms.
- **2D Image / CMOS Scanners (MUST BUY)**: Scans **both** standard 1D bottle barcodes (EAN-13) and West Bengal **2D DataMatrix Excise Security Holograms**.

#### Recommended 2D Scanner Models in India:
1. **Handheld Gun / Pistol Scanners (Most Common)**:
   - **Honeywell Voyager 1400g / 1472g (2D USB)** *(Industry standard, ultra-fast scanning of curved bottle surfaces)*
   - **Zebra DS2208 (2D USB)** *(Extremely durable, excellent barcode sweep angle)*
   - **TVS BSC 200 (2D USB)** *(Widely used across retail stores in West Bengal, affordable)*
   - **Netum / Syble 2D USB Barcode Scanner** *(Budget option)*
2. **Hands-Free Desktop Presentation Scanners (Recommended for High Rush Off-Shops)**:
   - **Honeywell Orbit 7190g (Hybrid 1D/2D)** or **Zebra DS9308**
   - *How it works*: Sits flat on the counter. The cashier holds the bottle and sweeps it across the window with both hands free. No need to repeatedly pick up and put down a handheld gun.

#### How to Connect the Scanner:
1. Plug the scanner's USB cable into any USB port on your POS PC / laptop.
2. The scanner works in **USB HID Keyboard Wedge Mode** (factory default). Windows requires **no special drivers**.
3. When you scan a bottle barcode or an excise hologram, the scanner simulates rapid typing (`<40ms` per character) ending in `Enter`.
4. Our application automatically intercepts this rapid keystroke sweep, recognizes whether it is a product EAN or an Excise Hologram, adds the item to the cart, and plays an audio scan chirp via the PC speaker.

---

### 2. 80mm POS Thermal Receipt Printer

#### Specifications:
- **Paper Width**: **80mm (3-inch / 3 1/8")** thermal paper.
  *(Avoid 58mm / 2-inch printers, because 58mm is too narrow for multi-column excise invoices and 2D hologram track-and-trace digests)*.
- **Auto-Cutter**: Recommended (automatically snips the paper after printing).
- **Interface**: USB or USB + Serial.

#### Recommended Printer Models in India:
- **TVS RP-3200 Star (80mm Thermal)** *(Most popular in Indian retail)*
- **Epson TM-T82X / TM-T20III (80mm Thermal)** *(High reliability, long life)*
- **Xprinter XP-N160II / XP-Q200 (80mm USB)** *(Budget friendly)*
- **Posiflex Aura 6900 (80mm Thermal)**

#### How to Connect & Print:
1. Plug the printer into your PC via USB and install the manufacturer's Windows printer driver.
2. In the app:
   - **Option A (Zero-Dialog ESC/POS)**: Click `⚙️` (Settings) > **Connect WebUSB Device** or **Connect COM / WebSerial**. The app sends raw ESC/POS binary codes directly to the printer with zero browser popups.
   - **Option B (Standard Windows Print)**: Click **Browser Print** or press `F4`, select your 80mm printer in the print dialog once, check "Save as default", and set margins to "None".

---

### 3. POS Computer Specifications
- **Operating System**: Windows 10 or Windows 11 (64-bit).
- **Processor & RAM**: Intel Core i3 / i5 or AMD Ryzen 3 / 5, minimum 4 GB RAM (8 GB recommended).
- **Browser**: Google Chrome or Microsoft Edge (both support WebUSB, WebSerial, and IndexedDB).
- **Ports**: At least 2 available USB ports (1 for 2D Barcode Scanner, 1 for 80mm Thermal Printer).

---

## 🗂️ System Architecture

```
c:\FlAutomate\
├── backend/
│   ├── data/                   # SQLite database (WAL mode), export files, receipts
│   ├── db/
│   │   ├── schema.sql          # Master SQLite schema (Products, Holograms, Challans, Sales, DSR)
│   │   ├── database.js         # better-sqlite3 connection with WAL mode
│   │   └── seed.js             # Realistic West Bengal catalog, initial stock, and 2D holograms
│   ├── routes/
│   │   ├── products.js         # Catalog search, SKU, and dual EAN/Hologram resolution
│   │   ├── sales.js            # Atomic POS checkout transaction
│   │   ├── inventory.js        # WBSBCL inward challans & batch hologram generation
│   │   ├── dsr.js              # Daily Stock Register calculation & EOD day-close wizard
│   │   ├── compliance.js       # ExcelJS report generation & Puppeteer bot triggers
│   │   └── settings.js         # Store license & hardware config
│   ├── services/
│   │   ├── exciseEngine.js     # BL, LPL, and stock discrepancy calculation engine
│   │   ├── excelReport.js      # Official WBSBCL Excel workbook builder (exceljs)
│   │   ├── portalWorker.js     # Puppeteer headless automation worker
│   │   └── portalSimulator.js  # West Bengal e-Abgari retail portal simulator
│   ├── tests/
│   │   └── testCompliance.js   # End-to-end verification test suite
│   └── server.js               # Express server (Port 5001)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── counter/        # CashierScreen, CartTable, ProductCatalogModal, PaymentModal, ReceiptPreviewModal
│   │   │   ├── ledger/         # DailyStockRegister, DayCloseWizardModal, InwardChallanModal
│   │   │   ├── compliance/     # ComplianceDashboard, SettingsModal
│   │   │   └── shared/         # Header, HotkeyBar
│   │   ├── db/
│   │   │   └── dexieDb.ts      # Client IndexedDB schema & offline barcode lookup
│   │   ├── hooks/
│   │   │   ├── useBarcodeScanner.ts  # Wedge barcode listener with <40ms timing
│   │   │   └── useThermalPrinter.ts  # WebUSB & WebSerial ESC/POS printing
│   │   ├── types/              # TypeScript models
│   │   ├── utils/              # Excise math, Web Audio scan beeps, ESC/POS byte buffers
│   │   ├── App.tsx             # Root application orchestrator
│   │   └── main.tsx
│   ├── vite.config.ts          # Vite 8 + Tailwind CSS + API Proxy
│   └── package.json
└── package.json                # Root orchestration scripts
```

---

## ⌨️ POS Keyboard Hotkeys (Zero-Mouse Checkout)

| Hotkey | Action | Description |
|---|---|---|
| `F1` | **Catalog Search** | Opens high-contrast fuzzy brand search modal (arrow keys + Enter to add) |
| `F2` | **Cash Payment** | Opens cash settlement modal with quick ₹100, ₹200, ₹500, ₹2000 chips & change calculator |
| `F3` | **UPI / QR Code** | Displays dynamic West Bengal Off-Shop UPI QR code and UTR reference input |
| `F4` | **Print & New** | Prints thermal receipt and initializes next retail sale |
| `F8` | **Inward Challan** | Opens WBSBCL depot consignment entry modal |
| `F9` | **Day Close (EOD)** | Opens 3-step End-of-Day reconciliation wizard & discrepancy audit |
| `F10` | **e-Abgari Portal** | Opens statutory compliance dashboard & automated portal submission bot |
| `+` / `-` | **Modify Quantity** | Increments / decrements quantity of selected cart line item |
| `Delete` | **Remove Item** | Removes highlighted line item from the cart |
| `Escape` | **Clear / Dismiss** | Closes open modals or clears current active bill |

---

## 🚀 Quick Start Instructions

### 1. Install & Seed
```bash
# Seed authentic West Bengal catalog, initial inventory & 2D security holograms
npm.cmd run seed
```

### 2. Run Verification Test Suite
```bash
npm.cmd run test:compliance
```

### 3. Launch the Application
```bash
# Concurrently starts Express backend (port 5001) and Vite frontend (port 5173)
npm.cmd start
```

- **POS Counter Screen**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Health**: [http://localhost:5001/api/health](http://localhost:5001/api/health)
- **e-Abgari Retailer Portal Simulator**: [http://localhost:5001/portal-simulator](http://localhost:5001/portal-simulator)
