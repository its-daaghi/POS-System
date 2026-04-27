import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', permission: 'dashboard' },
  { path: '/pos', label: 'Point of Sale', icon: '🛒', permission: 'pos' },
  { path: '/products', label: 'Products', icon: '📦', permission: 'products' },
  { path: '/customers', label: 'Customers', icon: '👥', permission: 'customers' },
  { path: '/suppliers', label: 'Suppliers', icon: '🏭', permission: 'suppliers' },
  { path: '/reports', label: 'Reports', icon: '📈', permission: 'reports' },
  { path: '/expenses', label: 'Expenses', icon: '💸', permission: 'expenses' },
  { path: '/settings', label: 'Settings', icon: '⚙️', permission: 'settings' }
]

export default function Sidebar() {
  const { user, logout, hasPermission } = useAuthStore()
  const storeName = useSettingsStore(s => s.get('store_name', 'POS System'))
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleColor: Record<string, string> = {
    admin: 'badge-red',
    manager: 'badge-blue',
    cashier: 'badge-green'
  }

  return (
    <div className="w-60 bg-dark-800 border-r border-dark-700 flex flex-col h-full">
      {/* Logo / Store Name */}
      <div className="p-5 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-900/50">
            P
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">{storeName}</p>
            <p className="text-xs text-gray-500">POS System v1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          if (!hasPermission(item.permission)) return null
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-dark-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-dark-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
            <span className={`${roleColor[user?.role || 'cashier']} mt-0.5`}>
              {user?.role}
            </span>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-ghost btn w-full text-xs justify-center">
          🚪 Logout
        </button>
      </div>
    </div>
  )
}
