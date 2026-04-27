import React, { useState, useEffect } from 'react'
import Modal from '../../components/Modal/Modal'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/currency'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const emptyForm = { name: '', phone: '', address: '', credit_limit: '', opening_balance: '', notes: '' }
const emptyPayment = { amount: '', notes: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showLedger, setShowLedger] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [ledger, setLedger] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [payForm, setPayForm] = useState(emptyPayment)
  const currency = useSettingsStore(s => s.get('currency_symbol', '₨'))
  const user = useAuthStore(s => s.user)
  const fmt = (n: number) => formatCurrency(n, currency)

  useEffect(() => { load() }, [])

  const load = async () => {
    const data = await window.api.getCustomers()
    setCustomers(data)
  }

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone||'').includes(search)
  )

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (c: any) => { setEditing(c); setForm({ name:c.name, phone:c.phone||'', address:c.address||'', credit_limit:c.credit_limit||'', opening_balance: '', notes:c.notes||'' }); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return }
    const data = { ...form, credit_limit: parseFloat(form.credit_limit)||0, opening_balance: parseFloat(form.opening_balance)||0, user_id: user?.id }
    if (editing) { await window.api.updateCustomer(editing.id, data) } else { await window.api.createCustomer(data) }
    toast.success(editing ? 'Customer updated' : 'Customer added')
    setShowModal(false); load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this customer?')) return
    await window.api.deleteCustomer(id); toast.success('Deleted'); load()
  }

  const openLedger = async (c: any) => {
    setSelected(c)
    const data = await window.api.getCustomerLedger(c.id)
    setLedger(data); setShowLedger(true)
  }

  const handlePayment = async () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { toast.error('Enter valid amount'); return }
    await window.api.addCreditPayment({ customer_id: selected.id, amount: parseFloat(payForm.amount), notes: payForm.notes, user_id: user?.id })
    toast.success('Payment recorded')
    setShowPayModal(false); setPayForm(emptyPayment)
    load()
    if (selected) { const data = await window.api.getCustomerLedger(selected.id); setLedger(data) }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">👥 Customers</h1>
        <button onClick={openAdd} className="btn-primary">+ Add Customer</button>
      </div>

      <div className="flex gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} className="input flex-1" placeholder="Search by name or phone..." />
        <div className="card py-2 px-4 text-sm">
          <span className="text-gray-400">Total Credit: </span>
          <span className="text-red-400 font-bold">{fmt(customers.reduce((s,c)=>s+(c.current_balance||0),0))}</span>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th>Name</th><th>Phone</th><th>Address</th><th>Credit Limit</th><th>Balance (Udhaar)</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No customers found</td></tr>
              : filtered.map(c => (
              <tr key={c.id}>
                <td className="font-medium text-white">{c.name}</td>
                <td className="text-gray-400">{c.phone||'-'}</td>
                <td className="text-gray-400 text-xs">{c.address||'-'}</td>
                <td>{fmt(c.credit_limit)}</td>
                <td className={c.current_balance > 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{fmt(c.current_balance)}</td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => openLedger(c)} className="btn-secondary btn-sm">📒 Ledger</button>
                    <button onClick={() => openEdit(c)} className="btn-secondary btn-sm">Edit</button>
                    <button onClick={() => handleDelete(c.id)} className="btn-danger btn-sm">Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'} size="md"
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} className="btn-primary">💾 Save</button></>}>
        <div className="space-y-3">
          <div className="form-group"><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Full name" /></div>
          <div className="form-row">
            <div className="form-group"><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} placeholder="+92..." /></div>
            <div className="form-group"><label className="label">Credit Limit</label><input className="input" type="number" value={form.credit_limit} onChange={e => setForm({...form,credit_limit:e.target.value})} placeholder="0" /></div>
          </div>
          {!editing && (
            <div className="form-group"><label className="label">Opening Balance (Previous Udhaar)</label><input className="input border-red-900/50 focus:ring-red-500" type="number" value={form.opening_balance} onChange={e => setForm({...form,opening_balance:e.target.value})} placeholder="0.00" /></div>
          )}
          <div className="form-group"><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({...form,address:e.target.value})} /></div>
          <div className="form-group"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} /></div>
        </div>
      </Modal>

      {/* Ledger Modal */}
      <Modal isOpen={showLedger} onClose={() => setShowLedger(false)} title={`📒 Ledger — ${selected?.name}`} size="xl"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={() => { setShowPayModal(true) }} className="btn-success">💵 Collect Payment</button>
            <button onClick={() => setShowLedger(false)} className="btn-secondary ml-auto">Close</button>
          </div>
        }>
        {ledger && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="card text-center py-3"><p className="text-xs text-gray-400">Total Purchased</p><p className="text-lg font-bold text-white">{fmt(ledger.customer?.total_purchased||0)}</p></div>
              <div className="card text-center py-3"><p className="text-xs text-gray-400">Total Paid</p><p className="text-lg font-bold text-emerald-400">{fmt(ledger.transactions?.filter((t:any)=>t.payment_type==='payment').reduce((s:number,t:any)=>s+t.amount,0)||0)}</p></div>
              <div className="card text-center py-3"><p className="text-xs text-gray-400">Outstanding</p><p className="text-lg font-bold text-red-400">{fmt(ledger.customer?.current_balance||0)}</p></div>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Date</th><th>Type</th><th>Bill #</th><th>Amount</th><th>Notes</th></tr></thead>
                <tbody>
                  {ledger.transactions?.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-gray-500">No transactions</td></tr>
                  : ledger.transactions?.map((t: any) => (
                    <tr key={t.id}>
                      <td className="text-xs text-gray-400">{formatDateTime(t.created_at)}</td>
                      <td><span className={t.payment_type==='payment' ? 'badge-green' : 'badge-red'}>{t.payment_type==='payment' ? 'Payment' : 'Credit Sale'}</span></td>
                      <td className="font-mono text-xs">{t.bill_number||'-'}</td>
                      <td className={`font-bold ${t.payment_type==='payment' ? 'text-emerald-400' : 'text-red-400'}`}>{t.payment_type==='payment' ? '-' : '+'}{fmt(t.amount)}</td>
                      <td className="text-xs text-gray-500">{t.notes||'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Collect Payment" size="sm"
        footer={<><button onClick={() => setShowPayModal(false)} className="btn-secondary">Cancel</button><button onClick={handlePayment} className="btn-success">✅ Record Payment</button></>}>
        <div className="space-y-3">
          <div className="p-3 bg-dark-700 rounded-xl text-sm">
            <p className="text-gray-400">Customer: <span className="text-white font-medium">{selected?.name}</span></p>
            <p className="text-gray-400 mt-1">Outstanding: <span className="text-red-400 font-bold">{fmt(selected?.current_balance||0)}</span></p>
          </div>
          <div className="form-group"><label className="label">Amount *</label><input className="input input-lg text-center" type="number" value={payForm.amount} onChange={e => setPayForm({...payForm,amount:e.target.value})} placeholder="0.00" /></div>
          <div className="form-group"><label className="label">Notes</label><input className="input" value={payForm.notes} onChange={e => setPayForm({...payForm,notes:e.target.value})} placeholder="Payment notes..." /></div>
        </div>
      </Modal>
    </div>
  )
}
