import { useState } from 'react'
import { Eye, Trash2, X, CheckCircle, Printer } from 'lucide-react'
import { useApp } from '../../context/useApp'
import InvoicePrint from '../../components/InvoicePrint'

export default function AdminOrders() {
  const { ordersList, updateOrderStatus, deleteOrder } = useApp()
  const [filter, setFilter] = useState('All')
  const [viewOrder, setViewOrder] = useState(null)
  const [viewItems, setViewItems] = useState([])
  const [editOrder, setEditOrder] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [editStatus, setEditStatus] = useState('')
  const [printOrder, setPrintOrder] = useState(null)
  const [printItems, setPrintItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)

  const filtered = filter === 'All' ? ordersList : ordersList.filter(o => o.status === filter)

  const openView = async (o) => {
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${o.id}`)
      const data = await res.json()
      setViewOrder(data)
      setViewItems(data.items || [])
    } catch {
      setViewOrder(o)
      setViewItems([])
    }
  }

  const openPrint = async (o) => {
    setLoadingItems(true)
    try {
      const res = await fetch(`http://localhost:5000/api/orders/${o.id}`)
      const data = await res.json()
      setPrintOrder(data)
      setPrintItems(data.items || [])
    } catch {
      setPrintOrder(o)
      setPrintItems([])
    }
    setLoadingItems(false)
  }

  const openEdit = (o) => { setEditOrder(o); setEditStatus(o.status) }
  const saveEdit = async () => {
    await updateOrderStatus(editOrder.id, editStatus)
    setEditOrder(null)
  }
  const remove = async (id) => { await deleteOrder(id); setDeleteId(null) }

  const statusColor = (s) => s === 'Completed' ? 'bg-green-100 text-success' : s === 'Pending' ? 'bg-yellow-100 text-warning' : 'bg-red-100 text-danger'

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-heading mb-6">ORDERS</h2>

      <div className="flex gap-2 mb-6">
        {['All', 'Completed', 'Pending', 'Cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-white text-heading border border-line hover:bg-gray-50'}`}>{f}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-line">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Order No</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Salesman</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Date</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Total (TSh)</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => (
              <tr key={order.id} className="border-b border-line hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-semibold text-accent">{order.order_no}</td>
                <td className="px-4 py-3 text-sm text-heading">{order.customer_name}</td>
                <td className="px-4 py-3 text-sm text-heading">{order.salesman_name}</td>
                <td className="px-4 py-3 text-sm text-muted">{order.order_date}</td>
                <td className="px-4 py-3 text-sm font-semibold text-heading text-right">TSh {Number(order.total).toLocaleString()}</td>
                <td className="px-4 py-3 text-center"><span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColor(order.status)}`}>{order.status}</span></td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openView(order)} className="text-accent hover:text-primary transition-colors"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openPrint(order)} disabled={loadingItems} className="text-muted hover:text-heading transition-colors"><Printer className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(order)} className="text-muted hover:text-heading transition-colors"><CheckCircle className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteId(order.id)} className="text-danger hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-muted text-sm">No orders found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-heading">ORDER DETAILS - {viewOrder.order_no}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setPrintOrder(viewOrder); setPrintItems(viewItems) }} className="text-accent hover:text-primary transition-colors"><Printer className="w-4 h-4" /></button>
                <button onClick={() => { setViewOrder(null); setViewItems([]) }} className="text-muted hover:text-heading"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div><span className="text-muted">Customer:</span> <span className="font-semibold text-heading">{viewOrder.customer_name}</span></div>
              <div><span className="text-muted">Salesman:</span> <span className="font-semibold text-heading">{viewOrder.salesman_name}</span></div>
              <div><span className="text-muted">Date:</span> <span className="font-semibold text-heading">{viewOrder.order_date}</span></div>
              <div><span className="text-muted">Payment:</span> <span className="font-semibold text-heading">{viewOrder.payment_method}</span></div>
              <div><span className="text-muted">Status:</span> <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(viewOrder.status)}`}>{viewOrder.status}</span></div>
            </div>
            {viewOrder.notes && <p className="text-xs text-muted mb-3">Notes: {viewOrder.notes}</p>}
            <div className="flex justify-between border-t border-line pt-3">
              <span className="text-xs font-bold text-heading">TOTAL</span>
              <span className="text-sm font-bold text-accent">TSh {Number(viewOrder.total).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {editOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-heading">UPDATE ORDER STATUS</h3>
              <button onClick={() => setEditOrder(null)} className="text-muted hover:text-heading"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted mb-3">Order: <span className="font-semibold text-accent">{editOrder.order_no}</span> — {editOrder.customer_name}</p>
            <div className="flex gap-2 mb-4">
              {['Completed', 'Pending', 'Cancelled'].map(s => (
                <button key={s} onClick={() => setEditStatus(s)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${editStatus === s ? (s === 'Completed' ? 'bg-success text-white' : s === 'Pending' ? 'bg-warning text-white' : 'bg-danger text-white') : 'bg-gray-100 text-heading hover:bg-gray-200'}`}>{s}</button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditOrder(null)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={saveEdit} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> Save</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 className="w-6 h-6 text-danger" /></div>
            <h3 className="text-sm font-bold text-heading mb-1">Delete Order?</h3>
            <p className="text-xs text-muted mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => remove(deleteId)} className="flex-1 bg-danger text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-red-700 transition-colors">Delete</button>
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
  )
}
