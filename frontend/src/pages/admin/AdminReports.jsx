import { BarChart3, TrendingUp, ShoppingCart, Package, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useApp } from '../../context/useApp'

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6']

export default function AdminReports() {
  const { products, ordersList } = useApp()
  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
  const totalRevenue = ordersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

  const monthlySales = (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    return months.slice(0, now.getMonth() + 1).map((month, i) => ({
      month,
      sales: ordersList.filter(o => {
        const d = new Date(o.date)
        return d.getMonth() === i
      }).reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    }))
  })()

  const salesByCategory = (() => {
    const cats = {}
    ordersList.forEach(order => {
      order.items?.forEach(item => {
        const cat = item.category || 'Others'
        if (!cats[cat]) cats[cat] = 0
        cats[cat] += (item.selectedPrice || item.price) * item.quantity
      })
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value })).slice(0, 5)
  })()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-heading">REPORTS</h2>
        <button className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
          <Download className="w-3 h-3" /> EXPORT REPORT
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Products', value: totalProducts, icon: Package, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Total Stock', value: totalStock, icon: ShoppingCart, color: 'text-success', bg: 'bg-green-100' },
          { label: 'Total Orders', value: ordersList.length, icon: BarChart3, color: 'text-warning', bg: 'bg-yellow-100' },
          { label: 'Total Revenue', value: `TSh ${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-danger', bg: 'bg-red-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-line">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted">{stat.label}</p>
                <p className="text-lg font-bold text-heading">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
          <h3 className="text-sm font-bold text-heading mb-4">MONTHLY SALES</h3>
          {monthlySales.some(m => m.sales > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(value) => [`TSh ${(Number(value) || 0).toLocaleString()}`, 'Sales']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted text-center py-16">No sales data yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
          <h3 className="text-sm font-bold text-heading mb-4">SALES BY CATEGORY</h3>
          {salesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={salesByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {salesByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`TSh ${(Number(value) || 0).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted text-center py-16">No category data yet</p>
          )}
          {salesByCategory.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              {salesByCategory.map((cat, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] text-muted">{cat.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line">
          <h3 className="text-sm font-bold text-heading">ORDER HISTORY</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-line">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Order No</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Customer</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Date</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-muted">Total (TSh)</th>
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
          <div className="py-12 text-center text-muted text-sm">No orders yet.</div>
        )}
      </div>
    </div>
  )
}
