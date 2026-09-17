import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { useApp } from '../context/useApp'

export default function ProductsPage() {
  const { products, addToCart, cart } = useApp()
  const [search, setSearch] = useState('')

  const filtered = products.filter(p =>
    p.active !== 0 && p.name.toLowerCase().includes(search.toLowerCase())
  )

  const getCartQty = (productId) => {
    return cart.filter(c => c.product_id === productId).reduce((s, c) => s + (Number(c.quantity) || 0), 0)
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-heading">ALL PRODUCTS</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg text-sm border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent w-64"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(product => (
            <div key={product.id} className="bg-white rounded-xl p-4 shadow-sm border border-line">
              <h4 className="font-semibold text-sm text-heading">{product.name}</h4>
              <div className="mt-2 space-y-1">
                {(product.prices || []).filter(p => p.retail_price != null || p.wholesale_price != null || p.optional_price != null).map(x => {
                  const parts = []
                  if (x.retail_price != null) parts.push(`R ${Number(x.retail_price).toLocaleString()}`)
                  if (x.wholesale_price != null) parts.push(`W ${Number(x.wholesale_price).toLocaleString()}`)
                  if (x.optional_price != null) parts.push(`O ${Number(x.optional_price).toLocaleString()}`)
                  return (
                    <div key={x.unit} className="text-xs">
                      <span className="font-semibold text-accent">{x.unit}:</span>{' '}
                      <span className="text-muted">{parts.length ? parts.join(' | ') : '—'}</span>
                    </div>
                  )
                })}
                {(!product.prices || product.prices.every(p => p.retail_price == null && p.wholesale_price == null && p.optional_price == null)) && (
                  <p className="text-xs text-muted">No prices set</p>
                )}
              </div>
              {product.prices?.some(p => p.optional_price != null) && (
                <p className="text-[9px] text-danger mt-1">* Optional {String.fromCharCode(8805)} buy price, manual at POS</p>
              )}
              {(product.pieces_per_carton > 0 || product.dozens_per_carton > 0) && (
                <p className="text-[9px] text-accent font-semibold mt-1">{product.pieces_per_carton > 0 ? `${product.pieces_per_carton} pcs/carton` : `${product.dozens_per_carton} dzs/carton`} · pack split available</p>
              )}
              <p className={`text-xs mt-2 ${product.stock > (product.min_stock || 20) ? 'text-success' : product.stock > 0 ? 'text-danger font-bold' : 'text-danger'}`}>
                {product.stock > (product.min_stock || 20) ? `In Stock (${product.stock})` : product.stock > 0 ? `Low Stock (${product.stock})` : 'Out of Stock'}
              </p>
              {getCartQty(product.id) > 0 ? (
                <div className="mt-3 flex items-center justify-center gap-2 bg-accent/10 rounded-lg py-1.5">
                  <span className="text-xs font-semibold text-accent">In Cart: {getCartQty(product.id)}</span>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0 || !product.prices || product.prices.length === 0}
                  className="mt-3 w-full bg-primary text-white text-xs font-semibold py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add to Order
                </button>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted">
            <p className="text-sm">No products found. Add products in the admin panel.</p>
          </div>
        )}

        {cart.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <Link
              to="/orders/new"
              className="bg-success text-white px-6 py-3 rounded-full shadow-lg font-semibold text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{cart.reduce((s, i) => s + i.quantity, 0)} items</span>
              TSh {cart.reduce((s, i) => s + (Number(i.selectedPrice) || 0) * (Number(i.quantity) || 0), 0).toLocaleString()}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}