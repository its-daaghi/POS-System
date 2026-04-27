import { ipcMain } from 'electron'
import { getDb } from '../../database/connection'

export function registerReportHandlers() {
  const db = () => getDb()

  ipcMain.handle('get-sales-report', (_, filters: any) => {
    const params: any[] = []
    let dateFilter = 'WHERE s.status = \'completed\''
    if (filters.start_date) { dateFilter += ' AND date(s.created_at) >= ?'; params.push(filters.start_date) }
    if (filters.end_date) { dateFilter += ' AND date(s.created_at) <= ?'; params.push(filters.end_date) }

    const summary = db().prepare(`
      SELECT
        COUNT(*) as total_bills,
        COALESCE(SUM(s.total_amount),0) as total_revenue,
        COALESCE(SUM(s.discount_amount),0) as total_discounts,
        COALESCE(SUM(s.tax_amount),0) as total_tax,
        COALESCE(AVG(s.total_amount),0) as avg_bill
      FROM sales s ${dateFilter}
    `).get(...params) as any

    const byPayment = db().prepare(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total_amount),0) as total
      FROM sales s ${dateFilter}
      GROUP BY payment_method
    `).all(...params)

    const byDay = db().prepare(`
      SELECT date(s.created_at) as sale_date, COUNT(*) as bills, COALESCE(SUM(total_amount),0) as revenue
      FROM sales s ${dateFilter}
      GROUP BY date(s.created_at)
      ORDER BY sale_date
    `).all(...params)

    const sales = db().prepare(`
      SELECT s.*, c.name as customer_name FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ${dateFilter} ORDER BY s.created_at DESC LIMIT 500
    `).all(...params)

    return { summary, byPayment, byDay, sales }
  })

  ipcMain.handle('get-profit-loss-report', (_, filters: any) => {
    const params: any[] = []
    let dateFilter = 'WHERE s.status = \'completed\''
    if (filters.start_date) { dateFilter += ' AND date(s.created_at) >= ?'; params.push(filters.start_date) }
    if (filters.end_date) { dateFilter += ' AND date(s.created_at) <= ?'; params.push(filters.end_date) }

    const revenue = db().prepare(`
      SELECT COALESCE(SUM(total_amount),0) as total FROM sales s ${dateFilter}
    `).get(...params) as any

    const cogs = db().prepare(`
      SELECT COALESCE(SUM(si.quantity * p.purchase_price),0) as total
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      ${dateFilter}
    `).get(...params) as any

    const expParams: any[] = []
    let expFilter = 'WHERE 1=1'
    if (filters.start_date) { expFilter += ' AND expense_date >= ?'; expParams.push(filters.start_date) }
    if (filters.end_date) { expFilter += ' AND expense_date <= ?'; expParams.push(filters.end_date) }

    const expenses = db().prepare(`
      SELECT COALESCE(SUM(amount),0) as total FROM expenses ${expFilter}
    `).get(...expParams) as any

    const expenseByCategory = db().prepare(`
      SELECT ec.name as category, COALESCE(SUM(e.amount),0) as total
      FROM expenses e LEFT JOIN expense_categories ec ON e.category_id = ec.id
      ${expFilter} GROUP BY e.category_id ORDER BY total DESC
    `).all(...expParams)

    const grossProfit = revenue.total - cogs.total
    const netProfit = grossProfit - expenses.total

    return {
      revenue: revenue.total,
      cogs: cogs.total,
      grossProfit,
      expenses: expenses.total,
      netProfit,
      expenseByCategory
    }
  })

  ipcMain.handle('get-inventory-report', (_) => {
    return db().prepare(`
      SELECT p.*, c.name as category_name,
        p.stock_quantity * p.purchase_price as stock_value,
        p.stock_quantity * p.sale_price as retail_value
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY stock_value DESC
    `).all()
  })

  ipcMain.handle('get-top-products', (_, filters: any) => {
    const params: any[] = []
    let dateFilter = 'WHERE s.status = \'completed\''
    if (filters.start_date) { dateFilter += ' AND date(s.created_at) >= ?'; params.push(filters.start_date) }
    if (filters.end_date) { dateFilter += ' AND date(s.created_at) <= ?'; params.push(filters.end_date) }

    return db().prepare(`
      SELECT
        si.product_id, si.product_name,
        SUM(si.quantity) as total_qty,
        SUM(si.total_price) as total_revenue,
        SUM(si.quantity * COALESCE(p.purchase_price, 0)) as total_cost,
        SUM(si.total_price) - SUM(si.quantity * COALESCE(p.purchase_price, 0)) as profit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      ${dateFilter}
      GROUP BY si.product_id
      ORDER BY total_qty DESC LIMIT 20
    `).all(...params)
  })

  ipcMain.handle('get-credit-report', (_) => {
    return db().prepare(`
      SELECT c.*,
        (SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE customer_id=c.id AND status='completed') as total_purchased,
        (SELECT COALESCE(SUM(amount),0) FROM credit_payments WHERE customer_id=c.id AND payment_type='payment') as total_paid
      FROM customers c WHERE c.current_balance > 0
      ORDER BY c.current_balance DESC
    `).all()
  })

  ipcMain.handle('get-end-of-day-report', (_, date: string) => {
    const sales = db().prepare(`
      SELECT s.*, c.name as customer_name FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE date(s.created_at) = ? AND s.status='completed'
      ORDER BY s.created_at
    `).all(date) as any[]

    const summary = db().prepare(`
      SELECT
        COUNT(*) as total_bills,
        COALESCE(SUM(total_amount),0) as total_revenue,
        COALESCE(SUM(discount_amount),0) as total_discounts,
        COALESCE(SUM(CASE WHEN payment_method='cash' THEN total_amount END),0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method='card' THEN total_amount END),0) as card_total,
        COALESCE(SUM(CASE WHEN payment_method='credit' THEN total_amount END),0) as credit_total
      FROM sales WHERE date(created_at)=? AND status='completed'
    `).get(date) as any

    const expenses = db().prepare(`
      SELECT e.*, ec.name as category_name FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id=ec.id
      WHERE e.expense_date=?
    `).all(date)

    const expTotal = db().prepare("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date=?").get(date) as any

    return { date, sales, summary, expenses, expTotal: expTotal.total }
  })
}
