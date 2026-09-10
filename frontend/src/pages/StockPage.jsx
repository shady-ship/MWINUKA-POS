import { useState } from 'react'
import { Search, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/useApp'

export default function StockPage() {
  const { products } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'All' ||
      (filter === 'Low Stock' && p.stock <= 20 && p.stock > 0) ||
      (filter === 'Out of Stock' && p.stock === 0) ||
      (filter === 'In Stock' && p.stock > 20)
    return matchSearch && matchFilter
  })

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-heading mb-6">STOCK CHECK</h2>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex gap-2">
            {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(f => (
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
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-line">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Product</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Price/Pc (TSh)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => (
                <tr key={product.id} className="border-b border-line hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-heading">{product.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-heading text-right">TSh {(Number(product.price) || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-heading text-right">{product.stock}</td>
                  <td className="px-4 py-3 text-center">
                    {product.stock === 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-danger">
                        <AlertTriangle className="w-3 h-3" /> Out of Stock
                      </span>
                    ) : product.stock <= 20 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-warning">
                        <AlertTriangle className="w-3 h-3" /> Low Stock
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-success">
                        In Stock
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
