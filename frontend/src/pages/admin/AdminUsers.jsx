import { useState } from 'react'
import { Plus, User, X, Trash2, Power } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { useAuth } from '../../context/AuthContext'

export default function AdminUsers() {
  const { usersList, addUser, updateUser, deleteUser, ordersList } = useApp()
  const { user: currentUser } = useAuth()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'sales_staff' })
  const [deleteId, setDeleteId] = useState(null)
  const [error, setError] = useState('')

  const openAdd = () => {
    setForm({ name: '', username: '', password: '', role: 'sales_staff' })
    setError('')
    setModal(true)
  }

  const save = async () => {
    if (!form.name || !form.username || !form.password) {
      setError('Name, username and password are required')
      return
    }
    try {
      await addUser({ ...form, role: 'sales_staff' })
      setModal(false)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to add salesman. Try again.')
    }
  }

  const toggle = (u) => {
    if (u.id === currentUser?.id) return
    updateUser(u.id, { active: u.active === 0 ? 1 : 0 })
  }

  const remove = (id) => {
    if (id === currentUser?.id) return
    deleteUser(id)
    setDeleteId(null)
  }

  const salesByUser = (userId) => ordersList.filter(o => o.salesman_id === userId).length
  const salesTotalByUser = (userId) => ordersList.filter(o => o.salesman_id === userId).reduce((s, o) => s + (Number(o.total) || 0), 0)

  const staff = usersList.filter(u => u.role !== 'admin')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-heading">SALES STAFF (ACCESS PROVISION)</h2>
        <button onClick={openAdd} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
          <Plus className="w-3 h-3" /> ADD SALESMAN
        </button>
      </div>

      {error && <p className="text-xs text-danger mb-4">{error}</p>}

      <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-line">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Username</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Email</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Orders</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Sales (TSh)</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((u, i) => (
              <tr key={u.id} className={`border-b border-line hover:bg-gray-50 transition-colors ${u.active === 0 ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 text-xs text-muted">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-semibold text-heading">
                  <span className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-accent/10 rounded-full flex items-center justify-center"><User className="w-3 h-3 text-accent" /></div>
                    {u.name}
                    {u.id === currentUser?.id && <span className="text-[9px] text-muted bg-gray-100 px-1.5 py-0.5 rounded">You</span>}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-heading">{u.username || '-'}</td>
                <td className="px-4 py-3 text-sm text-muted">{u.email}</td>
                <td className="px-4 py-3 text-center text-sm font-semibold text-heading">{salesByUser(u.id)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-heading text-right">TSh {salesTotalByUser(u.id).toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.active === 0 ? 'bg-red-100 text-danger' : 'bg-green-100 text-success'}`}>
                    {u.active === 0 ? 'Disabled' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {u.id !== currentUser?.id && (
                      <>
                        <button onClick={() => toggle(u)} className={u.active === 0 ? 'text-warning' : 'text-success'} title={u.active === 0 ? 'Enable' : 'Disable'}>
                          <Power className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(u.id)} className="text-danger hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-muted text-sm">No sales staff yet. Click "ADD SALESMAN" to create one.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-heading">ADD SALESMAN ACCOUNT</h3>
              <button onClick={() => setModal(false)} className="text-muted hover:text-heading"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Full Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Mwinuka" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Username *</label>
                <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="e.g. john" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Password *</label>
                <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Enter password" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={save} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Create Account</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 className="w-6 h-6 text-danger" /></div>
            <h3 className="text-sm font-bold text-heading mb-1">Delete Salesman?</h3>
            <p className="text-xs text-muted mb-6">Their orders will remain but the account will be removed.</p>
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