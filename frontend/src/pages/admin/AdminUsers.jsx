import { useState } from 'react'
import { Plus, User, X, Trash2, Power, ShieldCheck, Pencil } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { useAuth } from '../../context/AuthContext'
import { ADMIN_MODULES, MODULE_LABELS, modulesOf } from '../../constants'

export default function AdminUsers() {
  const { usersList, addUser, updateUser, deleteUser, ordersList } = useApp()
  const { user: currentUser } = useAuth()
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'sales_staff', admin_modules: [] })
  const [deleteId, setDeleteId] = useState(null)
  const [error, setError] = useState('')
  const [accessUser, setAccessUser] = useState(null)
  const [accessForm, setAccessForm] = useState(new Set())
  const [accessError, setAccessError] = useState('')
  const [accessSaving, setAccessSaving] = useState(false)

  const openAdd = () => {
    setForm({ name: '', username: '', email: '', password: '', role: 'sales_staff', admin_modules: [] })
    setEditId(null)
    setError('')
    setModal(true)
  }

  const openEdit = (u) => {
    setForm({ name: u.name, username: u.username || '', email: u.email || '', password: '', role: 'sales_staff', admin_modules: [] })
    setEditId(u.id)
    setError('')
    setModal(true)
  }

  const save = async () => {
    if (!form.name || !form.username) {
      setError('Name and username are required')
      return
    }
    try {
      if (editId) {
        const data = { name: form.name, username: form.username, email: form.email || `${form.username}@mwinuka.co.tz` }
        if (form.password) data.password = form.password
        await updateUser(editId, data)
      } else {
        if (!form.password) {
          setError('Password is required for a new account')
          return
        }
        await addUser({ ...form, role: 'sales_staff', email: form.email || `${form.username}@mwinuka.co.tz`, admin_modules: form.admin_modules.join(',') })
      }
      setModal(false)
      setEditId(null)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to save salesman. Try again.')
    }
  }

  const openAccess = (u) => {
    setAccessUser(u)
    setAccessForm(new Set(modulesOf(u)))
    setAccessError('')
    setAccessSaving(false)
  }

  const saveAccess = async () => {
    setAccessSaving(true)
    setAccessError('')
    try {
      await updateUser(accessUser.id, { admin_modules: [...accessForm].join(',') })
      setAccessUser(null)
    } catch (err) {
      setAccessError(err.message || 'Failed to update access')
      setAccessSaving(false)
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Admin Access</th>
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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {modulesOf(u).map(key => (
                      <span key={key} className="inline-block px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[9px] font-semibold">{MODULE_LABELS[key] || key}</span>
                    ))}
                    {modulesOf(u).length === 0 && <span className="text-[10px] text-muted">None</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.active === 0 ? 'bg-red-100 text-danger' : 'bg-green-100 text-success'}`}>
                    {u.active === 0 ? 'Disabled' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(u)} className="text-accent hover:text-primary" title="Edit salesman details">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {u.id !== currentUser?.id && (
                      <>
                        <button onClick={() => openAccess(u)} className="text-accent hover:text-primary" title="Provision admin access">
                          <ShieldCheck className="w-4 h-4" />
                        </button>
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
              <tr><td colSpan={9} className="py-12 text-center text-muted text-sm">No sales staff yet. Click "ADD SALESMAN" to create one.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-heading">{editId ? 'EDIT SALESMAN ACCOUNT' : 'ADD SALESMAN ACCOUNT'}</h3>
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
                <label className="block text-xs font-semibold text-heading mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="e.g. john@mwinuka.co.tz" className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">{editId ? 'Password (leave blank to keep current)' : 'Password *'}</label>
                <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editId ? 'New password (optional)' : 'Enter password'} className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              {!editId && (
                <div>
                  <p className="text-xs font-semibold text-heading mb-1">Admin Module Access (optional)</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ADMIN_MODULES.map(m => (
                      <label key={m.key} className="flex items-center gap-1.5 bg-gray-50 rounded px-2 py-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={form.admin_modules.includes(m.key)}
                          onChange={e => setForm(prev => ({
                            ...prev,
                            admin_modules: e.target.checked ? [...prev.admin_modules, m.key] : prev.admin_modules.filter(k => k !== m.key)
                          }))}
                          className="accent-primary" />
                        <span className="text-heading font-medium">{m.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={save} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> {editId ? 'Save Changes' : 'Create Account'}</button>
            </div>
          </div>
        </div>
      )}

      {accessUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-heading">PROVISION ADMIN ACCESS</h3>
                <p className="text-xs text-muted mt-0.5">Grant {accessUser.name} access to selected admin modules</p>
              </div>
              <button onClick={() => setAccessUser(null)} className="text-muted hover:text-heading"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1.5 mb-4">
              {ADMIN_MODULES.map(m => (
                <label key={m.key} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 cursor-pointer">
                  <span className="text-xs font-medium text-heading">{m.label}</span>
                  <input type="checkbox" checked={accessForm.has(m.key)}
                    onChange={e => {
                      const next = new Set(accessForm)
                      if (e.target.checked) next.add(m.key); else next.delete(m.key)
                      setAccessForm(next)
                    }}
                    className="accent-primary" />
                </label>
              ))}
            </div>
            {accessError && <p className="text-xs text-danger mb-3">{accessError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setAccessUser(null)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={saveAccess} disabled={accessSaving} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {accessSaving ? 'Saving...' : 'Save Access'}
              </button>
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