import { Link } from 'react-router-dom'
import { BarChart3, TrendingUp, AlertTriangle, ShoppingCart, Package, DollarSign, Clock, Users } from 'lucide-react'
import { useApp } from '../../context/useApp'

export default function AdminDashboard() {
  const { products, ordersList } = useApp()

  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
  const lowStockProducts = products.filter(p => p.stock <= (p.min_stock || 20) && p.stock > 0)
  const outOfStockProducts = products.filter(p => p.stock === 0)

  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayOrders = ordersList.filter(o => (o.order_date || '').slice(0, 10) === todayStr)
  const todaySales = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const totalRevenue = ordersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const totalOrders = ordersList.length

  const stats = [
    { label: 'TOTAL PRODUCTS', value: totalProducts, icon: Package, color: 'text-accent', bg: 'bg-accent/10', link: '/admin/products' },
    { label: 'TOTAL STOCK', value: totalStock, icon: BarChart3, color: 'text-success', bg: 'bg-green-100', link: '/admin/stock' },
    { label: "TODAY'S SALES", value: `TSh ${todaySales.toLocaleString()}`, icon: TrendingUp, color: 'text-warning', bg: 'bg-yellow-100', link: '/admin/sales' },
    { label: 'TOTAL REVENUE', value: `TSh ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-danger', bg: 'bg-red-100', link: '/admin/reports' },
  ]

  const topSelling = [...products].sort((a, b) => b.stock - a.stock).slice(0, 5)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-heading">DASHBOARD</h2>
        <div className="text-xs text-muted bg-white px-3 py-1.5 rounded-lg border border-line">{today}</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <Link key={i} to={stat.link} className="bg-white rounded-xl p-4 shadow-sm border border-line hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted">{stat.label}</p>
                <p className="text-lg font-bold text-heading">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-accent" /></div>
            <div>
              <p className="text-[10px] text-muted">TOTAL ORDERS</p>
              <p className="text-lg font-bold text-heading">{totalOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-warning" /></div>
            <div>
              <p className="text-[10px] text-muted">TODAY'S ORDERS</p>
              <p className="text-lg font-bold text-heading">{todayOrders.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-success" /></div>
            <div>
              <p className="text-[10px] text-muted">UNIQUE CUSTOMERS</p>
              <p className="text-lg font-bold text-heading">{new Set(ordersList.map(o => o.customer)).size}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
          <h3 className="text-sm font-bold text-heading mb-4">TOP SELLING PRODUCTS</h3>
          {topSelling.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-2 text-xs font-semibold text-muted">Product</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted">Price/Pc</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted">Stock</th>
                </tr>
              </thead>
              <tbody>
                {topSelling.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="py-2.5"><span className="text-xs font-semibold text-heading">{p.name}</span></td>
                    <td className="py-2.5 text-xs text-heading text-right">
                      {(p.prices || []).filter(x => x.retail_price != null || x.wholesale_price != null || x.optional_price != null).map(x => {
                        const parts = []
                        if (x.retail_price != null) parts.push(`R${Number(x.retail_price).toLocaleString()}`)
                        if (x.wholesale_price != null) parts.push(`W${Number(x.wholesale_price).toLocaleString()}`)
                        if (x.optional_price != null) parts.push(`O${Number(x.optional_price).toLocaleString()}`)
                        return `${x.unit} ${parts.join('|') || '—'}`
                      }).join('  •  ') || '—'}
                    </td>
                    <td className="py-2.5 text-xs font-semibold text-heading text-right">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-muted text-center py-8">No products yet</p>
          )}
          <Link to="/admin/products" className="mt-3 block text-center border border-line rounded-lg py-2 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">
            VIEW ALL PRODUCTS
          </Link>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
          <h3 className="text-sm font-bold text-heading mb-4">LOW STOCK ALERT</h3>
          {lowStockProducts.length > 0 || outOfStockProducts.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {[...outOfStockProducts, ...lowStockProducts].map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-3 h-3 ${p.stock === 0 ? 'text-danger' : 'text-warning'}`} />
                    <span className="text-xs font-semibold text-heading">{p.name}</span>
                  </div>
                  <span className={`text-xs font-bold ${p.stock === 0 ? 'text-danger' : 'text-warning'}`}>{p.stock} left</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted text-center py-8">All products well stocked</p>
          )}
          <Link to="/admin/stock" className="mt-3 block text-center border border-line rounded-lg py-2 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">
            VIEW ALL STOCK
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
        <h3 className="text-sm font-bold text-heading mb-4">RECENT ORDERS</h3>
        {ordersList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-line">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted">Order No</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted">Customer</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted">Salesman</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted">Date</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted">Total (TSh)</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {ordersList.slice(0, 5).map(order => (
                  <tr key={order.id} className="border-b border-line hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-xs font-semibold text-accent">{order.order_no}</td>
                    <td className="px-3 py-2.5 text-xs text-heading">{order.customer_name}</td>
                    <td className="px-3 py-2.5 text-xs text-heading">{order.salesman_name}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{order.order_date}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-heading text-right">TSh {(Number(order.total) || 0).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${order.status === 'Completed' ? 'bg-green-100 text-success' : 'bg-yellow-100 text-warning'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted text-center py-8">No orders yet</p>
        )}
        <Link to="/admin/orders" className="mt-4 block text-center border border-line rounded-lg py-2 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">
          VIEW ALL ORDERS
        </Link>
      </div>
    </div>
  )
}
