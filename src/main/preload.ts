import { contextBridge, ipcRenderer } from 'electron'

// Expose safe API to renderer via window.api
contextBridge.exposeInMainWorld('api', {
  // Products
  getProducts: (filters?: any) => ipcRenderer.invoke('get-products', filters),
  getProduct: (id: number) => ipcRenderer.invoke('get-product', id),
  createProduct: (data: any) => ipcRenderer.invoke('create-product', data),
  updateProduct: (id: number, data: any) => ipcRenderer.invoke('update-product', id, data),
  deleteProduct: (id: number) => ipcRenderer.invoke('delete-product', id),
  searchProducts: (query: string) => ipcRenderer.invoke('search-products', query),
  importProductsCSV: (csvData: any[]) => ipcRenderer.invoke('import-products-csv', csvData),
  getLowStockProducts: () => ipcRenderer.invoke('get-low-stock-products'),

  // Categories
  getCategories: () => ipcRenderer.invoke('get-categories'),
  createCategory: (data: any) => ipcRenderer.invoke('create-category', data),
  updateCategory: (id: number, data: any) => ipcRenderer.invoke('update-category', id, data),
  deleteCategory: (id: number) => ipcRenderer.invoke('delete-category', id),

  // Sales
  getSales: (filters?: any) => ipcRenderer.invoke('get-sales', filters),
  getSale: (id: number) => ipcRenderer.invoke('get-sale', id),
  createSale: (data: any) => ipcRenderer.invoke('create-sale', data),
  voidSale: (id: number) => ipcRenderer.invoke('void-sale', id),
  getHeldBills: () => ipcRenderer.invoke('get-held-bills'),
  holdBill: (data: any) => ipcRenderer.invoke('hold-bill', data),
  deleteHeldBill: (id: number) => ipcRenderer.invoke('delete-held-bill', id),
  getDashboardStats: (date?: string) => ipcRenderer.invoke('get-dashboard-stats', date),

  // Customers
  getCustomers: (filters?: any) => ipcRenderer.invoke('get-customers', filters),
  getCustomer: (id: number) => ipcRenderer.invoke('get-customer', id),
  createCustomer: (data: any) => ipcRenderer.invoke('create-customer', data),
  updateCustomer: (id: number, data: any) => ipcRenderer.invoke('update-customer', id, data),
  deleteCustomer: (id: number) => ipcRenderer.invoke('delete-customer', id),
  getCustomerLedger: (id: number) => ipcRenderer.invoke('get-customer-ledger', id),
  addCreditPayment: (data: any) => ipcRenderer.invoke('add-credit-payment', data),
  getTotalOutstanding: () => ipcRenderer.invoke('get-total-outstanding'),

  // Suppliers
  getSuppliers: (filters?: any) => ipcRenderer.invoke('get-suppliers', filters),
  getSupplier: (id: number) => ipcRenderer.invoke('get-supplier', id),
  createSupplier: (data: any) => ipcRenderer.invoke('create-supplier', data),
  updateSupplier: (id: number, data: any) => ipcRenderer.invoke('update-supplier', id, data),
  deleteSupplier: (id: number) => ipcRenderer.invoke('delete-supplier', id),
  getPurchases: (filters?: any) => ipcRenderer.invoke('get-purchases', filters),
  createPurchase: (data: any) => ipcRenderer.invoke('create-purchase', data),
  getPurchaseItems: (purchaseId: number) => ipcRenderer.invoke('get-purchase-items', purchaseId),
  addSupplierPayment: (data: any) => ipcRenderer.invoke('add-supplier-payment', data),

  // Stock
  getStockAdjustments: () => ipcRenderer.invoke('get-stock-adjustments'),
  addStockAdjustment: (data: any) => ipcRenderer.invoke('add-stock-adjustment', data),

  // Expenses
  getExpenses: (filters?: any) => ipcRenderer.invoke('get-expenses', filters),
  createExpense: (data: any) => ipcRenderer.invoke('create-expense', data),
  updateExpense: (id: number, data: any) => ipcRenderer.invoke('update-expense', id, data),
  deleteExpense: (id: number) => ipcRenderer.invoke('delete-expense', id),
  getExpenseCategories: () => ipcRenderer.invoke('get-expense-categories'),
  createExpenseCategory: (data: any) => ipcRenderer.invoke('create-expense-category', data),

  // Users
  getUsers: () => ipcRenderer.invoke('get-users'),
  createUser: (data: any) => ipcRenderer.invoke('create-user', data),
  updateUser: (id: number, data: any) => ipcRenderer.invoke('update-user', id, data),
  deleteUser: (id: number) => ipcRenderer.invoke('delete-user', id),
  login: (username: string, password: string) => ipcRenderer.invoke('login', username, password),
  getActivityLog: (filters?: any) => ipcRenderer.invoke('get-activity-log', filters),
  logActivity: (data: any) => ipcRenderer.invoke('log-activity', data),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (data: any) => ipcRenderer.invoke('update-settings', data),
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),

  // Reports
  getSalesReport: (filters: any) => ipcRenderer.invoke('get-sales-report', filters),
  getProfitLossReport: (filters: any) => ipcRenderer.invoke('get-profit-loss-report', filters),
  getInventoryReport: () => ipcRenderer.invoke('get-inventory-report'),
  getTopProducts: (filters: any) => ipcRenderer.invoke('get-top-products', filters),
  getCreditReport: () => ipcRenderer.invoke('get-credit-report'),
  getEndOfDayReport: (date: string) => ipcRenderer.invoke('get-end-of-day-report', date),

  // Backup / Restore
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: () => ipcRenderer.invoke('restore-database'),
  openDatabaseFolder: () => ipcRenderer.invoke('open-database-folder'),

  // App
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url)
})

// TypeScript type declaration
export type ApiType = typeof import('./preload')
