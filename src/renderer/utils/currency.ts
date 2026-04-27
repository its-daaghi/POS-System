// Currency formatting utility
export function formatCurrency(amount: number, symbol = '₨'): string {
  return `${symbol} ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function yesterday(): string {
  return new Date(Date.now() - 86400000).toISOString().split('T')[0]
}

export function startOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}
