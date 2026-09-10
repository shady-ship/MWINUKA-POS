import { useApp } from '../context/useApp'

export default function ReportsPage() {
  const { products, ordersList } = useApp()
  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
  const totalRevenue = ordersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const totalOrders = ordersList.length

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-heading mb-6">REPORTS</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Products', value: totalProducts, color: 'bg-primary' },
            { label: 'Total Stock', value: totalStock, color: 'bg-accent' },
            { label: 'Total Orders', value: totalOrders, color: 'bg-success' },
            { label: 'Total Revenue', value: `TSh ${totalRevenue.toLocaleString()}`, color: 'bg-primary-light' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-line">
              <p className="text-xs text-muted mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-heading">{stat.value}</p>
              <div className={`h-1 ${stat.color} rounded-full mt-3`} />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-line p-6">
          <h3 className="text-sm font-bold text-heading mb-4">ORDER HISTORY</h3>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-line">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Order No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Total (TSh)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {ordersList.map(order => (
                <tr key={order.id} className="border-b border-line hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-accent">{order.order_no}</td>
                  <td className="px-4 py-3 text-sm text-heading">{order.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-muted">{order.order_date}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-heading text-right">TSh {Number(order.total).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
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
    </div>
  )
}
