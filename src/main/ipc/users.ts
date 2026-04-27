import { ipcMain } from 'electron'
import { getDb } from '../../database/connection'

export function registerUserHandlers() {
  const db = () => getDb()

  ipcMain.handle('login', (_, username: string, password: string) => {
    const user = db().prepare(`
      SELECT id, username, full_name, role FROM users
      WHERE username = ? AND password = ? AND is_active = 1
    `).get(username, password)
    if (!user) return { success: false, message: 'Invalid username or password' }
    return { success: true, user }
  })

  ipcMain.handle('get-users', (_) => {
    return db().prepare('SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY full_name').all()
  })

  ipcMain.handle('create-user', (_, data: any) => {
    try {
      const result = db().prepare(`
        INSERT INTO users (username, password, full_name, role)
        VALUES (?, ?, ?, ?)
      `).run(data.username, data.password, data.full_name, data.role)
      return { success: true, id: result.lastInsertRowid }
    } catch (e: any) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('update-user', (_, id: number, data: any) => {
    if (data.password) {
      db().prepare(`
        UPDATE users SET username=?, password=?, full_name=?, role=?, is_active=?, updated_at=datetime('now','localtime') WHERE id=?
      `).run(data.username, data.password, data.full_name, data.role, data.is_active ? 1 : 0, id)
    } else {
      db().prepare(`
        UPDATE users SET username=?, full_name=?, role=?, is_active=?, updated_at=datetime('now','localtime') WHERE id=?
      `).run(data.username, data.full_name, data.role, data.is_active ? 1 : 0, id)
    }
    return { success: true }
  })

  ipcMain.handle('delete-user', (_, id: number) => {
    db().prepare('UPDATE users SET is_active=0 WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('get-activity-log', (_, filters: any = {}) => {
    let query = 'SELECT al.*, u.full_name FROM activity_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1'
    const params: any[] = []
    if (filters.start_date) { query += ' AND date(al.created_at) >= ?'; params.push(filters.start_date) }
    if (filters.end_date) { query += ' AND date(al.created_at) <= ?'; params.push(filters.end_date) }
    if (filters.module) { query += ' AND al.module = ?'; params.push(filters.module) }
    query += ' ORDER BY al.created_at DESC LIMIT 500'
    return db().prepare(query).all(...params)
  })

  ipcMain.handle('log-activity', (_, data: any) => {
    db().prepare(`
      INSERT INTO activity_log (user_id, username, action, module, details) VALUES (?, ?, ?, ?, ?)
    `).run(data.user_id || null, data.username || null, data.action, data.module || null, data.details || null)
    return { success: true }
  })
}
