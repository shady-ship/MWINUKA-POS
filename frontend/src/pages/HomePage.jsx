import { Link } from 'react-router-dom'
import { Package, Search, ShoppingCart, ClipboardList } from 'lucide-react'
import { useApp } from '../context/useApp'

export default function HomePage() {
  const { products, ordersList } = useApp()
  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todaySales = ordersList.filter(o => (o.order_date || '').slice(0, 10) === today).reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const topProducts = products.slice(0, 4)

  const quickActions = [
    { label: 'NEW ORDER', sub: 'Create new order', icon: ShoppingCart, to: '/orders/new', color: 'bg-primary' },
    { label: 'BROWSE PRODUCTS', sub: 'View all products', icon: Package, to: '/products', color: 'bg-accent' },
    { label: 'CHECK STOCK', sub: 'Check stock items', icon: Search, to: '/stock', color: 'bg-primary' },
    { label: 'VIEW ORDERS', sub: 'View today\'s orders', icon: ClipboardList, to: '/orders', color: 'bg-accent' },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-gradient-to-r from-primary to-primary-light text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-blue-200 text-sm mb-1">WELCOME!</p>
          <h2 className="text-3xl font-bold mb-2">MWINUKA ENTERPRISES CO LTD</h2>
          <p className="text-blue-200 text-sm">Serve Customers Better, Sell More, Grow Together.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <Package className="w-6 h-6 mx-auto mb-2 text-blue-200" />
              <p className="text-2xl font-bold">{totalProducts}</p>
              <p className="text-xs text-blue-200">Total Products</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <Search className="w-6 h-6 mx-auto mb-2 text-blue-200" />
              <p className="text-2xl font-bold">{totalStock}</p>
              <p className="text-xs text-blue-200">Available Stock Items</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-2xl font-bold">TSh {todaySales.toLocaleString()}</p>
              <p className="text-xs text-blue-200">Today's Sales</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h3 className="text-lg font-bold text-heading mb-4">QUICK ACTIONS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="bg-white rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow border border-line group"
            >
              <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <p className="font-bold text-xs text-heading">{action.label}</p>
              <p className="text-[10px] text-muted mt-0.5">{action.sub}</p>
            </Link>
          ))}
        </div>

        {topProducts.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading">TOP SELLING PRODUCTS</h3>
              <Link to="/products" className="text-accent text-xs font-semibold hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {topProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-xl p-4 shadow-sm border border-line">
                  <h4 className="font-semibold text-sm text-heading">{product.name}</h4>
                  <p className="text-accent font-bold text-sm mt-1">
                    {(product.prices || []).filter(p => p.retail_price != null || p.wholesale_price != null || p.optional_price != null).map(x => {
                      const parts = []
                      if (x.retail_price != null) parts.push(`R${Number(x.retail_price).toLocaleString()}`)
                      if (x.wholesale_price != null) parts.push(`W${Number(x.wholesale_price).toLocaleString()}`)
                      if (x.optional_price != null) parts.push(`O${Number(x.optional_price).toLocaleString()}`)
                      return `${x.unit} ${parts.join('|') || '—'}`
                    }).join('  •  ') || '—'}
                  </p>
                  <p className={`text-xs mt-1 ${product.stock > 20 ? 'text-success' : product.stock > 0 ? 'text-warning' : 'text-danger'}`}>
                    {product.stock > 20 ? 'In Stock' : product.stock > 0 ? `Low Stock (${product.stock})` : 'Out of Stock'}
                  </p>
                  <Link
                    to="/products"
                    className="mt-3 block text-center bg-primary text-white text-xs font-semibold py-2 rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    VIEW
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}

        {products.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-line">
            <p className="text-muted text-sm">No products yet. Add products in the admin panel.</p>
          </div>
        )}
      </div>
    </div>
  )
}
