import { ipcMain } from 'electron'
import { getDb } from '../../database/connection'

export function registerSupplierHandlers() {
  const db = () => getDb()

  function generateGRN(): string {
    const prefix = (db().prepare("SELECT value FROM settings WHERE key='grn_prefix'").get() as any)?.value || 'GRN-'
    const last = db().prepare('SELECT grn_number FROM purchases ORDER BY id DESC LIMIT 1').get() as any
    let nextNum = 1001
    if (last) {
      const num = parseInt(last.grn_number.replace(prefix, ''))
      if (!isNaN(num)) nextNum = num + 1
    }
    return `${prefix}${nextNum}`
  }

  ipcMain.handle('get-suppliers', (_, filters: any = {}) => {
    let query = 'SELECT * FROM suppliers WHERE 1=1'
    const params: any[] = []
    if (filters.search) { query += ' AND (name LIKE ? OR phone LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`) }
    query += ' ORDER BY name ASC'
    return db().prepare(query).all(...params)
  })

  ipcMain.handle('get-supplier', (_, id: number) => {
    const supplier = db().prepare('SELECT * FROM suppliers WHERE id=?').get(id)
    const purchases = db().prepare('SELECT * FROM purchases WHERE supplier_id=? ORDER BY created_at DESC LIMIT 20').all(id)
    const payments = db().prepare('SELECT * FROM supplier_payments WHERE supplier_id=? ORDER BY created_at DESC LIMIT 20').all(id)
    return { supplier, purchases, payments }
  })

  ipcMain.handle('create-supplier', (_, data: any) => {
    const result = db().prepare(`
      INSERT INTO suppliers (name, phone, email, address, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.name, data.phone || null, data.email || null, data.address || null, data.notes || null)
    return { id: result.lastInsertRowid, ...data }
  })

  ipcMain.handle('update-supplier', (_, id: number, data: any) => {
    db().prepare(`
      UPDATE suppliers SET name=?, phone=?, email=?, address=?, notes=?, updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(data.name, data.phone || null, data.email || null, data.address || null, data.notes || null, id)
    return { success: true }
  })

  ipcMain.handle('delete-supplier', (_, id: number) => {
    db().prepare('DELETE FROM suppliers WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('get-purchases', (_, filters: any = {}) => {
    let query = `
      SELECT p.*, s.name as supplier_name FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE 1=1
    `
    const params: any[] = []
    if (filters.supplier_id) { query += ' AND p.supplier_id = ?'; params.push(filters.supplier_id) }
    if (filters.start_date) { query += ' AND date(p.created_at) >= ?'; params.push(filters.start_date) }
    if (filters.end_date) { query += ' AND date(p.created_at) <= ?'; params.push(filters.end_date) }
    query += ' ORDER BY p.created_at DESC'
    return db().prepare(query).all(...params)
  })

  ipcMain.handle('create-purchase', (_, data: any) => {
    const createGRN = db().transaction(() => {
      const grnNumber = generateGRN()
      const result = db().prepare(`
        INSERT INTO purchases (grn_number, supplier_id, user_id, total_amount, paid_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(grnNumber, data.supplier_id || null, data.user_id || null, data.total_amount, data.paid_amount || 0, data.notes || null)
      const purchaseId = result.lastInsertRowid as number

      const insertItem = db().prepare(`
        INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      for (const item of data.items) {
        insertItem.run(purchaseId, item.product_id || null, item.product_name, item.quantity, item.unit_price, item.total_price)
        if (item.product_id) {
          db().prepare('UPDATE products SET stock_quantity = stock_quantity + ?, purchase_price = ? WHERE id = ?')
            .run(item.quantity, item.unit_price, item.product_id)
        }
      }

      // Update supplier balance
      if (data.supplier_id) {
        const balance = data.total_amount - (data.paid_amount || 0)
        db().prepare('UPDATE suppliers SET current_balance = current_balance + ? WHERE id=?')
          .run(balance, data.supplier_id)
      }

      return { id: purchaseId, grn_number: grnNumber }
    })
    return createGRN()
  })

  ipcMain.handle('add-supplier-payment', (_, data: any) => {
    const pay = db().transaction(() => {
      db().prepare(`
        INSERT INTO supplier_payments (supplier_id, purchase_id, amount, payment_type, notes, user_id)
        VALUES (?, ?, ?, 'payment', ?, ?)
      `).run(data.supplier_id, data.purchase_id || null, data.amount, data.notes || null, data.user_id || null)
      db().prepare('UPDATE suppliers SET current_balance = current_balance - ? WHERE id=?')
        .run(data.amount, data.supplier_id)

      // Auto-allocate payment to outstanding purchases (oldest first)
      let remainingPayment = data.amount
      const outstandingPurchases = db().prepare(`
        SELECT id, total_amount, paid_amount FROM purchases 
        WHERE supplier_id = ? AND total_amount > paid_amount
        ORDER BY created_at ASC
      `).all(data.supplier_id) as any[]

      const updatePurchase = db().prepare('UPDATE purchases SET paid_amount = paid_amount + ? WHERE id = ?')

      for (const p of outstandingPurchases) {
        if (remainingPayment <= 0) break
        const amountDue = p.total_amount - p.paid_amount
        const allocate = Math.min(remainingPayment, amountDue)
        updatePurchase.run(allocate, p.id)
        remainingPayment -= allocate
      }

      return { success: true }
    })
    return pay()
  })
}
