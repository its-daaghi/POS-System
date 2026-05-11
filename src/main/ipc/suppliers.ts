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

    // Get all purchases for this supplier
    const purchases = db().prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as item_count
      FROM purchases p
      WHERE p.supplier_id = ?
      ORDER BY p.created_at ASC
    `).all(id) as any[]

    // Get all payments for this supplier
    const payments = db().prepare(`
      SELECT sp.*, p.grn_number 
      FROM supplier_payments sp
      LEFT JOIN purchases p ON sp.purchase_id = p.id
      WHERE sp.supplier_id = ?
      ORDER BY sp.created_at ASC
    `).all(id) as any[]

    // Build unified chronological ledger with running balance
    type LedgerEntry = {
      date: string
      type: 'purchase' | 'initial_payment' | 'payment'
      description: string
      debit: number    // amount owed (purchase)
      credit: number   // amount paid
      balance: number  // running balance
      grn_number?: string
      ref_id?: number
    }

    const events: { date: string; sortKey: string; entry: LedgerEntry }[] = []

    for (const p of purchases) {
      // Purchase debit entry
      events.push({
        date: p.created_at,
        sortKey: p.created_at + '_a_purchase_' + p.id,
        entry: {
          date: p.created_at,
          type: 'purchase',
          description: `Purchase ${p.grn_number}${p.notes ? ' — ' + p.notes : ''}`,
          debit: p.total_amount,
          credit: 0,
          balance: 0,
          grn_number: p.grn_number,
          ref_id: p.id
        }
      })
      // Initial payment at time of GRN
      if (p.paid_amount > 0) {
        events.push({
          date: p.created_at,
          sortKey: p.created_at + '_b_initpay_' + p.id,
          entry: {
            date: p.created_at,
            type: 'initial_payment',
            description: `Paid at time of ${p.grn_number}`,
            debit: 0,
            credit: p.paid_amount,
            balance: 0,
            grn_number: p.grn_number,
            ref_id: p.id
          }
        })
      }
    }

    // Add subsequent payments (exclude initial GRN payments already counted)
    for (const pay of payments) {
      events.push({
        date: pay.created_at,
        sortKey: pay.created_at + '_c_payment_' + pay.id,
        entry: {
          date: pay.created_at,
          type: 'payment',
          description: `Payment${pay.grn_number ? ' (ref ' + pay.grn_number + ')' : ''}${pay.notes ? ' — ' + pay.notes : ''}`,
          debit: 0,
          credit: pay.amount,
          balance: 0,
          ref_id: pay.id
        }
      })
    }

    // Sort all events chronologically
    events.sort((a, b) => a.sortKey.localeCompare(b.sortKey))

    // Compute running balance
    let runningBalance = 0
    const ledger: LedgerEntry[] = events.map(ev => {
      runningBalance += ev.entry.debit - ev.entry.credit
      return { ...ev.entry, balance: runningBalance }
    })

    return { supplier, ledger, purchases, payments }
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
        // Note: Stock is managed independently in the Products section
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
