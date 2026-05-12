import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, copyFileSync } from 'fs'
import { initDatabase } from '../database/connection'

// IPC handlers
import { registerProductHandlers } from './ipc/products'
import { registerSaleHandlers } from './ipc/sales'
import { registerCustomerHandlers } from './ipc/customers'
import { registerSupplierHandlers } from './ipc/suppliers'
import { registerExpenseHandlers } from './ipc/expenses'
import { registerUserHandlers } from './ipc/users'
import { registerSettingsHandlers } from './ipc/settings'
import { registerReportHandlers } from './ipc/reports'
import { registerStockHandlers } from './ipc/stock'

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    backgroundColor: '#0a0f1e',
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: join(__dirname, '../../resources/icon.ico')
  })

  mainWindow.maximize()
  mainWindow.show()

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // Initialize database
  const dbPath = isDev
    ? join(__dirname, '../../pos_database.db')
    : join(app.getPath('userData'), 'pos_database.db')

  initDatabase(dbPath)

  // Register all IPC handlers
  registerProductHandlers()
  registerSaleHandlers()
  registerCustomerHandlers()
  registerSupplierHandlers()
  registerExpenseHandlers()
  registerUserHandlers()
  registerSettingsHandlers()
  registerReportHandlers()
  registerStockHandlers()

  // Backup/restore handlers
  ipcMain.handle('backup-database', async () => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Save Database Backup',
      defaultPath: `pos_backup_${new Date().toISOString().split('T')[0]}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }]
    })
    if (filePath) {
      const dbPath = isDev
        ? join(__dirname, '../../pos_database.db')
        : join(app.getPath('userData'), 'pos_database.db')
      copyFileSync(dbPath, filePath)
      return { success: true, path: filePath }
    }
    return { success: false }
  })

  ipcMain.handle('restore-database', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Select Database Backup',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile']
    })
    if (filePaths.length > 0) {
      const dbPath = isDev
        ? join(__dirname, '../../pos_database.db')
        : join(app.getPath('userData'), 'pos_database.db')
      copyFileSync(filePaths[0], dbPath)
      app.relaunch()
      app.exit()
      return { success: true }
    }
    return { success: false }
  })

  ipcMain.handle('open-external', async (_, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('open-database-folder', async () => {
    const dbPath = isDev
      ? join(__dirname, '../../pos_database.db')
      : join(app.getPath('userData'), 'pos_database.db')
    shell.showItemInFolder(dbPath)
  })

  ipcMain.handle('get-app-version', () => app.getVersion())

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
