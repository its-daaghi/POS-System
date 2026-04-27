import { ipcMain } from 'electron'
import { getDb } from '../../database/connection'

export function registerCustomerHandlers() {
  const db = () => getDb()

  ipcMain.handle('get-customers', (_, filters: any = {}) => {
    let query = 'SELECT * FROM customers WHERE 1=1'
    const params: any[] = []
    if (filters.search) { query += ' AND (name LIKE ? OR phone LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`) }
    query += ' ORDER BY name ASC'
    return db().prepare(query).all(...params)
  })

  ipcMain.handle('get-customer', (_, id: number) => {
    return db().prepare('SELECT * FROM customers WHERE id = ?').get(id)
  })

  ipcMain.handle('create-customer', (_, data: any) => {
    const result = db().prepare(`
      INSERT INTO customers (name, phone, address, credit_limit, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.name, data.phone || null, data.address || null, data.credit_limit || 0, data.notes || null)
    return { id: result.lastInsertRowid, ...data }
  })

  ipcMain.handle('update-customer', (_, id: number, data: any) => {
    db().prepare(`
      UPDATE customers SET name=?, phone=?, address=?, credit_limit=?, notes=?, updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(data.name, data.phone || null, data.address || null, data.credit_limit || 0, data.notes || null, id)
    return { success: true }
  })

  ipcMain.handle('delete-customer', (_, id: number) => {
    db().prepare('DELETE FROM customers WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('get-customer-ledger', (_, id: number) => {
    const customer = db().prepare('SELECT * FROM customers WHERE id=?').get(id)
    const transactions = db().prepare(`
      SELECT cp.*, s.bill_number FROM credit_payments cp
      LEFT JOIN sales s ON cp.sale_id = s.id
      WHERE cp.customer_id = ?
      ORDER BY cp.created_at DESC
    `).all(id)
    const sales = db().prepare(`
      SELECT s.*, COUNT(si.id) as item_count FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE s.customer_id = ? AND s.status = 'completed'
      GROUP BY s.id ORDER BY s.created_at DESC LIMIT 50
    `).all(id)
    return { customer, transactions, sales }
  })

  ipcMain.handle('add-credit-payment', (_, data: any) => {
    const addPayment = db().transaction(() => {
      db().prepare(`
        INSERT INTO credit_payments (customer_id, sale_id, amount, payment_type, notes, user_id)
        VALUES (?, ?, ?, 'payment', ?, ?)
      `).run(data.customer_id, data.sale_id || null, data.amount, data.notes || null, data.user_id || null)
      db().prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id=?')
        .run(data.amount, data.customer_id)
      return { success: true }
    })
    return addPayment()
  })
}
