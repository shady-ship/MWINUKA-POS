import { useState } from 'react'
import { Plus, Edit, Trash2, X } from 'lucide-react'

const defaultCategories = [
  { id: 1, name: 'Food & Beverages', count: 0 },
  { id: 2, name: 'Household', count: 0 },
  { id: 3, name: 'Electronics', count: 0 },
  { id: 4, name: 'Clothing', count: 0 },
  { id: 5, name: 'Stationery', count: 0 },
  { id: 6, name: 'Others', count: 0 },
]

export default function AdminCategories() {
  const [categories, setCategories] = useState(defaultCategories)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '' })
  const [editId, setEditId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const openAdd = () => { setForm({ name: '' }); setEditId(null); setModal('add') }
  const openEdit = (c) => { setForm({ name: c.name }); setEditId(c.id); setModal('edit') }

  const save = () => {
    if (!form.name) return
    if (modal === 'add') {
      setCategories(prev => [...prev, { id: Date.now(), name: form.name, count: 0 }])
    } else {
      setCategories(prev => prev.map(c => c.id === editId ? { ...c, name: form.name } : c))
    }
    setModal(null)
  }

  const remove = (id) => {
    setCategories(prev => prev.filter(c => c.id !== id))
    setDeleteId(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-heading">CATEGORIES</h2>
        <button onClick={openAdd} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
          <Plus className="w-3 h-3" /> ADD CATEGORY
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white rounded-xl p-5 shadow-sm border border-line hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{cat.name.charAt(0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(cat)} className="text-accent hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                <button onClick={() => setDeleteId(cat.id)} className="text-danger hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h4 className="font-semibold text-sm text-heading">{cat.name}</h4>
            <p className="text-xs text-muted mt-1">{cat.count} products</p>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-3 py-12 text-center text-muted text-sm">No categories yet. Click "ADD CATEGORY" to add one.</div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-heading">{modal === 'add' ? 'ADD CATEGORY' : 'EDIT CATEGORY'}</h3>
              <button onClick={() => setModal(null)} className="text-muted hover:text-heading"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">Category Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Category name" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={save} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors">{modal === 'add' ? 'Add' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 className="w-6 h-6 text-danger" /></div>
            <h3 className="text-sm font-bold text-heading mb-1">Delete Category?</h3>
            <p className="text-xs text-muted mb-6">Products in this category will be unassigned.</p>
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
