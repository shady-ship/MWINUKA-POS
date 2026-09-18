import { useState } from 'react'
import { Search, AlertTriangle, Package, Edit, X, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { formatPackBreakdown, packPerCarton, piecesForQty, packBreakdown } from '../../constants'

export default function AdminStock() {
  const { products, updateProduct, deleteProduct } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [editItem, setEditItem] = useState(null)
  const [adjQty, setAdjQty] = useState('')
  const [adjType, setAdjType] = useState('add')
  const [adjUnit, setAdjUnit] = useState('Piece')
  const [deleteId, setDeleteId] = useState(null)
  const [editMinStock, setEditMinStock] = useState('')

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const min = p.min_stock || 20
    const matchFilter =
      filter === 'All' ||
      (filter === 'Low Stock' && p.stock <= min && p.stock > 0) ||
      (filter === 'Out of Stock' && p.stock === 0) ||
      (filter === 'In Stock' && p.stock > min)
    return matchSearch && matchFilter
  })

  const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
  const lowStockCount = products.filter(p => p.active !== 0 && p.stock <= (p.min_stock || 20) && p.stock > 0).length
  const outOfStockCount = products.filter(p => p.active !== 0 && p.stock === 0).length

  const openAdjust = (p) => { setEditItem(p); setAdjQty(''); setAdjType('add'); setAdjUnit('Piece'); setEditMinStock(p.min_stock || '') }

  const saveAdjust = () => {
    const pieces = piecesForQty(Number(adjQty), adjUnit, editItem.pieces_per_carton, editItem.dozens_per_carton)
    const newStock = adjType === 'add' ? (Number(editItem.stock) || 0) + pieces : Math.max(0, (Number(editItem.stock) || 0) - pieces)
    updateProduct(editItem.id, { stock: newStock, min_stock: Number(editMinStock || 20) })
    setEditItem(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-heading">STOCK MANAGEMENT</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-accent" /></div>
            <div><p className="text-[10px] text-muted">TOTAL STOCK</p><p className="text-lg font-bold text-heading">{totalStock}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-danger" /></div>
            <div><p className="text-[10px] text-muted">LOW STOCK ITEMS</p><p className="text-lg font-bold text-danger">{lowStockCount}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-line">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-danger" /></div>
            <div><p className="text-[10px] text-muted">OUT OF STOCK</p><p className="text-lg font-bold text-danger">{outOfStockCount}</p></div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div className="flex gap-2">
          {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-white text-heading border border-line hover:bg-gray-50'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-line">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Product</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Prices (TSh)</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Crtn</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Dzn</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Pcs</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Min Stock</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product, index) => {
              const min = product.min_stock || 20
              const low = product.stock <= min
              const bd = packBreakdown(product.stock, product.pieces_per_carton, product.dozens_per_carton)
              return (
                <tr key={product.id} className={`border-b border-line hover:bg-gray-50 transition-colors ${low || product.stock === 0 ? 'bg-red-50/50' : ''}`}>
                  <td className="px-4 py-3 text-xs text-muted">{index + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-heading">{product.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-heading text-right">
                    {(product.prices || []).filter(p => p.retail_price != null || p.wholesale_price != null || p.optional_price != null).map(x => {
                      const parts = []
                      if (x.retail_price != null) parts.push(`R${Number(x.retail_price).toLocaleString()}`)
                      if (x.wholesale_price != null) parts.push(`W${Number(x.wholesale_price).toLocaleString()}`)
                      if (x.optional_price != null) parts.push(`O${Number(x.optional_price).toLocaleString()}`)
                      return `${x.unit} ${parts.join('|') || '—'}`
                    }).join('  •  ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-heading">{bd.perCarton > 0 ? bd.cartons : '—'}</td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-heading">{bd.dozens}</td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-heading">{bd.pieces}</td>
                  <td className="px-4 py-3 text-sm text-muted text-right">{min}</td>
                  <td className="px-4 py-3 text-center">
                    {product.stock === 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-danger"><AlertTriangle className="w-3 h-3" /> Out of Stock</span>
                    ) : low ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-danger"><AlertTriangle className="w-3 h-3" /> Below Min Stock</span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-success">In Stock</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openAdjust(product)} className="text-accent hover:text-primary transition-colors text-xs font-semibold flex items-center gap-1">
                        <Edit className="w-3 h-3" /> Adjust
                      </button>
                      <button onClick={() => setDeleteId(product.id)} className="text-danger hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-muted text-sm">No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-heading">ADJUST STOCK</h3>
              <button onClick={() => setEditItem(null)} className="text-muted hover:text-heading"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-heading">{editItem.name}</p>
                <p className="text-xs text-muted">Current stock: <span className="font-bold text-heading">{editItem.stock}</span></p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setAdjType('add')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${adjType === 'add' ? 'bg-success text-white' : 'bg-gray-100 text-heading hover:bg-gray-200'}`}>+ Add Stock</button>
                <button onClick={() => setAdjType('remove')} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${adjType === 'remove' ? 'bg-danger text-white' : 'bg-gray-100 text-heading hover:bg-gray-200'}`}>- Remove Stock</button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Unit</label>
                <select value={adjUnit} onChange={e => setAdjUnit(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="Piece">Piece</option>
                  {packPerCarton(editItem.pieces_per_carton, editItem.dozens_per_carton) >= 12 && <option value="Dozen">Dozen (12 pcs)</option>}
                  {packPerCarton(editItem.pieces_per_carton, editItem.dozens_per_carton) > 0 && <option value="Carton">Carton ({formatPackBreakdown(packPerCarton(editItem.pieces_per_carton, editItem.dozens_per_carton), editItem.pieces_per_carton, editItem.dozens_per_carton)})</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Quantity ({adjUnit === 'Carton' ? 'cartons' : adjUnit === 'Dozen' ? 'dozens' : 'pieces'})*</label>
                <input value={adjQty} onChange={e => setAdjQty(e.target.value)} type="number" min="1" placeholder="Enter quantity"
                  className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                {adjQty > 0 && <p className="text-[10px] text-muted mt-0.5">= {piecesForQty(Number(adjQty), adjUnit, editItem.pieces_per_carton, editItem.dozens_per_carton)} pieces</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Minimum Stock Alert Level</label>
                <input value={editMinStock} onChange={e => setEditMinStock(e.target.value)} type="number" min="0" placeholder="20"
                  className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-xs">
                <p className="text-muted">Current: <span className="font-bold text-heading">{editItem.stock} pcs</span> {packPerCarton(editItem.pieces_per_carton, editItem.dozens_per_carton) > 0 ? `(${formatPackBreakdown(editItem.stock, editItem.pieces_per_carton, editItem.dozens_per_carton)})` : ''}</p>
                <p className="text-muted mt-1">New: <span className="font-bold text-accent">{adjType === 'add' ? (Number(editItem.stock) || 0) + piecesForQty(Number(adjQty), adjUnit, editItem.pieces_per_carton, editItem.dozens_per_carton) : Math.max(0, (Number(editItem.stock) || 0) - piecesForQty(Number(adjQty), adjUnit, editItem.pieces_per_carton, editItem.dozens_per_carton))} pcs</span> {packPerCarton(editItem.pieces_per_carton, editItem.dozens_per_carton) > 0 ? `(${formatPackBreakdown(adjType === 'add' ? (Number(editItem.stock) || 0) + piecesForQty(Number(adjQty), adjUnit, editItem.pieces_per_carton, editItem.dozens_per_carton) : Math.max(0, (Number(editItem.stock) || 0) - piecesForQty(Number(adjQty), adjUnit, editItem.pieces_per_carton, editItem.dozens_per_carton)), editItem.pieces_per_carton, editItem.dozens_per_carton)})` : ''}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditItem(null)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={saveAdjust} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 className="w-6 h-6 text-danger" /></div>
            <h3 className="text-sm font-bold text-heading mb-1">Delete Product?</h3>
            <p className="text-xs text-muted mb-6">This will permanently remove this product.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => { deleteProduct(deleteId); setDeleteId(null) }} className="flex-1 bg-danger text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}