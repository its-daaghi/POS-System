import React, { useState, useEffect } from 'react'
import Modal from '../../components/Modal/Modal'
import { formatCurrency, formatDate, todayStr } from '../../utils/currency'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const emptyForm = { category_id: '', amount: '', description: '', expense_date: todayStr() }

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [catForm, setCatForm] = useState({ name: '', description: '' })
  const [filterStart, setFilterStart] = useState(todayStr())
  const [filterEnd, setFilterEnd] = useState(todayStr())
  const currency = useSettingsStore(s => s.get('currency_symbol', '₨'))
  const user = useAuthStore(s => s.user)
  const fmt = (n: number) => formatCurrency(n, currency)

  useEffect(() => { load() }, [filterStart, filterEnd])

  const load = async () => {
    const [e, c] = await Promise.all([
      window.api.getExpenses({ start_date: filterStart, end_date: filterEnd }),
      window.api.getExpenseCategories()
    ])
    setExpenses(e); setCategories(c)
  }

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, expense_date: todayStr() }); setShowModal(true) }
  const openEdit = (e: any) => {
    setEditing(e)
    setForm({ category_id: e.category_id || '', amount: e.amount, description: e.description || '', expense_date: e.expense_date })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter valid amount'); return }
    const data = { ...form, amount: parseFloat(form.amount), category_id: form.category_id || null, user_id: user?.id }
    if (editing) { await window.api.updateExpense(editing.id, data) } else { await window.api.createExpense(data) }
    toast.success(editing ? 'Updated' : 'Expense added')
    setShowModal(false); load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete expense?')) return
    await window.api.deleteExpense(id); toast.success('Deleted'); load()
  }

  const handleCatSave = async () => {
    if (!catForm.name) { toast.error('Name required'); return }
    await window.api.createExpenseCategory(catForm)
    toast.success('Category added'); setShowCatModal(false); load()
  }

  const byCategory = categories.map(c => ({
    ...c,
    total: expenses.filter(e => e.category_id === c.id).reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">💸 Expenses</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCatModal(true)} className="btn-secondary">🏷️ Categories</button>
          <button onClick={openAdd} className="btn-primary">+ Add Expense</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="form-group">
          <label className="label">From</label>
          <input type="date" className="input" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">To</label>
          <input type="date" className="input" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
        </div>
        <div className="flex gap-1 mb-0.5">
          {[
            ['Today', todayStr(), todayStr()],
            ['This Month', new Date().toISOString().slice(0, 7) + '-01', todayStr()],
          ].map(([l, s, e]) => (
            <button key={l} onClick={() => { setFilterStart(s); setFilterEnd(e) }} className="btn-secondary btn-sm">{l}</button>
          ))}
        </div>
        <div className="card py-2 px-5 ml-auto">
          <p className="text-xs text-gray-400">Total Expenses</p>
          <p className="text-xl font-bold text-red-400">{fmt(total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expense List */}
        <div className="lg:col-span-2">
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Actions</th></tr></thead>
              <tbody>
                {expenses.length === 0
                  ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No expenses found for selected period</td></tr>
                  : expenses.map(e => (
                  <tr key={e.id}>
                    <td className="text-xs text-gray-400">{formatDate(e.expense_date)}</td>
                    <td><span className="badge-purple">{e.category_name || 'Uncategorized'}</span></td>
                    <td className="text-gray-300 text-xs">{e.description || '-'}</td>
                    <td className="text-red-400 font-bold">{fmt(e.amount)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(e)} className="btn-secondary btn-sm">Edit</button>
                        <button onClick={() => handleDelete(e.id)} className="btn-danger btn-sm">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="card">
          <h3 className="font-semibold text-white mb-3">By Category</h3>
          {byCategory.length === 0
            ? <p className="text-gray-500 text-sm text-center py-6">No data</p>
            : (
            <div className="space-y-2">
              {byCategory.map(c => (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">{c.name}</span>
                    <span className="text-red-400 font-medium">{fmt(c.total)}</span>
                  </div>
                  <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (c.total / total) * 100)}%` }} />
                  </div>
                </div>
              ))}
              <div className="divider" />
              <div className="flex justify-between text-sm font-bold">
                <span className="text-white">Total</span>
                <span className="text-red-400">{fmt(total)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Expense' : 'Add Expense'} size="sm"
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} className="btn-primary">💾 Save</button></>}>
        <div className="space-y-3">
          <div className="form-group">
            <label className="label">Category</label>
            <select className="input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">-- No Category --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Amount *</label>
            <input className="input input-lg text-center font-bold" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What was this for?" />
          </div>
          <div className="form-group">
            <label className="label">Date</label>
            <input type="date" className="input" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title="Expense Categories" size="md">
        <div className="space-y-4">
          <div className="space-y-2">
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-xl">
                <div>
                  <p className="font-medium text-white text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.expense_count} expenses</p>
                </div>
              </div>
            ))}
          </div>
          <div className="divider" />
          <p className="font-medium text-white text-sm">Add New Category</p>
          <div className="form-group">
            <label className="label">Name</label>
            <input className="input" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Rent, Salary..." />
          </div>
          <button onClick={handleCatSave} className="btn-primary w-full">+ Add Category</button>
        </div>
      </Modal>
    </div>
  )
}
