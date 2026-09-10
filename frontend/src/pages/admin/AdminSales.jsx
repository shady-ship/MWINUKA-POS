import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, ShoppingCart, DollarSign } from 'lucide-react'
import { useApp } from '../../context/useApp'

export default function AdminSales() {
  const { ordersList } = useApp()
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const todaySales = ordersList.filter(o => o.date === today).reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const totalRevenue = ordersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

  const weeklySales = (() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      const sales = ordersList.filter(o => o.date === dateStr).reduce((sum, o) => sum + (Number(o.total) || 0), 0)
      days.push({ date: label, sales })
    }
    return days
  })()

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-heading mb-6">SALES</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-muted">TODAY'S SALES</p>
              <p className="text-lg font-bold text-heading">TSh {todaySales.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-[10px] text-muted">TOTAL REVENUE</p>
              <p className="text-lg font-bold text-heading">TSh {totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-[10px] text-muted">TOTAL ORDERS</p>
              <p className="text-lg font-bold text-heading">{ordersList.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-line mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-heading">SALES OVERVIEW</h3>
          <span className="text-[10px] text-muted bg-gray-100 px-3 py-1 rounded-full">This Week</span>
        </div>
        {weeklySales.some(d => d.sales > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip formatter={(value) => [`TSh ${(Number(value) || 0).toLocaleString()}`, 'Sales']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-muted text-center py-16">No sales data yet</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h3 className="text-sm font-bold text-heading">RECENT TRANSACTIONS</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-line">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Order</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Customer</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Date</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-muted">Amount</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {ordersList.map(order => (
              <tr key={order.id} className="border-b border-line hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-sm font-semibold text-accent">{order.order_no}</td>
                <td className="px-6 py-3 text-sm text-heading">{order.customer_name}</td>
                <td className="px-6 py-3 text-sm text-muted">{order.order_date}</td>
                <td className="px-6 py-3 text-sm font-semibold text-heading text-right">TSh {Number(order.total).toLocaleString()}</td>
                <td className="px-6 py-3 text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-success">
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ordersList.length === 0 && (
          <div className="py-12 text-center text-muted text-sm">No transactions yet.</div>
        )}
      </div>
    </div>
  )
}
