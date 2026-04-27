// Global type declarations for window.api (exposed via preload)
export {}

declare global {
  interface Window {
    api: {
      // Products
      getProducts: (filters?: any) => Promise<any[]>
      getProduct: (id: number) => Promise<any>
      createProduct: (data: any) => Promise<any>
      updateProduct: (id: number, data: any) => Promise<any>
      deleteProduct: (id: number) => Promise<any>
      searchProducts: (query: string) => Promise<any[]>
      importProductsCSV: (rows: any[]) => Promise<any>
      getLowStockProducts: () => Promise<any[]>
      // Categories
      getCategories: () => Promise<any[]>
      createCategory: (data: any) => Promise<any>
      updateCategory: (id: number, data: any) => Promise<any>
      deleteCategory: (id: number) => Promise<any>
      // Sales
      getSales: (filters?: any) => Promise<any[]>
      getSale: (id: number) => Promise<any>
      createSale: (data: any) => Promise<any>
      voidSale: (id: number) => Promise<any>
      getHeldBills: () => Promise<any[]>
      holdBill: (data: any) => Promise<any>
      deleteHeldBill: (id: number) => Promise<any>
      getDashboardStats: () => Promise<any>
      // Customers
      getCustomers: (filters?: any) => Promise<any[]>
      getCustomer: (id: number) => Promise<any>
      createCustomer: (data: any) => Promise<any>
      updateCustomer: (id: number, data: any) => Promise<any>
      deleteCustomer: (id: number) => Promise<any>
      getCustomerLedger: (id: number) => Promise<any>
      addCreditPayment: (data: any) => Promise<any>
      // Suppliers
      getSuppliers: (filters?: any) => Promise<any[]>
      getSupplier: (id: number) => Promise<any>
      createSupplier: (data: any) => Promise<any>
      updateSupplier: (id: number, data: any) => Promise<any>
      deleteSupplier: (id: number) => Promise<any>
      getPurchases: (filters?: any) => Promise<any[]>
      createPurchase: (data: any) => Promise<any>
      addSupplierPayment: (data: any) => Promise<any>
      // Stock
      getStockAdjustments: () => Promise<any[]>
      addStockAdjustment: (data: any) => Promise<any>
      // Expenses
      getExpenses: (filters?: any) => Promise<any[]>
      createExpense: (data: any) => Promise<any>
      updateExpense: (id: number, data: any) => Promise<any>
      deleteExpense: (id: number) => Promise<any>
      getExpenseCategories: () => Promise<any[]>
      createExpenseCategory: (data: any) => Promise<any>
      // Users
      getUsers: () => Promise<any[]>
      createUser: (data: any) => Promise<any>
      updateUser: (id: number, data: any) => Promise<any>
      deleteUser: (id: number) => Promise<any>
      login: (username: string, password: string) => Promise<any>
      getActivityLog: (filters?: any) => Promise<any[]>
      logActivity: (data: any) => Promise<any>
      // Settings
      getSettings: () => Promise<Record<string, string>>
      updateSettings: (data: Record<string, string>) => Promise<any>
      getSetting: (key: string) => Promise<string | null>
      // Reports
      getSalesReport: (filters: any) => Promise<any>
      getProfitLossReport: (filters: any) => Promise<any>
      getInventoryReport: () => Promise<any[]>
      getTopProducts: (filters: any) => Promise<any[]>
      getCreditReport: () => Promise<any[]>
      getEndOfDayReport: (date: string) => Promise<any>
      // Backup
      backupDatabase: () => Promise<any>
      restoreDatabase: () => Promise<any>
      getAppVersion: () => Promise<string>
      openExternal: (url: string) => Promise<void>
    }
  }
}
