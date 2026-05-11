import { ipcMain } from 'electron'
import { getDb } from '../../database/connection'

export function registerSaleHandlers() {
  const db = () => getDb()

  function generateBillNumber(): string {
    const prefix = (db().prepare("SELECT value FROM settings WHERE key='bill_prefix'").get() as any)?.value || 'BILL-'
    const last = db().prepare("SELECT bill_number FROM sales ORDER BY id DESC LIMIT 1").get() as any
    let nextNum = 1001
    if (last) {
      const num = parseInt(last.bill_number.replace(prefix, ''))
      if (!isNaN(num)) nextNum = num + 1
    }
    return `${prefix}${nextNum}`
  }

  ipcMain.handle('create-sale', (_, data: any) => {
    const createSale = db().transaction(() => {
      const billNumber = generateBillNumber()

      const saleResult = db().prepare(`
        INSERT INTO sales (bill_number, customer_id, user_id, subtotal, discount_amount, tax_amount,
          total_amount, paid_amount, change_amount, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        billNumber,
        data.customer_id || null,
        data.user_id || null,
        data.subtotal,
        data.discount_amount,
        data.tax_amount,
        data.total_amount,
        data.paid_amount,
        data.change_amount,
        data.payment_method,
        data.notes || null
      )
      const saleId = saleResult.lastInsertRowid as number

      const insertItem = db().prepare(`
        INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price,
          discount_percent, discount_amount, tax_percent, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const item of data.items) {
        insertItem.run(
          saleId, item.product_id, item.product_name, item.quantity,
          item.unit_price, item.discount_percent || 0, item.discount_amount || 0,
          item.tax_percent || 0, item.total_price
        )
        // Deduct stock
        if (item.product_id) {
          db().prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?')
            .run(item.quantity, item.product_id)
        }
      }

      // Handle credit (full credit sale)
      if (data.payment_method === 'credit' && data.customer_id) {
        db().prepare(`
          INSERT INTO credit_payments (customer_id, sale_id, amount, payment_type, notes, user_id)
          VALUES (?, ?, ?, 'credit', 'Credit sale', ?)
        `).run(data.customer_id, saleId, data.total_amount, data.user_id || null)
        db().prepare('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?')
          .run(data.total_amount, data.customer_id)
      }

      // Handle split payment (partial advance + rest on credit)
      if (data.payment_method === 'split' && data.customer_id) {
        const paidNow = parseFloat(data.paid_amount) || 0
        const creditAmount = data.total_amount - paidNow
        if (creditAmount > 0) {
          db().prepare(`
            INSERT INTO credit_payments (customer_id, sale_id, amount, payment_type, notes, user_id)
            VALUES (?, ?, ?, 'credit', ?, ?)
          `).run(data.customer_id, saleId, creditAmount,
            `Split sale \u2014 Advance: ${paidNow}, Balance due: ${creditAmount}`,
            data.user_id || null)
          db().prepare('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?')
            .run(creditAmount, data.customer_id)
        }
      }

      return { id: saleId, bill_number: billNumber }
    })
    return createSale()
  })

  ipcMain.handle('get-sales', (_, filters: any = {}) => {
    let query = `
      SELECT s.*, c.name as customer_name, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status != 'held'
    `
    const params: any[] = []
    if (filters.start_date) { query += ' AND date(s.created_at) >= ?'; params.push(filters.start_date) }
    if (filters.end_date) { query += ' AND date(s.created_at) <= ?'; params.push(filters.end_date) }
    if (filters.payment_method) { query += ' AND s.payment_method = ?'; params.push(filters.payment_method) }
    if (filters.customer_id) { query += ' AND s.customer_id = ?'; params.push(filters.customer_id) }
    query += ' ORDER BY s.created_at DESC'
    if (filters.limit) { query += ' LIMIT ?'; params.push(filters.limit) }
    return db().prepare(query).all(...params)
  })

  ipcMain.handle('get-sale', (_, id: number) => {
    const sale = db().prepare(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(id)
    const items = db().prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id)
    return { ...(sale as any), items }
  })

  ipcMain.handle('void-sale', (_, id: number) => {
    const voidSale = db().transaction(() => {
      const sale = db().prepare('SELECT * FROM sales WHERE id = ?').get(id) as any
      if (!sale) return { success: false, message: 'Sale not found' }
      if (sale.status === 'voided') return { success: false, message: 'Already voided' }

      db().prepare("UPDATE sales SET status='voided' WHERE id=?").run(id)

      // Restore stock
      const items = db().prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as any[]
      for (const item of items) {
        if (item.product_id) {
          db().prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?')
            .run(item.quantity, item.product_id)
        }
      }

      // Reverse credit
      if (sale.payment_method === 'credit' && sale.customer_id) {
        db().prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?')
          .run(sale.total_amount, sale.customer_id)
      }
      return { success: true }
    })
    return voidSale()
  })

  // Held bills
  ipcMain.handle('hold-bill', (_, data: any) => {
    const result = db().prepare(`
      INSERT INTO held_bills (label, cart_data, customer_id) VALUES (?, ?, ?)
    `).run(data.label || `Hold ${new Date().toLocaleTimeString()}`, JSON.stringify(data.cart), data.customer_id || null)
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('get-held-bills', (_) => {
    return db().prepare(`
      SELECT h.*, c.name as customer_name FROM held_bills h
      LEFT JOIN customers c ON h.customer_id = c.id
      ORDER BY h.created_at DESC
    `).all()
  })

  ipcMain.handle('delete-held-bill', (_, id: number) => {
    db().prepare('DELETE FROM held_bills WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('get-dashboard-stats', (_) => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const todaySales = db().prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as revenue,
      COALESCE(SUM(discount_amount),0) as discounts
      FROM sales WHERE date(created_at) = ? AND status='completed'
    `).get(today) as any

    const yesterdaySales = db().prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as revenue
      FROM sales WHERE date(created_at) = ? AND status='completed'
    `).get(yesterday) as any

    const topProducts = db().prepare(`
      SELECT p.name, SUM(si.quantity) as qty_sold, SUM(si.total_price) as revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE date(s.created_at) = ? AND s.status='completed'
      GROUP BY si.product_id ORDER BY qty_sold DESC LIMIT 5
    `).all(today)

    const lowStock = db().prepare(`
      SELECT COUNT(*) as count FROM products
      WHERE is_active=1 AND stock_quantity <= min_stock_level
    `).get() as any

    const todayExpenses = db().prepare(`
      SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date = ?
    `).get(today) as any

    const todayCOGS = db().prepare(`
      SELECT COALESCE(SUM(si.quantity * p.purchase_price),0) as total
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE date(s.created_at) = ? AND s.status = 'completed'
    `).get(today) as any

    const creditTotal = db().prepare(`
      SELECT COALESCE(SUM(current_balance),0) as total FROM customers WHERE current_balance > 0
    `).get() as any

    return {
      today: { ...todaySales },
      yesterday: { ...yesterdaySales },
      topProducts,
      lowStockCount: lowStock.count,
      todayExpenses: todayExpenses.total,
      todayCOGS: todayCOGS.total,
      totalCredit: creditTotal.total
    }
  })
}
