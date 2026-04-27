import React, { useState, useEffect } from 'react'
import Modal from '../../components/Modal/Modal'
import { formatCurrency, formatDate } from '../../utils/currency'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const emptySupplier = { name: '', phone: '', email: '', address: '', notes: '' }

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'suppliers' | 'purchases'>('suppliers')
  const [showModal, setShowModal] = useState(false)
  const [showGRN, setShowGRN] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [detail, setDetail] = useState<any>(null)
  const [form, setForm] = useState(emptySupplier)
  const [payForm, setPayForm] = useState({ amount: '', notes: '' })
  const [grnItems, setGrnItems] = useState([{ product_id: '', product_name: '', quantity: '', unit_price: '' }])
  const [grnSupplier, setGrnSupplier] = useState('')
  const [grnPaid, setGrnPaid] = useState('')
  const [grnNotes, setGrnNotes] = useState('')
  const currency = useSettingsStore(s => s.get('currency_symbol', '₨'))
  const user = useAuthStore(s => s.user)
  const fmt = (n: number) => formatCurrency(n, currency)

  useEffect(() => { load() }, [])

  const load = async () => {
    const [s, p, pr] = await Promise.all([window.api.getSuppliers(), window.api.getPurchases(), window.api.getProducts()])
    setSuppliers(s); setPurchases(p); setProducts(pr)
  }

  const filteredSuppliers = suppliers.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone || '').includes(search))

  const handleSave = async () => {
    if (!form.name) { toast.error('Name required'); return }
    if (editing) { await window.api.updateSupplier(editing.id, form) } else { await window.api.createSupplier(form) }
    toast.success('Saved'); setShowModal(false); load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete supplier?')) return
    await window.api.deleteSupplier(id); toast.success('Deleted'); load()
  }

  const addGRNRow = () => setGrnItems([...grnItems, { product_id: '', product_name: '', quantity: '', unit_price: '' }])
  const removeGRNRow = (i: number) => setGrnItems(grnItems.filter((_, idx) => idx !== i))
  const updateGRNRow = (i: number, field: string, val: string) => {
    const updated = [...grnItems]
    updated[i] = { ...updated[i], [field]: val }
    if (field === 'product_id') {
      const p = products.find(p => p.id == val)
      if (p) { updated[i].product_name = p.name; updated[i].unit_price = p.purchase_price }
    }
    setGrnItems(updated)
  }

  const grnTotal = grnItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0)

  const handleGRN = async () => {
    const validItems = grnItems.filter(i => i.product_name && i.quantity && i.unit_price)
    if (validItems.length === 0) { toast.error('Add at least one item'); return }
    const items = validItems.map(i => ({ product_id: i.product_id ? parseInt(i.product_id) : null, product_name: i.product_name, quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price), total_price: parseFloat(i.quantity) * parseFloat(i.unit_price) }))
    await window.api.createPurchase({ supplier_id: grnSupplier ? parseInt(grnSupplier) : null, user_id: user?.id, total_amount: grnTotal, paid_amount: parseFloat(grnPaid) || 0, notes: grnNotes, items })
    toast.success('GRN created & stock updated')
    setShowGRN(false); setGrnItems([{ product_id: '', product_name: '', quantity: '', unit_price: '' }]); setGrnSupplier(''); setGrnPaid(''); setGrnNotes(''); load()
  }

  const handlePayment = async () => {
    if (!payForm.amount) { toast.error('Enter amount'); return }
    await window.api.addSupplierPayment({ supplier_id: selected.id, amount: parseFloat(payForm.amount), notes: payForm.notes, user_id: user?.id })
    toast.success('Payment recorded'); setShowPayModal(false); setPayForm({ amount: '', notes: '' }); load()
  }

  const openDetail = async (s: any) => {
    setSelected(s); const data = await window.api.getSupplier(s.id); setDetail(data); setShowDetail(true)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">🏭 Suppliers</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowGRN(true)} className="btn-warning">📥 New GRN / Purchase</button>
          <button onClick={() => { setEditing(null); setForm(emptySupplier); setShowModal(true) }} className="btn-primary">+ Add Supplier</button>
        </div>
      </div>

      <div className="flex gap-1 bg-dark-800 p-1 rounded-xl w-fit border border-dark-700">
        {[['suppliers','🏭 Suppliers'],['purchases','📋 Purchase History']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===k?'bg-primary-600 text-white':'text-gray-400 hover:text-white'}`}>{l}</button>
        ))}
      </div>

      {tab === 'suppliers' && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} className="input" placeholder="Search suppliers..." />
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Balance Owed</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredSuppliers.length === 0
                  ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">No suppliers found</td></tr>
                  : filteredSuppliers.map(s => (
                  <tr key={s.id}>
                    <td className="font-medium text-white">{s.name}</td>
                    <td className="text-gray-400">{s.phone||'-'}</td>
                    <td className="text-gray-400 text-xs">{s.email||'-'}</td>
                    <td className={s.current_balance > 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{fmt(s.current_balance)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openDetail(s)} className="btn-secondary btn-sm">📋 Detail</button>
                        <button onClick={() => { setSelected(s); setShowPayModal(true) }} className="btn-success btn-sm">💵 Pay</button>
                        <button onClick={() => { setEditing(s); setForm({ name:s.name, phone:s.phone||'', email:s.email||'', address:s.address||'', notes:s.notes||'' }); setShowModal(true) }} className="btn-secondary btn-sm">Edit</button>
                        <button onClick={() => handleDelete(s.id)} className="btn-danger btn-sm">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'purchases' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>GRN #</th><th>Supplier</th><th>Total</th><th>Paid</th><th>Balance</th><th>Date</th></tr></thead>
            <tbody>
              {purchases.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-gray-500">No purchases</td></tr>
              : purchases.map(p => (
                <tr key={p.id}>
                  <td className="font-mono text-primary-400">{p.grn_number}</td>
                  <td>{p.supplier_name||'Direct'}</td>
                  <td className="font-bold text-white">{fmt(p.total_amount)}</td>
                  <td className="text-emerald-400">{fmt(p.paid_amount)}</td>
                  <td className={p.total_amount-p.paid_amount>0?'text-red-400 font-bold':'text-emerald-400'}>{fmt(p.total_amount-p.paid_amount)}</td>
                  <td className="text-xs text-gray-400">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Supplier Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'} size="md"
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} className="btn-primary">💾 Save</button></>}>
        <div className="space-y-3">
          <div className="form-group"><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} /></div>
          <div className="form-row">
            <div className="form-group"><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} /></div>
            <div className="form-group"><label className="label">Email</label><input className="input" value={form.email} onChange={e => setForm({...form,email:e.target.value})} /></div>
          </div>
          <div className="form-group"><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({...form,address:e.target.value})} /></div>
          <div className="form-group"><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} /></div>
        </div>
      </Modal>

      {/* GRN Modal */}
      <Modal isOpen={showGRN} onClose={() => setShowGRN(false)} title="📥 New Purchase / GRN" size="full"
        footer={
          <div className="flex gap-3 w-full items-center">
            <span className="text-white font-bold">Total: {fmt(grnTotal)}</span>
            <button onClick={() => setShowGRN(false)} className="btn-secondary ml-auto">Cancel</button>
            <button onClick={handleGRN} className="btn-primary">✅ Create GRN</button>
          </div>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="form-group"><label className="label">Supplier</label>
              <select className="input" value={grnSupplier} onChange={e => setGrnSupplier(e.target.value)}>
                <option value="">-- Direct Purchase --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="label">Amount Paid</label><input className="input" type="number" value={grnPaid} onChange={e => setGrnPaid(e.target.value)} placeholder="0.00" /></div>
            <div className="form-group"><label className="label">Notes</label><input className="input" value={grnNotes} onChange={e => setGrnNotes(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-white">Items</p>
              <button onClick={addGRNRow} className="btn-secondary btn-sm">+ Add Item</button>
            </div>
            {grnItems.map((item, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 items-end">
                <div className="col-span-2">
                  <select className="input text-sm" value={item.product_id} onChange={e => updateGRNRow(i, 'product_id', e.target.value)}>
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <input className="input text-sm" placeholder="Qty" type="number" value={item.quantity} onChange={e => updateGRNRow(i, 'quantity', e.target.value)} />
                <input className="input text-sm" placeholder="Unit Price" type="number" value={item.unit_price} onChange={e => updateGRNRow(i, 'unit_price', e.target.value)} />
                <div className="flex gap-2 items-center">
                  <span className="text-primary-400 font-bold text-sm">{fmt((parseFloat(item.quantity)||0)*(parseFloat(item.unit_price)||0))}</span>
                  {grnItems.length > 1 && <button onClick={() => removeGRNRow(i)} className="text-red-400 hover:text-red-300">✕</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Pay Supplier" size="sm"
        footer={<><button onClick={() => setShowPayModal(false)} className="btn-secondary">Cancel</button><button onClick={handlePayment} className="btn-success">✅ Record</button></>}>
        <div className="space-y-3">
          <div className="p-3 bg-dark-700 rounded-xl text-sm">
            <p className="text-gray-400">Supplier: <span className="text-white font-medium">{selected?.name}</span></p>
            <p className="text-gray-400 mt-1">Balance: <span className="text-red-400 font-bold">{fmt(selected?.current_balance||0)}</span></p>
          </div>
          <div className="form-group"><label className="label">Amount</label><input className="input" type="number" value={payForm.amount} onChange={e => setPayForm({...payForm,amount:e.target.value})} /></div>
          <div className="form-group"><label className="label">Notes</label><input className="input" value={payForm.notes} onChange={e => setPayForm({...payForm,notes:e.target.value})} /></div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title={`📋 ${selected?.name}`} size="xl">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-white mb-2">Recent Purchases</h4>
                <div className="space-y-2">
                  {detail.purchases?.slice(0,10).map((p:any) => (
                    <div key={p.id} className="flex justify-between text-sm p-2 bg-dark-700 rounded-lg">
                      <span className="text-primary-400 font-mono">{p.grn_number}</span>
                      <span className="text-white">{fmt(p.total_amount)}</span>
                      <span className="text-xs text-gray-500">{formatDate(p.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Payment History</h4>
                <div className="space-y-2">
                  {detail.payments?.slice(0,10).map((p:any) => (
                    <div key={p.id} className="flex justify-between text-sm p-2 bg-dark-700 rounded-lg">
                      <span className="text-emerald-400 font-bold">{fmt(p.amount)}</span>
                      <span className="text-xs text-gray-500">{p.notes||'-'}</span>
                      <span className="text-xs text-gray-500">{formatDate(p.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
