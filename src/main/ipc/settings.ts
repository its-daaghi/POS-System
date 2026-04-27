import { ipcMain } from 'electron'
import { getDb } from '../../database/connection'

export function registerSettingsHandlers() {
  const db = () => getDb()

  ipcMain.handle('get-settings', (_) => {
    const rows = db().prepare('SELECT key, value FROM settings').all() as any[]
    const settings: Record<string, string> = {}
    for (const row of rows) settings[row.key] = row.value
    return settings
  })

  ipcMain.handle('get-setting', (_, key: string) => {
    const row = db().prepare('SELECT value FROM settings WHERE key=?').get(key) as any
    return row?.value || null
  })

  ipcMain.handle('update-settings', (_, data: Record<string, string>) => {
    const upsert = db().prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))")
    const updateAll = db().transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) upsert.run(key, value)
    })
    updateAll(Object.entries(data))
    return { success: true }
  })
}
