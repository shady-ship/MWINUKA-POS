import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, X, Calendar, Pencil, Trash2, Printer } from 'lucide-react'
import { useApp } from '../context/useApp'
import InvoicePrint from '../components/InvoicePrint'
import { unitBuyCost, unitCode } from '../constants'

function localDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function OrdersPage() {
  const { ordersList, markItemsPaid, updateOrder, updateOrderItems, products, settings } = useApp()
  const [filter, setFilter] = useState('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState('newest')
  const [viewOrder, setViewOrder] = useState(null)
  const [viewItems, setViewItems] = useState([])
  const [paidIds, setPaidIds] = useState([])
  const [savingPay, setSavingPay] = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [editForm, setEditForm] = useState({ customer_name: '', payment_method: 'Cash', notes: '', order_date: '' })
  const [editItems, setEditItems] = useState([])
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [printOrder, setPrintOrder] = useState(null)
  const [printItems, setPrintItems] = useState([])

  const today = localDate(new Date())

  const reloadView = async (id) => {
    const res = await fetch(`/api/orders/${id}`)
    const data = await res.json()
    setViewOrder(data)
    setViewItems(data.items || [])
    setPaidIds((data.items || []).filter(i => i.paid).map(i => i.id))
  }

  const openView = async (o) => {
    try {
      await reloadView(o.id)
    } catch {
      setViewOrder(o)
      setViewItems([])
      setPaidIds([])
    }
  }

  const openPrint = async (o) => {
    try {
      const res = await fetch(`/api/orders/${o.id}`)
      const data = await res.json()
      setPrintOrder(data)
      setPrintItems(data.items || [])
    } catch {
      setPrintOrder(o)
      setPrintItems([])
    }
  }

  const togglePaid = (id) =>
    setPaidIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const savePaid = async () => {
    setSavingPay(true)
    const res = await markItemsPaid(viewOrder.id, paidIds)
    if (!res.ok) {
      alert(`Could not save payment. ${res.error}`)
    } else {
      await reloadView(viewOrder.id)
    }
    setSavingPay(false)
  }

  const unitsOf = (p) => {
    if (!p) return []
    return (p.prices || [])
      .filter(r => r.retail_price != null || r.wholesale_price != null || r.optional_price != null)
      .map(r => r.unit)
  }

  const typesOf = (p, unit) => {
    const row = p && (p.prices || []).find(r => r.unit === unit)
    if (!row) return ['Retail']
    const types = []
    if (row.retail_price != null) types.push('Retail')
    if (row.wholesale_price != null) types.push('Wholesale')
    if (row.optional_price != null) types.push('Optional')
    return types.length ? types : ['Retail']
  }

  const priceOf = (p, unit, type) => {
    const row = p && (p.prices || []).find(r => r.unit === unit)
    if (!row) return 0
    return Number(type === 'Retail' ? row.retail_price : type === 'Wholesale' ? row.wholesale_price : row.optional_price) || 0
  }

  const newLine = (p) => {
    const unit = unitsOf(p)[0] || 'Piece'
    const type = typesOf(p, unit)[0]
    return { pid: p.id, qty: 1, unit, type, price: priceOf(p, unit, type) }
  }

  const openEdit = async (o) => {
    setEditForm({
      customer_name: o.customer_name || '',
      payment_method: o.payment_method || 'Cash',
      notes: o.notes || '',
      order_date: o.order_date || '',
    })
    setEditItems([])
    setEditError('')
    setEditSaving(false)
    setEditOrder(o)
    try {
      const res = await fetch(`/api/orders/${o.id}`)
      const data = await res.json()
      setEditItems((data.items || []).map(i => ({
        pid: i.product_id,
        qty: Number(i.quantity) || 1,
        unit: i.unit || 'Piece',
        type: i.price_type || 'Retail',
        price: Number(i.unit_price) || 0,
      })))
    } catch {
      setEditItems([])
    }
  }

  const saveOrderEdit = async () => {
    if (!editForm.customer_name.trim()) {
      setEditError('Customer name is required')
      return
    }
    if (editItems.length === 0) {
      setEditError('Order must contain at least one item')
      return
    }
    for (const it of editItems) {
      if (!it.pid || !Number(it.qty) || Number(it.qty) < 1) {
        setEditError('Each item needs a product and a quantity of at least 1')
        return
      }
      const product = products.find(p => Number(p.id) === Number(it.pid))
      const cost = product ? unitBuyCost(
        product.buy_price,
        product.buy_price_unit || 'Piece',
        it.unit,
        product.pieces_per_carton,
        product.dozens_per_carton,
        product.pieces_per_dozen
      ) : 0
      if (cost > 0 && Number(it.price) <= cost) {
        setEditError(`Price for ${product.name} (${unitCode(it.unit)}) must be greater than the buy price for that unit (TSh ${cost.toLocaleString()})`)
        return
      }
    }
    setEditSaving(true)
    const detailsOk = await updateOrder(editOrder.id, {
      customer_name: editForm.customer_name.trim(),
      payment_method: editForm.payment_method,
      notes: editForm.notes,
      order_date: editForm.order_date || undefined,
    })
    const itemsOk = await updateOrderItems(editOrder.id, editItems.map(it => ({
      product_id: it.pid,
      quantity: it.qty,
      unit: it.unit,
      price_type: it.type,
      price: it.price,
    })))
    if (!detailsOk.ok || !itemsOk.ok) {
      setEditError(
        itemsOk.error ||
        `Server responded with code ${itemsOk.status || detailsOk.status || '?'} — the backend needs a restart to enable order editing. Restart it and try again.`
      )
      setEditSaving(false)
      return
    }
    setEditOrder(null)
    setEditSaving(false)
  }

  const setQuick = (range) => {
    if (range === 'today') { setFrom(today); setTo(today) }
    else if (range === '7d') {
      const d = new Date(); d.setDate(d.getDate() - 6)
      setFrom(localDate(d)); setTo(today)
    } else if (range === 'month') {
      const d = new Date(); d.setDate(1)
      setFrom(localDate(d)); setTo(today)
    } else { setFrom(''); setTo('') }
  }

  const inRange = (o) => {
    const d = o.order_date || ''
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }

  const filtered = ordersList.filter(o => (filter === 'All' || o.status === filter) && inRange(o))
  const sorted = [...filtered].sort((a, b) =>
    sort === 'newest'
      ? String(b.order_date).localeCompare(String(a.order_date))
      : String(a.order_date).localeCompare(String(b.order_date))
  )
  const rangeOrders = ordersList.filter(inRange)
  const countStatus = (s) => rangeOrders.filter(o => o.status === s).length
  const chips = [
    { key: 'All', label: 'All', count: rangeOrders.length },
    { key: 'Completed', label: 'Paid', count: countStatus('Completed') },
    { key: 'Pending', label: 'Billed', count: countStatus('Pending') },
    { key: 'Cancelled', label: 'Cancelled', count: countStatus('Cancelled') },
  ]

  const sumTotal = (arr) => arr.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const itemAmount = (item) => Number(item.total != null
    ? item.total
    : Number(item.unit_price || 0) * Number(item.quantity || 0))
  const orderSubtotal = viewItems.reduce((sum, item) => sum + itemAmount(item), 0)
  const orderTotal = Number(viewOrder?.total ?? orderSubtotal)
  const persistedPaidTotal = viewItems
    .filter(item => item.paid)
    .reduce((sum, item) => sum + itemAmount(item), 0)
  const paidTotal = viewItems
    .filter(item => paidIds.includes(item.id))
    .reduce((sum, item) => sum + itemAmount(item), 0)
  const currency = (settings.currency || 'TSh').toUpperCase()
  const contact = [settings.address, settings.phone ? `Tel: ${settings.phone}` : null, settings.email].filter(Boolean)
  const billedTotal = sumTotal(filtered.filter(o => o.status !== 'Cancelled'))
  const listPaidTotal = filtered.reduce((s, o) => s + (Number(o.paid_total) || 0), 0)
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-heading">ALL ORDERS</h2>
          <Link
            to="/orders/new"
            className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors"
          >
            + NEW ORDER
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-2">
            {chips.map(c => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  filter === c.key ? 'bg-primary text-white' : 'bg-white text-heading border border-line hover:bg-gray-50'
                }`}
              >
                {c.label} ({c.count})
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-line p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted" />
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <span className="text-xs text-muted">to</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex gap-1.5">
              {[['today', 'Today'], ['7d', 'Last 7 Days'], ['month', 'This Month'], ['all', 'All Dates']].map(([k, label]) => (
                <button key={k} onClick={() => setQuick(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    (k === 'all' && !from && !to) || (k === 'today' && from === today && to === today) ? 'bg-accent text-white' : 'bg-gray-100 text-heading hover:bg-gray-200'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs text-muted">Sort:</label>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="px-3 py-2 rounded-lg border border-line text-xs focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-line overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-line">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Order No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Salesman</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-warning">BILLED</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-success">TOTAL PAID (COMPLETED)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(order => (
                <tr key={order.id} className="border-b border-line hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-accent">{order.order_no}</td>
                  <td className="px-4 py-3 text-sm text-heading">{order.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-heading">{order.salesman_name}</td>
                  <td className="px-4 py-3 text-sm text-muted">{order.order_date}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm font-bold text-warning">{Number(order.item_count) || 0}</div>
                    <div className="text-[11px] text-muted font-medium">TSh {Number(order.total).toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm font-bold text-success">({Number(order.paid_count) || 0}/{Number(order.item_count) || 0})</div>
                    <div className="text-[11px] text-muted font-medium">TSh {Number(order.paid_total).toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      order.status === 'Completed' ? 'bg-green-100 text-success' :
                      order.status === 'Pending' ? 'bg-yellow-100 text-warning' :
                      'bg-red-100 text-danger'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openView(order)} className="text-accent hover:text-primary transition-colors" title="View order">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => openPrint(order)} className="text-muted hover:text-accent transition-colors" title="Print copy">
                        <Printer className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(order)} className="text-muted hover:text-heading transition-colors" title="Edit order">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-line">
                <td colSpan={4} className="px-4 py-3 text-xs font-bold text-heading uppercase tracking-wide">Total</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-warning">TSh {billedTotal.toLocaleString()}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-success">TSh {listPaidTotal.toLocaleString()}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
          {sorted.length === 0 && (
            <div className="py-12 text-center text-muted text-sm">No orders found for the selected period.</div>
          )}
        </div>

        {viewOrder && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-6">
            <div className="relative my-auto w-full max-w-xl rounded-xl bg-white p-3 shadow-xl sm:p-5">
              <button
                onClick={() => { setViewOrder(null); setViewItems([]) }}
                className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-muted shadow-sm hover:text-heading"
                aria-label="Close order details"
              >
                <X className="h-4 w-4" />
              </button>
              <article className="invoice order-view-invoice">
                <header className="inv-head">
                  <h1 className="inv-shop">{settings.business_name || 'MWINUKA ENTERPRISES CO. LTD'}</h1>
                  {settings.tagline && <p className="inv-tagline">{settings.tagline}</p>}
                  {contact.map(line => <p key={line} className="inv-contact">{line}</p>)}
                </header>

                <div className="inv-docbar">
                  <span className="inv-docbar-title">INVOICE</span>
                  <span className="inv-docbar-no">{viewOrder.order_no}</span>
                </div>

                <dl className="inv-meta">
                  <div className="inv-meta-row"><dt>Date</dt><dd>{viewOrder.order_date || '—'}</dd></div>
                  <div className="inv-meta-row"><dt>Time</dt><dd>{viewOrder.order_time || '—'}</dd></div>
                  <div className="inv-meta-row"><dt>Served by</dt><dd>{viewOrder.salesman_name || '—'}</dd></div>
                  <div className="inv-meta-row"><dt>Customer</dt><dd>{viewOrder.customer_name || 'Walk-in'}</dd></div>
                  <div className="inv-meta-row"><dt>Payment</dt><dd>{viewOrder.payment_method || 'Cash'}</dd></div>
                  <div className="inv-meta-row"><dt>Status</dt><dd>{viewOrder.status || 'Pending'}</dd></div>
                </dl>

                <div className="inv-items-head order-view-items-head" aria-hidden="true">
                  <span className="inv-c-desc">ITEM</span>
                  <span className="inv-c-qty">QTY</span>
                  <span className="inv-c-price">PRICE</span>
                  <span className="inv-c-total">AMOUNT</span>
                  <span className="order-view-paid-label">PAID</span>
                </div>

                <table className="inv-items">
                  <tbody>
                    {viewItems.map(item => {
                      const checked = paidIds.includes(item.id)
                      return (
                        <tr key={item.id} className={`inv-item order-view-item ${checked ? 'order-view-item-paid' : ''}`}>
                          <td className="inv-c-desc">{item.product_name || `Product #${item.product_id}`}</td>
                          <td className="inv-c-qty">
                            <span className="inv-qty-num">{item.quantity}</span>
                            <span className="inv-qty-unit">{unitCode(item.unit)}</span>
                          </td>
                          <td className="inv-c-price">{Number(item.unit_price || 0).toLocaleString()}</td>
                          <td className="inv-c-total">{itemAmount(item).toLocaleString()}</td>
                          <td className="order-view-paid-cell">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePaid(item.id)}
                              aria-label={`Mark ${item.product_name || 'item'} paid`}
                              className="h-3.5 w-3.5 cursor-pointer accent-green-600"
                            />
                          </td>
                        </tr>
                      )
                    })}
                    {viewItems.length === 0 && (
                      <tr className="inv-item order-view-item">
                        <td className="order-view-empty" colSpan={5}>No items recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="inv-totals">
                  <div className="inv-total-row"><span>Subtotal</span><span>{currency} {orderSubtotal.toLocaleString()}</span></div>
                  {orderSubtotal > orderTotal && (
                    <div className="inv-total-row inv-total-disc"><span>Discount</span><span>−{currency} {(orderSubtotal - orderTotal).toLocaleString()}</span></div>
                  )}
                  <div className="inv-total-row">
                    <span>Paid</span>
                    <span>{currency} {persistedPaidTotal.toLocaleString()}</span>
                  </div>
                  <div className="inv-total-row inv-total-grand">
                    <span>Total</span>
                    <span>{currency} {orderTotal.toLocaleString()}</span>
                  </div>
                </div>
                <footer className="inv-foot">
                  {settings.receipt_thankyou_en && <p className="inv-foot-thanks">{settings.receipt_thankyou_en}</p>}
                  {settings.receipt_thankyou && <p className="inv-foot-thanks-alt">{settings.receipt_thankyou}</p>}
                </footer>
              </article>

              {viewOrder.notes && <p className="mx-auto mt-3 max-w-md text-xs text-muted"><b>Notes:</b> {viewOrder.notes}</p>}
              <div className="order-view-payment mx-auto mt-3 max-w-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-heading">
                    Selected for payment: <b className="text-success">{paidIds.length}/{viewItems.length}</b> items · <b className="text-success">{currency} {paidTotal.toLocaleString()}</b>
                  </span>
                  <button
                    onClick={savePaid}
                    disabled={savingPay || viewItems.length === 0}
                    className="rounded-lg bg-success px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingPay ? 'Saving…' : 'SAVE PAYMENT'}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-muted">Order stays billed until every item is marked paid, then it becomes completed.</p>
              </div>
              <div className="mx-auto mt-3 flex max-w-md items-center justify-between gap-3 border-t border-line pt-3">
                <button onClick={() => { setPrintOrder(viewOrder); setPrintItems(viewItems) }} className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700">
                  <Printer className="h-3.5 w-3.5" /> Print Copy
                </button>
                <button onClick={() => { setViewOrder(null); setViewItems([]) }} className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-heading hover:bg-gray-50">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {editOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[88vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-heading">EDIT ORDER - {editOrder.order_no}</h3>
                <button onClick={() => setEditOrder(null)} className="text-muted hover:text-heading"><X className="w-4 h-4" /></button>
              </div>

              <p className="text-[11px] font-semibold text-accent mb-2 uppercase tracking-wide">Order Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Customer Name *</label>
                  <input value={editForm.customer_name} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Payment Method</label>
                  <select value={editForm.payment_method} onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                    <option value="Cash">Cash</option>
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Bank">Bank</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Order Date</label>
                  <input type="date" value={editForm.order_date} onChange={e => setEditForm({ ...editForm, order_date: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Notes</label>
                  <input value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-accent uppercase tracking-wide">Items (correct errors)</p>
                <button onClick={() => setEditItems(prev => {
                    const p = products.find(x => x.active !== 0)
                    return p ? [...prev, newLine(p)] : prev
                  })}
                  className="text-accent text-xs font-bold hover:underline">+ Add Product</button>
              </div>

              {editItems.length === 0 && (
                <div className="py-6 text-center text-xs text-muted rounded-lg border border-line mb-3">No items loaded. Press "+ Add Product" to add one.</div>
              )}

              <div className="space-y-2 mb-4">
                {editItems.map((it, idx) => {
                  const prod = products.find(p => p.id === it.pid)
                  const units = unitsOf(prod)
                  const types = typesOf(prod, it.unit)
                  const buyCost = prod ? unitBuyCost(
                    prod.buy_price,
                    prod.buy_price_unit || 'Piece',
                    it.unit,
                    prod.pieces_per_carton,
                    prod.dozens_per_carton,
                    prod.pieces_per_dozen
                  ) : 0
                  const priceBelowBuy = buyCost > 0 && Number(it.price) <= buyCost
                  return (
                    <div key={idx} className="rounded-lg border border-line p-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={it.pid}
                          onChange={e => {
                            const pid = Number(e.target.value)
                            const p = products.find(x => x.id === pid)
                            const nl = newLine(p)
                            setEditItems(prev => prev.map((x, i) => i === idx ? { ...nl, qty: x.qty } : x))
                          }}
                          className="flex-1 min-w-[140px] px-2 py-1.5 rounded border border-line text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="">Select product…</option>
                          {products.filter(p => p.active !== 0).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input type="number" min="1" value={it.qty}
                          onChange={e => setEditItems(prev => prev.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) || 0 } : x))}
                          className="w-16 px-2 py-1.5 rounded border border-line text-xs text-center focus:outline-none focus:ring-1 focus:ring-accent" />
                        <select value={it.unit}
                          onChange={e => {
                            const unit = e.target.value
                            setEditItems(prev => prev.map((x, i) => i === idx ? { ...x, unit, price: priceOf(prod, unit, x.type) } : x))
                          }}
                          className="px-2 py-1.5 rounded border border-line text-xs focus:outline-none focus:ring-1 focus:ring-accent">
                          {units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select value={it.type}
                          onChange={e => {
                            const type = e.target.value
                            setEditItems(prev => prev.map((x, i) => i === idx ? { ...x, type, price: priceOf(prod, x.unit, type) } : x))
                          }}
                          className="px-2 py-1.5 rounded border border-line text-xs focus:outline-none focus:ring-1 focus:ring-accent">
                          {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input type="number" min="0" value={it.price}
                          onChange={e => setEditItems(prev => prev.map((x, i) => i === idx ? { ...x, price: Number(e.target.value) || 0 } : x))}
                          className={`w-24 px-2 py-1.5 rounded border text-xs text-right focus:outline-none focus:ring-1 focus:ring-accent ${priceBelowBuy ? 'border-danger bg-red-50' : 'border-line'}`} />
                        <span className="text-xs font-bold text-accent min-w-[90px] text-right">TSh {((it.price || 0) * (it.qty || 0)).toLocaleString()}</span>
                        <button onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))} className="text-danger hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      {priceBelowBuy && <p className="mt-1 text-[10px] font-semibold text-danger">Unit price must be greater than buy cost (TSh {buyCost.toLocaleString()}).</p>}
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-between border-t border-line pt-3 mb-4">
                <span className="text-xs font-bold text-heading">NEW TOTAL</span>
                <span className="text-sm font-bold text-accent">TSh {editItems.reduce((s, it) => s + (it.price || 0) * (it.qty || 0), 0).toLocaleString()}</span>
              </div>

              {editError && <p className="text-xs text-danger mb-3">{editError}</p>}
              <div className="flex gap-3">
                <button onClick={() => setEditOrder(null)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={saveOrderEdit} disabled={editSaving} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                  <Pencil className="w-3 h-3" /> {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      {printOrder && (
          <InvoicePrint
            order={printOrder}
            items={printItems}
            onClose={() => { setPrintOrder(null); setPrintItems([]) }}
          />
        )}
      </div>
    </div>
  )
}