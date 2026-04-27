import { ipcMain } from 'electron'
import { getDb } from '../../database/connection'

export function registerStockHandlers() {
  const db = () => getDb()

  ipcMain.handle('get-stock-adjustments', (_) => {
    return db().prepare(`
      SELECT sa.*, p.name as product_name, u.full_name as user_name
      FROM stock_adjustments sa
      LEFT JOIN products p ON sa.product_id = p.id
      LEFT JOIN users u ON sa.user_id = u.id
      ORDER BY sa.created_at DESC LIMIT 200
    `).all()
  })

  ipcMain.handle('add-stock-adjustment', (_, data: any) => {
    const adjust = db().transaction(() => {
      db().prepare(`
        INSERT INTO stock_adjustments (product_id, adjustment_type, quantity, notes, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(data.product_id, data.adjustment_type, data.quantity, data.notes || null, data.user_id || null)

      const delta = data.adjustment_type === 'add' || data.adjustment_type === 'return'
        ? data.quantity : -Math.abs(data.quantity)

      db().prepare("UPDATE products SET stock_quantity = stock_quantity + ?, updated_at=datetime('now','localtime') WHERE id=?")
        .run(delta, data.product_id)
      return { success: true }
    })
    return adjust()
  })
}
