import Database from 'better-sqlite3'
import { join } from 'path'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function initDatabase(dbPath: string): void {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations()
  seedDefaults()
  console.log(`[DB] Initialized at ${dbPath}`)
}

function runMigrations(): void {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','manager','cashier')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Settings table (key-value store)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT UNIQUE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      purchase_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      stock_quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'pcs' CHECK(unit IN ('pcs','kg','ltr','mtr','box','doz')),
      min_stock_level REAL NOT NULL DEFAULT 5,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      credit_limit REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      current_balance REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Sales (bill header)
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      change_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash','card','credit','split')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','voided','held')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Sale items
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      discount_percent REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_percent REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL
    );

    -- Held bills
    CREATE TABLE IF NOT EXISTS held_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT,
      cart_data TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Purchases (GRN)
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grn_number TEXT NOT NULL UNIQUE,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id),
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Purchase items
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );

    -- Expense categories
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    -- Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      description TEXT,
      expense_date TEXT NOT NULL DEFAULT (date('now','localtime')),
      user_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Stock adjustments
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('add','damage','return','correction')),
      quantity REAL NOT NULL,
      notes TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Credit payments (Udhaar)
    CREATE TABLE IF NOT EXISTS credit_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      sale_id INTEGER REFERENCES sales(id),
      amount REAL NOT NULL,
      payment_type TEXT NOT NULL CHECK(payment_type IN ('credit','payment')),
      notes TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Supplier payments
    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      purchase_id INTEGER REFERENCES purchases(id),
      amount REAL NOT NULL,
      payment_type TEXT NOT NULL CHECK(payment_type IN ('payment','advance')),
      notes TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Activity log
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      username TEXT,
      action TEXT NOT NULL,
      module TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `)
}

function seedDefaults(): void {
  // Default admin user (password: admin123)
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
  if (!adminExists) {
    db.prepare(`
      INSERT INTO users (username, password, full_name, role)
      VALUES ('admin', 'admin123', 'System Administrator', 'admin')
    `).run()
  }

  // Default settings
  const defaultSettings: Record<string, string> = {
    store_name: 'My General Store',
    store_address: '123 Main Street, City',
    store_phone: '+92 300 0000000',
    currency_symbol: '₨',
    tax_enabled: '0',
    tax_percent: '0',
    tax_name: 'GST',
    receipt_width: '80',
    receipt_footer: 'Thank you for shopping with us!',
    low_stock_threshold: '5',
    bill_prefix: 'BILL-',
    grn_prefix: 'GRN-'
  }

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `)

  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value)
  }

  // Default categories
  const defaultCategories = ['General', 'Beverages', 'Food', 'Electronics', 'Clothing', 'Household', 'Stationery']
  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)')
  for (const cat of defaultCategories) insertCategory.run(cat)

  // Default expense categories
  const defaultExpCats = ['Rent', 'Electricity', 'Water', 'Salary', 'Transport', 'Maintenance', 'Other']
  const insertExpCat = db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)')
  for (const cat of defaultExpCats) insertExpCat.run(cat)
}
