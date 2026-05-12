import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, percentChange } from '../../utils/currency'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'

function StatCard({ icon, iconBg, label, value, sub, subColor, onClick }: any) {
  return (
    <div className={`stat-card ${onClick ? 'cursor-pointer hover:border-dark-500 transition-all' : ''}`} onClick={onClick}>
      <div className={`stat-icon ${iconBg}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${subColor}`}>{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const currency = useSettingsStore(s => s.get('currency_symbol', '₨'))
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()

  useEffect(() => {
    loadStats()
  }, [selectedDate])

  useEffect(() => {
    const interval = setInterval(loadStats, 60000)
    return () => clearInterval(interval)
  }, [selectedDate])

  const loadStats = async () => {
    try {
      const data = await window.api.getDashboardStats(selectedDate)
      setStats(data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-lg">Loading dashboard...</p>
    </div>
  )

  const fmt = (n: number) => formatCurrency(n, currency)
  const rc = percentChange(stats?.today?.revenue || 0, stats?.yesterday?.revenue || 0)
  const bc = percentChange(stats?.today?.count || 0, stats?.yesterday?.count || 0)

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                {isToday ? 'Dashboard Overview' : `Stats for ${new Date(selectedDate).toLocaleDateString(undefined, { dateStyle: 'long' })}`}
              </h1>
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/settings', { state: { tab: 'backup' } })}
                  title="Manage Database & Settings"
                  className="bg-red-900/40 text-red-400 text-[10px] uppercase font-black px-2 py-0.5 rounded border border-red-800/50 tracking-tighter hover:bg-red-900/60 transition-colors cursor-pointer"
                >
                  Admin
                </button>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              {isToday ? 'Real-time business insights and metrics' : 'Viewing historical data and performance'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-dark-800/50 p-1.5 rounded-xl border border-dark-700">
           <span className="text-gray-400 text-xs font-medium pl-2 uppercase tracking-wider">Filter Date</span>
           <input
             type="date"
             value={selectedDate}
             max={new Date().toISOString().split('T')[0]}
             onChange={(e) => setSelectedDate(e.target.value)}
             className="bg-dark-700 text-white text-sm rounded-lg border-none focus:ring-1 focus:ring-primary-500 px-3 py-1.5 outline-none cursor-pointer"
           />
           {!isToday && (
             <button
               onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
               className="text-xs bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 px-3 py-1.5 rounded-lg font-medium transition-colors"
             >
               Reset to Today
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="💰" iconBg="bg-emerald-900/50 text-emerald-400" label={isToday ? "Today Revenue" : "Revenue"}
          value={fmt(stats?.today?.revenue || 0)}
          sub={`${rc >= 0 ? '▲' : '▼'} ${Math.abs(rc).toFixed(1)}% vs ${isToday ? 'yesterday' : 'prev day'}`}
          subColor={rc >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <StatCard icon="🧾" iconBg="bg-blue-900/50 text-blue-400" label={isToday ? "Today Bills" : "Bills Count"}
          value={String(stats?.today?.count || 0)}
          sub={`${bc >= 0 ? '▲' : '▼'} ${Math.abs(bc).toFixed(1)}% vs ${isToday ? 'yesterday' : 'prev day'}`}
          subColor={bc >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <StatCard icon="⚠️" iconBg="bg-amber-900/50 text-amber-400" label="Low Stock Items"
          value={String(stats?.lowStockCount || 0)} sub="Click to view" subColor="text-amber-400"
          onClick={() => navigate('/products')} />
        <StatCard icon="💳" iconBg="bg-purple-900/50 text-purple-400" label="Total Udhaar"
          value={fmt(stats?.totalCredit || 0)} sub="Outstanding" subColor="text-gray-400"
          onClick={() => navigate('/customers')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="font-semibold text-white mb-4">📊 {isToday ? 'Today vs Yesterday' : 'Selected vs Previous Day'}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">{isToday ? 'Today Revenue' : 'Selected Revenue'}</span>
              <span className="text-emerald-400 font-semibold">{fmt(stats?.today?.revenue||0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{isToday ? 'Yesterday Revenue' : 'Previous Day Revenue'}</span>
              <span className="text-gray-500">{fmt(stats?.yesterday?.revenue||0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bills Count</span>
              <span className="text-white font-semibold">{stats?.today?.count||0}</span>
            </div>
            <div className="divider"/>
            <div className="flex justify-between">
              <span className="text-gray-400">Cost of Goods (COGS)</span>
              <span className="text-orange-400 font-medium">- {fmt(stats?.todayCOGS||0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{isToday ? 'Today Expenses' : 'Selected Day Expenses'}</span>
              <span className="text-red-400 font-medium">- {fmt(stats?.todayExpenses||0)}</span>
            </div>
            <div className="divider"/>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Net Profit Est.</span>
              <span className={`font-bold ${((stats?.today?.revenue||0)-(stats?.todayCOGS||0)-(stats?.todayExpenses||0)) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt((stats?.today?.revenue||0)-(stats?.todayCOGS||0)-(stats?.todayExpenses||0))}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-white mb-4">🏆 Top Products {isToday ? 'Today' : 'on Selected Day'}</h3>
          {stats?.topProducts?.length > 0 ? (
            <div className="space-y-2">
              {stats.topProducts.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-dark-700/50 rounded-lg">
                  <span className="w-6 h-6 bg-primary-600/30 text-primary-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.qty_sold} units</p>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">{fmt(p.revenue)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm text-center py-8">No sales for this date</p>}
        </div>

        <div className="card">
          <h3 className="font-semibold text-white mb-4">⚡ Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'New Sale', icon: '🛒', path: '/pos', color: 'bg-primary-600 hover:bg-primary-500' },
              { label: 'Add Product', icon: '📦', path: '/products', color: 'bg-emerald-700 hover:bg-emerald-600' },
              { label: 'Add Customer', icon: '👤', path: '/customers', color: 'bg-blue-700 hover:bg-blue-600' },
              { label: 'Reports', icon: '📈', path: '/reports', color: 'bg-purple-700 hover:bg-purple-600' },
              { label: 'Expenses', icon: '💸', path: '/expenses', color: 'bg-amber-700 hover:bg-amber-600' },
              { label: 'Purchases', icon: '🏭', path: '/suppliers', color: 'bg-teal-700 hover:bg-teal-600' },
              ...(user?.role === 'admin' ? [{ label: 'Database', icon: '💾', path: '/settings', color: 'bg-red-700 hover:bg-red-600' }] : []),
            ].map((a) => (
              <button key={a.label} onClick={() => navigate(a.path)}
                className={`${a.color} text-white rounded-xl p-3 flex flex-col items-center gap-1 transition-all active:scale-95 cursor-pointer`}>
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
