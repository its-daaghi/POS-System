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
  const [showGRNDetail, setShowGRNDetail] = useState(false)
  const [grnDetail, setGrnDetail] = useState<any>(null)
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
    toast.success('GRN created successfully')
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

  const openGRNDetail = async (p: any) => {
    const data = await window.api.getPurchaseItems(p.id)
    setGrnDetail(data); setShowGRNDetail(true)
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
            <thead><tr><th>GRN #</th><th>Supplier</th><th>Total</th><th>Paid</th><th>Balance</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {purchases.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-gray-500">No purchases</td></tr>
              : purchases.map(p => (
                <tr key={p.id} className="cursor-pointer hover:bg-dark-600/50 transition-colors" onClick={() => openGRNDetail(p)}>
                  <td className="font-mono text-primary-400 font-bold">{p.grn_number}</td>
                  <td>{p.supplier_name||'Direct'}</td>
                  <td className="font-bold text-white">{fmt(p.total_amount)}</td>
                  <td className="text-emerald-400">{fmt(p.paid_amount)}</td>
                  <td className={p.total_amount-p.paid_amount>0?'text-red-400 font-bold':'text-emerald-400'}>{fmt(p.total_amount-p.paid_amount)}</td>
                  <td className="text-xs text-gray-400">{formatDate(p.created_at)}</td>
                  <td><span className="text-xs text-primary-400">👁 View</span></td>
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
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title={`📋 ${selected?.name} — Ledger`} size="xl">
        {detail && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-dark-700 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Purchased</p>
                <p className="text-lg font-bold text-white">{fmt(detail.purchases?.reduce((s:number,p:any)=>s+p.total_amount,0)||0)}</p>
              </div>
              <div className="bg-dark-700 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Paid</p>
                <p className="text-lg font-bold text-emerald-400">{fmt(detail.purchases?.reduce((s:number,p:any)=>s+p.paid_amount,0)||0 + detail.payments?.reduce((s:number,p:any)=>s+p.amount,0)||0)}</p>
              </div>
              <div className="bg-dark-700 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Balance Remaining</p>
                <p className={`text-lg font-bold ${detail.supplier?.current_balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(detail.supplier?.current_balance||0)}</p>
              </div>
            </div>

            {/* Ledger table */}
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th className="text-right">Debit (Owed)</th>
                    <th className="text-right">Credit (Paid)</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.ledger?.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">No transactions yet</td></tr>
                  )}
                  {detail.ledger?.map((entry: any, i: number) => (
                    <tr key={i}>
                      <td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            entry.type === 'purchase' ? 'bg-blue-900/40 text-blue-400' :
                            entry.type === 'initial_payment' ? 'bg-emerald-900/40 text-emerald-400' :
                            'bg-purple-900/40 text-purple-400'
                          }`}>
                            {entry.type === 'purchase' ? '📦 Purchase' : entry.type === 'initial_payment' ? '💵 Advance' : '💳 Payment'}
                          </span>
                          <span className="text-sm text-gray-300">{entry.description}</span>
                        </div>
                      </td>
                      <td className="text-right font-medium text-red-400">
                        {entry.debit > 0 ? fmt(entry.debit) : '—'}
                      </td>
                      <td className="text-right font-medium text-emerald-400">
                        {entry.credit > 0 ? fmt(entry.credit) : '—'}
                      </td>
                      <td className={`text-right font-bold ${entry.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {fmt(entry.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* GRN Detail Modal */}
      <Modal isOpen={showGRNDetail} onClose={() => setShowGRNDetail(false)} title={`📦 GRN Details — ${grnDetail?.purchase?.grn_number || ''}`} size="lg">
        {grnDetail && (
          <div className="space-y-4">
            {/* GRN Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-dark-700 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Supplier</p>
                <p className="text-sm font-bold text-white">{grnDetail.purchase?.supplier_name || 'Direct'}</p>
              </div>
              <div className="bg-dark-700 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Amount</p>
                <p className="text-sm font-bold text-white">{fmt(grnDetail.purchase?.total_amount || 0)}</p>
              </div>
              <div className="bg-dark-700 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Paid</p>
                <p className="text-sm font-bold text-emerald-400">{fmt(grnDetail.purchase?.paid_amount || 0)}</p>
              </div>
              <div className="bg-dark-700 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Balance Due</p>
                <p className={`text-sm font-bold ${(grnDetail.purchase?.total_amount - grnDetail.purchase?.paid_amount) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {fmt((grnDetail.purchase?.total_amount || 0) - (grnDetail.purchase?.paid_amount || 0))}
                </p>
              </div>
            </div>

            {grnDetail.purchase?.notes && (
              <div className="bg-dark-700/50 border border-dark-600 rounded-lg px-4 py-2 text-sm text-gray-400">
                📝 {grnDetail.purchase.notes}
              </div>
            )}

            {/* Items Table */}
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {grnDetail.items?.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">No items found</td></tr>
                  )}
                  {grnDetail.items?.map((item: any, i: number) => (
                    <tr key={item.id}>
                      <td className="text-gray-500">{i + 1}</td>
                      <td className="font-medium text-white">{item.product_name}</td>
                      <td className="text-right text-gray-300">{item.quantity} {item.unit || ''}</td>
                      <td className="text-right text-gray-300">{fmt(item.unit_price)}</td>
                      <td className="text-right font-bold text-primary-400">{fmt(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
                {grnDetail.items?.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-dark-500">
                      <td colSpan={4} className="text-right font-bold text-white py-3 px-4">Grand Total</td>
                      <td className="text-right font-bold text-xl text-primary-400 py-3 px-4">{fmt(grnDetail.purchase?.total_amount || 0)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
