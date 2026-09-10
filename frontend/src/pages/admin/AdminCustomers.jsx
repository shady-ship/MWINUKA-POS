import { useState } from 'react'
import { Search, Plus, Edit, Trash2, X, Phone, Mail } from 'lucide-react'
import { useApp } from '../../context/useApp'

export default function AdminCustomers() {
  const { customersList, addCustomer, updateCustomer, deleteCustomer } = useApp()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [editId, setEditId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const filtered = customersList.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => { setForm({ name: '', phone: '', email: '' }); setEditId(null); setModal('add') }
  const openEdit = (c) => { setForm({ name: c.name, phone: c.phone || '', email: c.email || '' }); setEditId(c.id); setModal('edit') }

  const save = async () => {
    if (!form.name) return
    if (modal === 'add') {
      await addCustomer(form)
    } else {
      await updateCustomer(editId, form)
    }
    setModal(null)
  }

  const remove = async (id) => { await deleteCustomer(id); setDeleteId(null) }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-heading">CUSTOMERS</h2>
        <button onClick={openAdd} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
          <Plus className="w-3 h-3" /> ADD CUSTOMER
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
        <div className="p-4 border-b border-line">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-line">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Contact</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Orders</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Total Spent</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer, index) => (
              <tr key={customer.id} className="border-b border-line hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-xs text-muted">{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{customer.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <span className="text-sm font-semibold text-heading">{customer.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    {customer.phone && <p className="text-xs text-muted flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</p>}
                    {customer.email && <p className="text-xs text-muted flex items-center gap-1"><Mail className="w-3 h-3" /> {customer.email}</p>}
                    {!customer.phone && !customer.email && <p className="text-xs text-muted">-</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-heading text-center">{customer.order_count || 0}</td>
                <td className="px-4 py-3 text-sm font-semibold text-accent text-right">TSh {Number(customer.total_spent || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(customer)} className="text-accent hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteId(customer.id)} className="text-danger hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-muted text-sm">No customers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-heading">{modal === 'add' ? 'ADD NEW CUSTOMER' : 'EDIT CUSTOMER'}</h3>
              <button onClick={() => setModal(null)} className="text-muted hover:text-heading"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Full Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Customer name" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0712 345 678" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={save} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors">{modal === 'add' ? 'Add Customer' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 className="w-6 h-6 text-danger" /></div>
            <h3 className="text-sm font-bold text-heading mb-1">Delete Customer?</h3>
            <p className="text-xs text-muted mb-6">This action cannot be undone.</p>
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
