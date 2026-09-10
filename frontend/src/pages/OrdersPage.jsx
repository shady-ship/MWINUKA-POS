import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { useApp } from '../context/useApp'

export default function OrdersPage() {
  const { ordersList } = useApp()
  const [filter, setFilter] = useState('All')

  const filtered = filter === 'All' ? ordersList : ordersList.filter(o => o.status === filter)

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

        <div className="flex gap-2 mb-6">
          {['All', 'Completed', 'Pending', 'Cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === f ? 'bg-primary text-white' : 'bg-white text-heading border border-line hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
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
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Action</th>
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
                    <button className="text-accent hover:text-primary transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted text-sm">No orders found.</div>
          )}
        </div>
      </div>
    </div>
  )
}
