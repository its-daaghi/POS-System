import { create } from 'zustand'

export interface CartItem {
  id: string
  product_id: number
  product_name: string
  unit_price: number
  quantity: number
  discount_percent: number
  discount_amount: number
  tax_percent: number
  total_price: number
  unit: string
  stock_quantity: number
}

interface CartState {
  items: CartItem[]
  customer_id: number | null
  customer_name: string | null
  bill_discount_percent: number
  bill_discount_amount: number
  payment_method: 'cash' | 'card' | 'credit'
  notes: string

  addItem: (product: any, taxPercent?: number) => void
  updateQuantity: (id: string, quantity: number) => void
  updateDiscount: (id: string, percent: number) => void
  updateItemPrice: (id: string, price: number) => void
  removeItem: (id: string) => void
  setBillDiscount: (percent: number, amount: number) => void
  setCustomer: (id: number | null, name: string | null) => void
  setPaymentMethod: (method: 'cash' | 'card' | 'credit') => void
  setNotes: (notes: string) => void
  clearCart: () => void
  loadFromHeld: (data: any) => void

  // Computed
  getSubtotal: () => number
  getTaxAmount: () => number
  getTotalDiscount: () => number
  getTotal: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer_id: null,
  customer_name: null,
  bill_discount_percent: 0,
  bill_discount_amount: 0,
  payment_method: 'cash',
  notes: '',

  addItem: (product: any, taxPercent = 0) => {
    const { items } = get()
    const existingIdx = items.findIndex(i => i.product_id === product.id)
    if (existingIdx >= 0) {
      const updated = [...items]
      const item = { ...updated[existingIdx] }
      item.quantity += 1
      item.total_price = calcItemTotal(item)
      updated[existingIdx] = item
      set({ items: updated })
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        unit_price: product.sale_price,
        quantity: 1,
        discount_percent: 0,
        discount_amount: 0,
        tax_percent: taxPercent,
        total_price: product.sale_price,
        unit: product.unit || 'pcs',
        stock_quantity: product.stock_quantity
      }
      set({ items: [...items, newItem] })
    }
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) { get().removeItem(id); return }
    set(state => ({
      items: state.items.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, quantity }
        return { ...updated, total_price: calcItemTotal(updated) }
      })
    }))
  },

  updateDiscount: (id, percent) => {
    set(state => ({
      items: state.items.map(item => {
        if (item.id !== id) return item
        const discount_amount = (item.unit_price * item.quantity * percent) / 100
        const updated = { ...item, discount_percent: percent, discount_amount }
        return { ...updated, total_price: calcItemTotal(updated) }
      })
    }))
  },

  updateItemPrice: (id, price) => {
    set(state => ({
      items: state.items.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, unit_price: price }
        return { ...updated, total_price: calcItemTotal(updated) }
      })
    }))
  },

  removeItem: (id) => set(state => ({ items: state.items.filter(i => i.id !== id) })),

  setBillDiscount: (percent, amount) => set({ bill_discount_percent: percent, bill_discount_amount: amount }),

  setCustomer: (id, name) => set({ customer_id: id, customer_name: name }),

  setPaymentMethod: (method) => set({ payment_method: method }),

  setNotes: (notes) => set({ notes }),

  clearCart: () => set({
    items: [], customer_id: null, customer_name: null,
    bill_discount_percent: 0, bill_discount_amount: 0,
    payment_method: 'cash', notes: ''
  }),

  loadFromHeld: (data: any) => {
    set({
      items: data.items || [],
      customer_id: data.customer_id || null,
      customer_name: data.customer_name || null,
      bill_discount_percent: data.bill_discount_percent || 0,
      bill_discount_amount: data.bill_discount_amount || 0,
      payment_method: data.payment_method || 'cash',
      notes: data.notes || ''
    })
  },

  getSubtotal: () => get().items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0),
  getTaxAmount: () => get().items.reduce((sum, i) => sum + (i.tax_percent / 100) * i.unit_price * i.quantity, 0),
  getTotalDiscount: () => {
    const itemDiscounts = get().items.reduce((sum, i) => sum + i.discount_amount, 0)
    return itemDiscounts + get().bill_discount_amount
  },
  getTotal: () => {
    const s = get()
    return s.getSubtotal() + s.getTaxAmount() - s.getTotalDiscount()
  }
}))

function calcItemTotal(item: CartItem): number {
  const base = item.unit_price * item.quantity
  const disc = item.discount_amount || (base * item.discount_percent / 100)
  const tax = (base - disc) * item.tax_percent / 100
  return base - disc + tax
}
