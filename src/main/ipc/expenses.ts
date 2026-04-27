import { ipcMain } from 'electron'
import { getDb } from '../../database/connection'

export function registerExpenseHandlers() {
  const db = () => getDb()

  ipcMain.handle('get-expenses', (_, filters: any = {}) => {
    let query = `
      SELECT e.*, ec.name as category_name FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id WHERE 1=1
    `
    const params: any[] = []
    if (filters.start_date) { query += ' AND e.expense_date >= ?'; params.push(filters.start_date) }
    if (filters.end_date) { query += ' AND e.expense_date <= ?'; params.push(filters.end_date) }
    if (filters.category_id) { query += ' AND e.category_id = ?'; params.push(filters.category_id) }
    query += ' ORDER BY e.expense_date DESC, e.created_at DESC'
    return db().prepare(query).all(...params)
  })

  ipcMain.handle('create-expense', (_, data: any) => {
    const result = db().prepare(`
      INSERT INTO expenses (category_id, amount, description, expense_date, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.category_id || null, data.amount, data.description || null, data.expense_date, data.user_id || null)
    return { id: result.lastInsertRowid, ...data }
  })

  ipcMain.handle('update-expense', (_, id: number, data: any) => {
    db().prepare(`
      UPDATE expenses SET category_id=?, amount=?, description=?, expense_date=? WHERE id=?
    `).run(data.category_id || null, data.amount, data.description || null, data.expense_date, id)
    return { success: true }
  })

  ipcMain.handle('delete-expense', (_, id: number) => {
    db().prepare('DELETE FROM expenses WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('get-expense-categories', (_) => {
    return db().prepare('SELECT ec.*, COUNT(e.id) as expense_count FROM expense_categories ec LEFT JOIN expenses e ON e.category_id = ec.id GROUP BY ec.id ORDER BY ec.name').all()
  })

  ipcMain.handle('create-expense-category', (_, data: any) => {
    const result = db().prepare('INSERT INTO expense_categories (name, description) VALUES (?, ?)').run(data.name, data.description || null)
    return { id: result.lastInsertRowid, ...data }
  })
}
