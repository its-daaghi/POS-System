import React, { useState, useEffect } from 'react'
import Modal from '../../components/Modal/Modal'
import { formatCurrency, formatDate } from '../../utils/currency'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import Papa from 'papaparse'

const UNITS = ['pcs', 'kg', 'ltr', 'mtr', 'box', 'doz']
const emptyForm = { name: '', barcode: '', category_id: '', purchase_price: '', sale_price: '', stock_quantity: '', unit: 'pcs', min_stock_level: '5', description: '' }

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [tab, setTab] = useState<'products' | 'categories' | 'stock' | 'low'>('products')
  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [editingCat, setEditingCat] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [catForm, setCatForm] = useState({ name: '', description: '' })
  const [stockForm, setStockForm] = useState({ product_id: '', adjustment_type: 'add', quantity: '', notes: '' })
  const [lowStock, setLowStock] = useState<any[]>([])
  const [adjustments, setAdjustments] = useState<any[]>([])
  const currency = useSettingsStore(s => s.get('currency_symbol', '₨'))
  const user = useAuthStore(s => s.user)
  const fmt = (n: number) => formatCurrency(n, currency)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [prods, cats, low, adj] = await Promise.all([
      window.api.getProducts(),
      window.api.getCategories(),
      window.api.getLowStockProducts(),
      window.api.getStockAdjustments()
    ])
    setProducts(prods); setCategories(cats); setLowStock(low); setAdjustments(adj)
  }

  const filtered = products.filter(p =>
    (!catFilter || p.category_id == catFilter) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search))
  )

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (p: any) => {
    setEditing(p)
    setForm({ name: p.name, barcode: p.barcode||'', category_id: p.category_id||'', purchase_price: p.purchase_price, sale_price: p.sale_price, stock_quantity: p.stock_quantity, unit: p.unit, min_stock_level: p.min_stock_level, description: p.description||'' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.sale_price) { toast.error('Name and sale price required'); return }
    const data = { ...form, category_id: form.category_id || null, purchase_price: parseFloat(form.purchase_price)||0, sale_price: parseFloat(form.sale_price), stock_quantity: parseFloat(form.stock_quantity)||0, min_stock_level: parseFloat(form.min_stock_level)||5 }
    if (editing) { await window.api.updateProduct(editing.id, data) } else { await window.api.createProduct(data) }
    toast.success(editing ? 'Product updated' : 'Product added')
    setShowModal(false); loadAll()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return
    await window.api.deleteProduct(id); toast.success('Product deleted'); loadAll()
  }

  const handleCatSave = async () => {
    if (!catForm.name) { toast.error('Category name required'); return }
    if (editingCat) { await window.api.updateCategory(editingCat.id, catForm) } else { await window.api.createCategory(catForm) }
    toast.success('Saved'); setShowCatModal(false); loadAll()
  }

  const handleStockAdjust = async () => {
    if (!stockForm.product_id || !stockForm.quantity) { toast.error('Select product and quantity'); return }
    await window.api.addStockAdjustment({ ...stockForm, product_id: parseInt(stockForm.product_id), quantity: parseFloat(stockForm.quantity), user_id: user?.id })
    toast.success('Stock adjusted'); setShowStockModal(false); setStockForm({ product_id: '', adjustment_type: 'add', quantity: '', notes: '' }); loadAll()
  }

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const res = await window.api.importProductsCSV(results.data as any[])
        toast.success(`Imported ${res.count} products`); loadAll()
      }
    })
    e.target.value = ''
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">📦 Products & Inventory</h1>
        <div className="flex gap-2">
          <label className="btn-secondary cursor-pointer"><input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />📂 Import CSV</label>
          <button onClick={() => { setShowStockModal(true) }} className="btn-warning">📋 Stock Adjust</button>
          <button onClick={openAdd} className="btn-primary">+ Add Product</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 p-1 rounded-xl w-fit border border-dark-700">
        {[['products','📦 Products'],['categories','🏷️ Categories'],['stock','📊 Adjustments'],['low','⚠️ Low Stock']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===key ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label} {key==='low' && lowStock.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{lowStock.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <>
          <div className="flex gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} className="input flex-1" placeholder="Search by name or barcode..." />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input w-48">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Name</th><th>Barcode</th><th>Category</th><th>Purchase</th><th>Sale Price</th><th>Stock</th><th>Unit</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-500">No products found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium text-white">{p.name}</td>
                    <td className="font-mono text-xs text-gray-400">{p.barcode || '-'}</td>
                    <td><span className="badge-blue">{p.category_name || 'General'}</span></td>
                    <td>{fmt(p.purchase_price)}</td>
                    <td className="font-semibold text-primary-400">{fmt(p.sale_price)}</td>
                    <td className={p.stock_quantity <= p.min_stock_level ? 'text-red-400 font-bold' : 'text-white'}>{p.stock_quantity}</td>
                    <td><span className="badge-gray">{p.unit}</span></td>
                    <td>{p.stock_quantity <= p.min_stock_level ? <span className="badge-red">Low Stock</span> : <span className="badge-green">OK</span>}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className="btn-secondary btn-sm">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="btn-danger btn-sm">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">{filtered.length} products shown</p>
        </>
      )}

      {tab === 'categories' && (
        <div className="space-y-3">
          <button onClick={() => { setEditingCat(null); setCatForm({ name:'',description:'' }); setShowCatModal(true) }} className="btn-primary">+ Add Category</button>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map(c => (
              <div key={c.id} className="card-hover p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-white">{c.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{c.product_count} products</p>
                    {c.description && <p className="text-xs text-gray-600 mt-1">{c.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingCat(c); setCatForm({name:c.name,description:c.description||''}); setShowCatModal(true) }} className="btn-ghost btn-sm btn-icon">✏️</button>
                    <button onClick={async () => { if(confirm('Delete category?')){ await window.api.deleteCategory(c.id); loadAll() } }} className="btn-ghost btn-sm btn-icon text-red-400">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'stock' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Product</th><th>Type</th><th>Qty</th><th>Notes</th><th>Date</th></tr></thead>
            <tbody>
              {adjustments.map(a => (
                <tr key={a.id}>
                  <td className="font-medium text-white">{a.product_name}</td>
                  <td><span className={a.adjustment_type==='add'||a.adjustment_type==='return' ? 'badge-green' : 'badge-red'}>{a.adjustment_type}</span></td>
                  <td className={a.adjustment_type==='add'||a.adjustment_type==='return' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{a.adjustment_type==='damage'||a.adjustment_type==='correction'?'-':'+' }{a.quantity}</td>
                  <td className="text-gray-400 text-xs">{a.notes||'-'}</td>
                  <td className="text-gray-500 text-xs">{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'low' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Product</th><th>Category</th><th>Current Stock</th><th>Min Level</th><th>Status</th></tr></thead>
            <tbody>
              {lowStock.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-500">✅ All products are well stocked!</td></tr>
              : lowStock.map(p => (
                <tr key={p.id}>
                  <td className="font-medium text-white">{p.name}</td>
                  <td>{p.category_name||'-'}</td>
                  <td className="text-red-400 font-bold">{p.stock_quantity} {p.unit}</td>
                  <td className="text-gray-400">{p.min_stock_level}</td>
                  <td>{p.stock_quantity <= 0 ? <span className="badge-red">Out of Stock</span> : <span className="badge-yellow">Low Stock</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'Add Product'} size="lg"
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button><button onClick={handleSave} className="btn-primary">💾 Save</button></>}>
        <div className="space-y-4">
          <div className="form-row">
            <div className="form-group"><label className="label">Product Name *</label><input className="input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Product name" /></div>
            <div className="form-group"><label className="label">Barcode</label><input className="input" value={form.barcode} onChange={e => setForm({...form,barcode:e.target.value})} placeholder="Scan or enter barcode" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Category</label>
              <select className="input" value={form.category_id} onChange={e => setForm({...form,category_id:e.target.value})}>
                <option value="">-- Select Category --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="label">Unit</label>
              <select className="input" value={form.unit} onChange={e => setForm({...form,unit:e.target.value})}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Purchase Price</label><input className="input" type="number" value={form.purchase_price} onChange={e => setForm({...form,purchase_price:e.target.value})} placeholder="0.00" /></div>
            <div className="form-group"><label className="label">Sale Price *</label><input className="input" type="number" value={form.sale_price} onChange={e => setForm({...form,sale_price:e.target.value})} placeholder="0.00" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="label">Stock Quantity</label><input className="input" type="number" value={form.stock_quantity} onChange={e => setForm({...form,stock_quantity:e.target.value})} placeholder="0" /></div>
            <div className="form-group"><label className="label">Min Stock Level</label><input className="input" type="number" value={form.min_stock_level} onChange={e => setForm({...form,min_stock_level:e.target.value})} placeholder="5" /></div>
          </div>
          <div className="form-group"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Optional notes..." /></div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title={editingCat ? 'Edit Category' : 'Add Category'} size="sm"
        footer={<><button onClick={() => setShowCatModal(false)} className="btn-secondary">Cancel</button><button onClick={handleCatSave} className="btn-primary">💾 Save</button></>}>
        <div className="space-y-3">
          <div className="form-group"><label className="label">Name *</label><input className="input" value={catForm.name} onChange={e => setCatForm({...catForm,name:e.target.value})} /></div>
          <div className="form-group"><label className="label">Description</label><input className="input" value={catForm.description} onChange={e => setCatForm({...catForm,description:e.target.value})} /></div>
        </div>
      </Modal>

      {/* Stock Adjust Modal */}
      <Modal isOpen={showStockModal} onClose={() => setShowStockModal(false)} title="Stock Adjustment" size="sm"
        footer={<><button onClick={() => setShowStockModal(false)} className="btn-secondary">Cancel</button><button onClick={handleStockAdjust} className="btn-primary">✅ Adjust</button></>}>
        <div className="space-y-3">
          <div className="form-group"><label className="label">Product *</label>
            <select className="input" value={stockForm.product_id} onChange={e => setStockForm({...stockForm,product_id:e.target.value})}>
              <option value="">Select product...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</option>)}
            </select>
          </div>
          <div className="form-group"><label className="label">Type</label>
            <select className="input" value={stockForm.adjustment_type} onChange={e => setStockForm({...stockForm,adjustment_type:e.target.value})}>
              <option value="add">Add Stock</option>
              <option value="damage">Damage / Loss</option>
              <option value="return">Return</option>
              <option value="correction">Correction</option>
            </select>
          </div>
          <div className="form-group"><label className="label">Quantity *</label><input className="input" type="number" value={stockForm.quantity} onChange={e => setStockForm({...stockForm,quantity:e.target.value})} placeholder="0" /></div>
          <div className="form-group"><label className="label">Notes</label><input className="input" value={stockForm.notes} onChange={e => setStockForm({...stockForm,notes:e.target.value})} placeholder="Reason..." /></div>
        </div>
      </Modal>
    </div>
  )
}
