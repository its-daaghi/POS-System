import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pos': 'Point of Sale',
  '/products': 'Products & Inventory',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/reports': 'Reports',
  '/expenses': 'Expenses',
  '/settings': 'Settings'
}

export default function TopBar() {
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const title = pageTitles[location.pathname] || 'POS System'
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="h-14 bg-dark-800 border-b border-dark-700 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-6 text-sm text-gray-400">
        <span>📅 {dateStr}</span>
        <span className="font-mono text-primary-400">🕐 {timeStr}</span>
        <span className="text-white font-medium">👤 {user?.full_name}</span>
      </div>
    </div>
  )
}
