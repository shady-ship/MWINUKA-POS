import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, X, Calendar } from 'lucide-react'
import { useApp } from '../context/useApp'

function localDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function OrdersPage() {
  const { ordersList, markItemsPaid } = useApp()
  const [filter, setFilter] = useState('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState('newest')
  const [viewOrder, setViewOrder] = useState(null)
  const [viewItems, setViewItems] = useState([])
  const [paidIds, setPaidIds] = useState([])
  const [savingPay, setSavingPay] = useState(false)

  const today = localDate(new Date())

  const reloadView = async (id) => {
    const res = await fetch(`http://localhost:5000/api/orders/${id}`)
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

  const togglePaid = (id) =>
    setPaidIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const savePaid = async () => {
    setSavingPay(true)
    const ok = await markItemsPaid(viewOrder.id, paidIds)
    if (!ok) {
      alert('Could not save payment. Please restart the server (backend) and try again, then tick the paid items.')
    } else {
      await reloadView(viewOrder.id)
    }
    setSavingPay(false)
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
  const totalSales = filtered.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const rangeLabel = from && to ? `${from} to ${to}` : from ? `from ${from}` : to ? `until ${to}` : 'all time'

  const rangeOrders = ordersList.filter(inRange)
  const countStatus = (s) => rangeOrders.filter(o => o.status === s).length
  const chips = [
    { key: 'All', label: 'All', count: rangeOrders.length },
    { key: 'Completed', label: 'Paid', count: countStatus('Completed') },
    { key: 'Pending', label: 'Billed', count: countStatus('Pending') },
    { key: 'Cancelled', label: 'Cancelled', count: countStatus('Cancelled') },
  ]

  const sumItems = (arr) => arr.reduce((s, o) => s + (Number(o.item_count) || 0), 0)
  const totalItems = sumItems(rangeOrders)
  const billedItems = sumItems(rangeOrders.filter(o => o.status === 'Pending' || o.status === 'Completed'))
  const paidItems = sumItems(rangeOrders.filter(o => o.status === 'Completed'))

  const paidOrders = filtered.filter(o => o.status === 'Completed')
  const billedOrders = filtered.filter(o => o.status === 'Pending')
  const cancelledOrders = filtered.filter(o => o.status === 'Cancelled')
  const sumTotal = (arr) => arr.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const billedTotal = sumTotal(filtered.filter(o => o.status !== 'Cancelled'))
  const paidTotal = filtered.reduce((s, o) => s + (Number(o.paid_total) || 0), 0)
  const cancelledTotal = sumTotal(cancelledOrders)

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

        <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
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
                    <button onClick={() => openView(order)} className="text-accent hover:text-primary transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-line">
                <td colSpan={4} className="px-4 py-3 text-xs font-bold text-heading uppercase tracking-wide">Total</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-warning">TSh {billedTotal.toLocaleString()}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-success">TSh {paidTotal.toLocaleString()}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
          {sorted.length === 0 && (
            <div className="py-12 text-center text-muted text-sm">No orders found for the selected period.</div>
          )}
        </div>

        {viewOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-heading">ORDER DETAILS - {viewOrder.order_no}</h3>
                <button onClick={() => { setViewOrder(null); setViewItems([]) }} className="text-muted hover:text-heading"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div><span className="text-muted">Customer:</span> <span className="font-semibold text-heading">{viewOrder.customer_name}</span></div>
                <div><span className="text-muted">Salesman:</span> <span className="font-semibold text-heading">{viewOrder.salesman_name}</span></div>
                <div><span className="text-muted">Date:</span> <span className="font-semibold text-heading">{viewOrder.order_date}</span></div>
                <div><span className="text-muted">Payment:</span> <span className="font-semibold text-heading">{viewOrder.payment_method}</span></div>
                <div><span className="text-muted">Status:</span> <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${viewOrder.status === 'Completed' ? 'bg-green-100 text-success' : viewOrder.status === 'Pending' ? 'bg-yellow-100 text-warning' : 'bg-red-100 text-danger'}`}>{viewOrder.status}</span></div>
              </div>
              {viewOrder.notes && <p className="text-xs text-muted mb-3">Notes: {viewOrder.notes}</p>}
              <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
                <span className="inline-block px-2.5 py-1 rounded-full bg-yellow-100 text-warning font-bold">Billed: {viewItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} units · TSh {(viewItems.reduce((s, i) => s + (Number(i.total) || 0), 0)).toLocaleString()}</span>
                <span className="inline-block px-2.5 py-1 rounded-full bg-green-100 text-success font-bold">Paid: {viewItems.filter(i => i.paid).length} products · TSh {(viewItems.filter(i => i.paid).reduce((s, i) => s + (Number(i.total) || 0), 0)).toLocaleString()}</span>
              </div>
              <div className="overflow-hidden rounded-lg border border-line mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-line">
                      <th className="text-left px-3 py-2 text-[10px] font-semibold text-muted">Item</th>
                      <th className="text-center px-3 py-2 text-[10px] font-semibold text-muted">Qty</th>
                      <th className="text-center px-3 py-2 text-[10px] font-semibold text-muted">Unit</th>
                      <th className="text-right px-3 py-2 text-[10px] font-semibold text-muted">Subtotal</th>
                      <th className="text-center px-3 py-2 text-[10px] font-semibold text-muted">Paid?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewItems.map(item => {
                      const checked = paidIds.includes(item.id)
                      return (
                        <tr key={item.id} className={`border-b border-line ${checked ? 'bg-green-50' : ''}`}>
                          <td className="px-3 py-2 text-xs text-heading">{item.product_name || `Product #${item.product_id}`}</td>
                          <td className="px-3 py-2 text-xs text-heading text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-xs text-heading text-center">{item.unit}</td>
                          <td className="px-3 py-2 text-xs font-semibold text-heading text-right">TSh {Number(item.total).toLocaleString()}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePaid(item.id)}
                              className="w-4 h-4 accent-green-600 cursor-pointer"
                              title="Mark as paid"
                            />
                          </td>
                        </tr>
                      )
                    })}
                    {viewItems.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-xs text-muted">No items recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 mb-4">
                <p className="text-[11px] font-semibold text-success mb-2 uppercase tracking-wide">PAID ITEMS — tick the products that have been paid</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-heading">
                    Selected: <span className="font-bold text-success">{paidIds.length}/{viewItems.length}</span> products · <span className="font-bold text-success">TSh {viewItems.filter(i => paidIds.includes(i.id)).reduce((s, i) => s + (Number(i.total) || 0), 0).toLocaleString()}</span>
                  </span>
                  <button
                    onClick={savePaid}
                    disabled={savingPay || viewItems.length === 0}
                    className="bg-success text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {savingPay ? 'Saving…' : 'SAVE PAID ITEMS'}
                  </button>
                </div>
                <p className="text-[10px] text-muted mt-2">Order stays <b className="text-warning">Billed</b> until every item is marked paid — then it becomes <b className="text-success">Completed</b>.</p>
              </div>
              <div className="flex justify-between border-t border-line pt-3">
                <span className="text-xs font-bold text-heading">BILLED TOTAL</span>
                <span className="text-sm font-bold text-accent">TSh {Number(viewOrder.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}