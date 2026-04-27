import { ipcMain } from 'electron'
import { getDb } from '../../database/connection'

export function registerProductHandlers() {
  const db = () => getDb()

  ipcMain.handle('get-products', (_, filters: any = {}) => {
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `
    const params: any[] = []
    if (filters.category_id) { query += ' AND p.category_id = ?'; params.push(filters.category_id) }
    if (filters.search) { query += ' AND (p.name LIKE ? OR p.barcode LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`) }
    query += ' ORDER BY p.name ASC'
    return db().prepare(query).all(...params)
  })

  ipcMain.handle('get-product', (_, id: number) => {
    return db().prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?').get(id)
  })

  ipcMain.handle('search-products', (_, query: string) => {
    return db().prepare(`
      SELECT p.*, c.name as category_name FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND (p.name LIKE ? OR p.barcode = ?)
      LIMIT 20
    `).all(`%${query}%`, query)
  })

  ipcMain.handle('create-product', (_, data: any) => {
    const result = db().prepare(`
      INSERT INTO products (name, barcode, category_id, purchase_price, sale_price, stock_quantity, unit, min_stock_level, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.name, data.barcode || null, data.category_id || null, data.purchase_price, data.sale_price, data.stock_quantity, data.unit || 'pcs', data.min_stock_level || 5, data.description || null)
    return { id: result.lastInsertRowid, ...data }
  })

  ipcMain.handle('update-product', (_, id: number, data: any) => {
    db().prepare(`
      UPDATE products SET name=?, barcode=?, category_id=?, purchase_price=?, sale_price=?,
      stock_quantity=?, unit=?, min_stock_level=?, description=?, updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(data.name, data.barcode || null, data.category_id || null, data.purchase_price, data.sale_price,
      data.stock_quantity, data.unit || 'pcs', data.min_stock_level || 5, data.description || null, id)
    return { success: true }
  })

  ipcMain.handle('delete-product', (_, id: number) => {
    db().prepare('UPDATE products SET is_active=0 WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('get-low-stock-products', (_) => {
    return db().prepare(`
      SELECT p.*, c.name as category_name FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.stock_quantity <= p.min_stock_level
      ORDER BY p.stock_quantity ASC
    `).all()
  })

  ipcMain.handle('import-products-csv', (_, rows: any[]) => {
    const insert = db().prepare(`
      INSERT OR REPLACE INTO products (name, barcode, category_id, purchase_price, sale_price, stock_quantity, unit, min_stock_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const insertMany = db().transaction((items: any[]) => {
      let count = 0
      for (const item of items) {
        try {
          insert.run(item.name, item.barcode || null, item.category_id || null, +item.purchase_price || 0, +item.sale_price || 0, +item.stock_quantity || 0, item.unit || 'pcs', +item.min_stock_level || 5)
          count++
        } catch {}
      }
      return count
    })
    const count = insertMany(rows)
    return { success: true, count }
  })

  // Categories
  ipcMain.handle('get-categories', (_) => {
    return db().prepare('SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id = p.category_id AND p.is_active=1 GROUP BY c.id ORDER BY c.name').all()
  })

  ipcMain.handle('create-category', (_, data: any) => {
    const result = db().prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(data.name, data.description || null)
    return { id: result.lastInsertRowid, ...data }
  })

  ipcMain.handle('update-category', (_, id: number, data: any) => {
    db().prepare('UPDATE categories SET name=?, description=? WHERE id=?').run(data.name, data.description || null, id)
    return { success: true }
  })

  ipcMain.handle('delete-category', (_, id: number) => {
    db().prepare('DELETE FROM categories WHERE id=?').run(id)
    return { success: true }
  })
}
