# POS System — Full-Featured Desktop Point of Sale

A production-ready, fully offline POS system for general stores built with **Electron + React + TypeScript + SQLite**.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (https://nodejs.org)
- npm 9+

### Install & Run

```bash
# 1. Install all dependencies
npm install

# 2. Rebuild native modules for Electron
npm run rebuild

# 3. Start in development mode
npm run electron:dev
```

### Build Windows Installer (.exe)

```bash
npm run dist:win
```

Output: `release/` folder with the `.exe` installer.

---

## 🔐 Default Login

| Username | Password  | Role  |
|----------|-----------|-------|
| admin    | admin123  | Admin |

> **Change the password immediately** in Settings → Users after first login.

---

## 📦 Features

| Module | Features |
|--------|----------|
| **Dashboard** | Today's revenue, bills count, top products, low stock alerts, quick actions |
| **POS / Billing** | Product search + barcode scan, cart, discounts, Cash/Card/Credit payments, hold & recall bills, receipt print |
| **Products** | Add/Edit/Delete, categories, CSV import, stock adjustments, low stock view |
| **Customers** | CRUD, Udhaar (credit) ledger, payment collection, purchase history |
| **Suppliers** | CRUD, GRN / purchase orders (auto-updates stock), payment tracking |
| **Reports** | Sales, P&L, Inventory, Top Products, Credit, End-of-Day — PDF & Excel export |
| **Expenses** | Daily expenses with categories, breakdown by category |
| **Settings** | Store info, tax (GST/VAT), receipt width, user management, backup/restore |

---

## ⌨️ POS Keyboard Shortcuts

| Key   | Action                    |
|-------|---------------------------|
| F2    | Focus product search      |
| F10   | Open payment / complete   |
| ESC   | Close modal               |

---

## 🗄️ Database

- SQLite database stored at: `%APPDATA%/pos-system/pos_database.db` (production)
- Development DB: project root `pos_database.db`
- Auto-migrated on first launch
- Backup/Restore via Settings → Backup

---

## 📁 Project Structure

```
src/
├── main/              # Electron main process
│   ├── index.ts       # App entry, window creation
│   ├── preload.ts     # Secure IPC bridge
│   └── ipc/           # IPC handlers per module
├── database/
│   └── connection.ts  # SQLite init, schema, migrations, seed
└── renderer/          # React frontend
    ├── App.tsx         # Router
    ├── index.css       # Global styles (Tailwind)
    ├── components/     # Shared UI components
    ├── pages/          # Full page components
    ├── store/          # Zustand global state
    └── utils/          # Helpers (currency, dates, etc.)
```

---

## 🔧 Tech Stack

- **Electron 30** — Desktop wrapper
- **React 18 + TypeScript** — UI
- **better-sqlite3** — Embedded SQLite database
- **Tailwind CSS 3** — Styling
- **Zustand** — State management
- **Vite + vite-plugin-electron** — Build tooling
- **jsPDF + jspdf-autotable** — PDF export
- **xlsx (SheetJS)** — Excel export
- **react-hot-toast** — Notifications
- **papaparse** — CSV import
- **electron-builder** — Windows/Mac/Linux packaging

---

## 🖨️ Receipt Printing

The POS page uses `window.print()`. Configure your thermal printer (58mm or 80mm) as the default printer in Windows. Set receipt width in **Settings → Store**.

---

## 📊 CSV Product Import Format

Create a CSV with these headers:

```csv
name,barcode,purchase_price,sale_price,stock_quantity,unit,min_stock_level
Bread,1234567890,50,70,100,pcs,10
Rice 5kg,,200,280,50,kg,5
```

---

## 🏗️ Build & Package

```bash
# Windows installer
npm run dist:win

# All platforms
npm run dist

# Just package (no installer)
npm run pack
```

---

## 📝 User Roles

| Role     | Access |
|----------|--------|
| **Admin**    | Full access to all modules |
| **Manager**  | POS, Products, Customers, Suppliers, Reports, Expenses |
| **Cashier**  | POS and Dashboard only |

---

## 🔒 Security Notes

- Passwords stored as plain text — use strong passwords in production
- For production: upgrade to bcrypt hashing in `src/main/ipc/users.ts`
- Database file is local only — no cloud, no internet required

---

## 🐞 Troubleshooting

**`better-sqlite3` native module error:**
```bash
npm install --save-dev @electron/rebuild
npx electron-rebuild -f -w better-sqlite3
```

**Blank screen on start:**
- Ensure Vite dev server is running on port 5173
- Check DevTools console for errors

**Database not found:**
- On first run, DB is auto-created — check console for path
