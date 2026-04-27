import React, { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { useSettingsStore } from './store/settingsStore'
import Layout from './components/Layout/Layout'
import LoginPage from './pages/Login/LoginPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import POSPage from './pages/POS/POSPage'
import ProductsPage from './pages/Products/ProductsPage'
import CustomersPage from './pages/Customers/CustomersPage'
import SuppliersPage from './pages/Suppliers/SuppliersPage'
import ReportsPage from './pages/Reports/ReportsPage'
import ExpensesPage from './pages/Expenses/ExpensesPage'
import SettingsPage from './pages/Settings/SettingsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const loadSettings = useSettingsStore(s => s.load)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) loadSettings()
  }, [isAuthenticated])

  return (
    <HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '12px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </HashRouter>
  )
}
