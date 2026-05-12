import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import Modal from '../../components/Modal/Modal'
import toast from 'react-hot-toast'

const TABS = ['store', 'tax', 'users', 'security', 'backup'] as const
type Tab = typeof TABS[number]

const emptyUser = { username: '', password: '', full_name: '', role: 'cashier', is_active: true }

export default function SettingsPage() {
  const location = useLocation()
  const initialTab = (location.state as any)?.tab as Tab
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab) ? initialTab : 'store')
  const [users, setUsers] = useState<any[]>([])
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [userForm, setUserForm] = useState(emptyUser)
  const [version, setVersion] = useState('')
  const { settings, update, load } = useSettingsStore()
  const currentUser = useAuthStore(s => s.user)

  const [storeForm, setStoreForm] = useState({
    store_name: '', store_address: '', store_phone: '',
    currency_symbol: '₨', receipt_footer: '', low_stock_threshold: '5',
    bill_prefix: 'BILL-', grn_prefix: 'GRN-', receipt_width: '80'
  })
  const [taxForm, setTaxForm] = useState({ tax_enabled: '0', tax_percent: '0', tax_name: 'GST' })

  useEffect(() => {
    load()
    loadUsers()
    window.api.getAppVersion().then(setVersion)
  }, [])

  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      setStoreForm({
        store_name: settings.store_name || '',
        store_address: settings.store_address || '',
        store_phone: settings.store_phone || '',
        currency_symbol: settings.currency_symbol || '₨',
        receipt_footer: settings.receipt_footer || '',
        low_stock_threshold: settings.low_stock_threshold || '5',
        bill_prefix: settings.bill_prefix || 'BILL-',
        grn_prefix: settings.grn_prefix || 'GRN-',
        receipt_width: settings.receipt_width || '80'
      })
      setTaxForm({ tax_enabled: settings.tax_enabled || '0', tax_percent: settings.tax_percent || '0', tax_name: settings.tax_name || 'GST' })
    }
  }, [settings])

  const loadUsers = async () => setUsers(await window.api.getUsers())
  const loadLog = async () => setActivityLog(await window.api.getActivityLog())

  const saveStore = async () => { await update(storeForm); toast.success('Store settings saved') }
  const saveTax = async () => { await update(taxForm); toast.success('Tax settings saved') }

  const handleSaveUser = async () => {
    if (!userForm.username || !userForm.full_name) { toast.error('Username and full name required'); return }
    if (!editingUser && !userForm.password) { toast.error('Password required for new user'); return }
    const data = { ...userForm, is_active: userForm.is_active ? 1 : 0 }
    if (editingUser) {
      const res = await window.api.updateUser(editingUser.id, data)
      if (res.success) toast.success('User updated')
    } else {
      const res = await window.api.createUser(data)
      if (res.success) toast.success('User created'); else toast.error(res.message || 'Failed')
    }
    setShowUserModal(false); loadUsers()
  }

  const handleDeleteUser = async (id: number) => {
    if (id === currentUser?.id) { toast.error('Cannot delete yourself'); return }
    if (!confirm('Deactivate this user?')) return
    await window.api.deleteUser(id); toast.success('User deactivated'); loadUsers()
  }

  const handleBackup = async () => {
    const res = await window.api.backupDatabase()
    if (res.success) toast.success(`Backup saved: ${res.path}`)
    else toast.error('Backup cancelled')
  }

  const handleRestore = async () => {
    if (!confirm('Restore will restart the app and replace current data. Continue?')) return
    const res = await window.api.restoreDatabase()
    if (!res.success) toast.error('Restore cancelled')
  }

  const TAB_LABELS: Record<Tab, string> = { store: '🏪 Store', tax: '💲 Tax', users: '👥 Users', security: '🔒 Activity Log', backup: '💾 Backup' }
  const roleColor: Record<string, string> = { admin: 'badge-red', manager: 'badge-blue', cashier: 'badge-green' }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">⚙️ Settings</h1>
        <span className="text-xs text-gray-500">v{version}</span>
      </div>

      <div className="flex gap-1 bg-dark-800 p-1 rounded-xl w-fit border border-dark-700 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'security') loadLog() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Store Settings */}
      {tab === 'store' && (
        <div className="card max-w-2xl space-y-4">
          <h3 className="font-semibold text-white">Store Information</h3>
          <div className="form-row">
            <div className="form-group"><label className="label">Store Name</label><input className="input" value={storeForm.store_name} onChange={e => setStoreForm({ ...storeForm, store_name: e.target.value })} /></div>
            <div className="form-group"><label className="label">Phone</label><input className="input" value={storeForm.store_phone} onChange={e => setStoreForm({ ...storeForm, store_phone: e.target.value })} /></div>
          </div>
          <div className="form-group"><label className="label">Address</label><input className="input" value={storeForm.store_address} onChange={e => setStoreForm({ ...storeForm, store_address: e.target.value })} /></div>
          <div className="form-group"><label className="label">Receipt Footer Message</label><input className="input" value={storeForm.receipt_footer} onChange={e => setStoreForm({ ...storeForm, receipt_footer: e.target.value })} placeholder="e.g. Thank you for shopping!" /></div>
          <div className="form-row">
            <div className="form-group"><label className="label">Currency Symbol</label><input className="input" value={storeForm.currency_symbol} onChange={e => setStoreForm({ ...storeForm, currency_symbol: e.target.value })} /></div>
            <div className="form-group"><label className="label">Receipt Width (mm)</label>
              <select className="input" value={storeForm.receipt_width} onChange={e => setStoreForm({ ...storeForm, receipt_width: e.target.value })}>
                <option value="58">58mm (Small)</option>
                <option value="80">80mm (Standard)</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Bill Prefix</label><input className="input" value={storeForm.bill_prefix} onChange={e => setStoreForm({ ...storeForm, bill_prefix: e.target.value })} /></div>
            <div className="form-group"><label className="label">GRN Prefix</label><input className="input" value={storeForm.grn_prefix} onChange={e => setStoreForm({ ...storeForm, grn_prefix: e.target.value })} /></div>
          </div>
          <div className="form-group"><label className="label">Low Stock Alert Threshold</label><input className="input" type="number" value={storeForm.low_stock_threshold} onChange={e => setStoreForm({ ...storeForm, low_stock_threshold: e.target.value })} /></div>
          <button onClick={saveStore} className="btn-primary">💾 Save Store Settings</button>
        </div>
      )}

      {/* Tax Settings */}
      {tab === 'tax' && (
        <div className="card max-w-md space-y-4">
          <h3 className="font-semibold text-white">Tax Configuration</h3>
          <div className="form-group">
            <label className="label">Enable Tax</label>
            <div className="flex items-center gap-3 mt-1">
              <button onClick={() => setTaxForm({ ...taxForm, tax_enabled: taxForm.tax_enabled === '1' ? '0' : '1' })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${taxForm.tax_enabled === '1' ? 'bg-primary-600' : 'bg-dark-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${taxForm.tax_enabled === '1' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-gray-300">{taxForm.tax_enabled === '1' ? 'Tax Enabled' : 'Tax Disabled'}</span>
            </div>
          </div>
          {taxForm.tax_enabled === '1' && (
            <>
              <div className="form-row">
                <div className="form-group"><label className="label">Tax Name</label><input className="input" value={taxForm.tax_name} onChange={e => setTaxForm({ ...taxForm, tax_name: e.target.value })} placeholder="GST, VAT..." /></div>
                <div className="form-group"><label className="label">Tax %</label><input className="input" type="number" value={taxForm.tax_percent} onChange={e => setTaxForm({ ...taxForm, tax_percent: e.target.value })} /></div>
              </div>
            </>
          )}
          <button onClick={saveTax} className="btn-primary">💾 Save Tax Settings</button>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-gray-400 text-sm">{users.length} user accounts</p>
            <button onClick={() => { setEditingUser(null); setUserForm(emptyUser); setShowUserModal(true) }} className="btn-primary">+ Add User</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map(u => (
              <div key={u.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 bg-dark-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{u.full_name}</p>
                  <p className="text-xs text-gray-500">@{u.username}</p>
                  <div className="flex gap-1 mt-1">
                    <span className={roleColor[u.role]}>{u.role}</span>
                    {!u.is_active && <span className="badge-gray">Inactive</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => { setEditingUser(u); setUserForm({ username: u.username, password: '', full_name: u.full_name, role: u.role, is_active: u.is_active === 1 }); setShowUserModal(true) }} className="btn-secondary btn-sm">Edit</button>
                  {u.id !== currentUser?.id && <button onClick={() => handleDeleteUser(u.id)} className="btn-danger btn-sm">Del</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      {tab === 'security' && (
        <div className="space-y-3">
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Details</th></tr></thead>
              <tbody>
                {activityLog.length === 0
                  ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No activity log yet</td></tr>
                  : activityLog.map(log => (
                  <tr key={log.id}>
                    <td className="text-xs text-gray-400 font-mono">{log.created_at}</td>
                    <td className="text-white font-medium text-sm">{log.username || '-'}</td>
                    <td className="text-gray-300 text-sm">{log.action}</td>
                    <td><span className="badge-blue text-xs">{log.module || '-'}</span></td>
                    <td className="text-xs text-gray-500">{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Backup & Restore */}
      {tab === 'backup' && (
        <div className="max-w-lg space-y-4">
          <div className="card space-y-3">
            <h3 className="font-semibold text-white">💾 Database Backup</h3>
            <p className="text-sm text-gray-400">Save a copy of your database to a safe location. Includes all products, sales, customers, and settings.</p>
            <button onClick={handleBackup} className="btn-primary w-full">📥 Backup Database</button>
          </div>
          <div className="card space-y-3 border-red-800/50">
            <h3 className="font-semibold text-white">⚠️ Restore Database</h3>
            <p className="text-sm text-red-400">Warning: This will replace all current data with the backup. The app will restart automatically.</p>
            <button onClick={handleRestore} className="btn-danger w-full">📤 Restore from Backup</button>
          </div>
          {currentUser?.role === 'admin' && (
            <div className="card space-y-3 border-primary-800/30">
              <h3 className="font-semibold text-white">📁 Advanced Management</h3>
              <p className="text-sm text-gray-400">Directly access the database file on your computer for manual management or troubleshooting.</p>
              <button onClick={() => window.api.openDatabaseFolder()} className="btn-secondary w-full">📂 Open Database Folder</button>
            </div>
          )}
          <div className="card space-y-2">
            <h3 className="font-semibold text-white text-sm">App Information</h3>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Version: <span className="text-white">{version}</span></p>
              <p>Database: <span className="text-primary-400">SQLite (Local)</span></p>
              <p>Mode: <span className="text-emerald-400">Fully Offline</span></p>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={editingUser ? 'Edit User' : 'Add User'} size="sm"
        footer={<><button onClick={() => setShowUserModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSaveUser} className="btn-primary">💾 Save</button></>}>
        <div className="space-y-3">
          <div className="form-group"><label className="label">Full Name *</label><input className="input" value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} /></div>
          <div className="form-group"><label className="label">Username *</label><input className="input" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} /></div>
          <div className="form-group"><label className="label">{editingUser ? 'New Password (leave blank to keep)' : 'Password *'}</label><input className="input" type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} /></div>
          <div className="form-group"><label className="label">Role</label>
            <select className="input" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
              <option value="cashier">Cashier (POS only)</option>
              <option value="manager">Manager (POS + Reports)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
          </div>
          {editingUser && (
            <div className="flex items-center gap-3">
              <button onClick={() => setUserForm({ ...userForm, is_active: !userForm.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${userForm.is_active ? 'bg-primary-600' : 'bg-dark-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${userForm.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-gray-300">{userForm.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
