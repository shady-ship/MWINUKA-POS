import { useState } from 'react'
import { Plus, Search, Edit, Trash2, X } from 'lucide-react'
import { useApp } from '../../context/useApp'

export default function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct } = useApp()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', price_dozen: '', price_carton: '', stock: '', unit: '' })
  const [editId, setEditId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setForm({ name: '', price: '', price_dozen: '', price_carton: '', stock: '', unit: '' })
    setEditId(null)
    setModal('add')
  }

  const openEdit = (p) => {
    setForm({ name: p.name, price: p.price, price_dozen: p.price_dozen || '', price_carton: p.price_carton || '', stock: p.stock, unit: p.unit || '' })
    setEditId(p.id)
    setModal('edit')
  }

  const save = () => {
    if (!form.name) return alert('Enter product name')
    if (!form.stock && form.stock !== 0) return alert('Enter stock quantity')
    const data = {
      ...form,
      price: Number(form.price),
      price_dozen: form.price_dozen ? Number(form.price_dozen) : null,
      price_carton: form.price_carton ? Number(form.price_carton) : null,
      stock: Number(form.stock),
    }
    if (modal === 'add') {
      addProduct(data)
    } else {
      updateProduct(editId, data)
    }
    setModal(null)
  }

  const remove = (id) => {
    deleteProduct(id)
    setDeleteId(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-heading">PRODUCTS</h2>
        <button onClick={openAdd} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
          <Plus className="w-3 h-3" /> ADD PRODUCT
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-line p-6">
        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-line">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Product</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Price/Pc (TSh)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Price/Dz (TSh)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Price/Ctn (TSh)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Unit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, index) => (
                <tr key={product.id} className="border-b border-line hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted">{index + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-heading">{product.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-heading text-right">{(Number(product.price) || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted text-right">{product.price_dozen ? (Number(product.price_dozen) || 0).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-sm text-muted text-right">{product.price_carton ? (Number(product.price_carton) || 0).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {product.unit ? <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent">{product.unit}</span> : <span className="text-xs text-muted">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-heading text-right">{product.stock}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(product)} className="text-accent hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(product.id)} className="text-danger hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-muted text-sm">No products yet. Click "ADD PRODUCT" to add one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-heading">{modal === 'add' ? 'ADD NEW PRODUCT' : 'EDIT PRODUCT'}</h3>
              <button onClick={() => setModal(null)} className="text-muted hover:text-heading"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Product Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Price per Piece (TSh)</label>
                  <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} type="number" min="0" placeholder="0" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Price per Dozen (TSh)</label>
                  <input value={form.price_dozen} onChange={e => setForm({ ...form, price_dozen: e.target.value })} type="number" min="0" placeholder="Optional" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Price per Carton (TSh)</label>
                  <input value={form.price_carton} onChange={e => setForm({ ...form, price_carton: e.target.value })} type="number" min="0" placeholder="Optional" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Stock *</label>
                  <input value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} type="number" min="0" placeholder="0" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Unit (Optional)</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                    <option value="">None</option>
                    <option value="Piece">Piece</option>
                    <option value="Dozen">Dozen</option>
                    <option value="Carton">Carton</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={save} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors">{modal === 'add' ? 'Add Product' : 'Save Changes'}</button>
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
              <button onClick={() => remove(deleteId)} className="flex-1 bg-danger text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
