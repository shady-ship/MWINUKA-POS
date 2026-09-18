import { useState, useEffect } from 'react'
import { Search, History, RefreshCw } from 'lucide-react'
import { useApp } from '../../context/useApp'

const ACTION_META = [
  { match: 'product.add', label: 'Product Added', cls: 'bg-green-100 text-success' },
  { match: 'product.update', label: 'Product Updated', cls: 'bg-amber-100 text-warning' },
  { match: 'product.delete', label: 'Product Deleted', cls: 'bg-red-100 text-danger' },
  { match: 'order.create', label: 'Order Created', cls: 'bg-green-100 text-success' },
  { match: 'order.status', label: 'Order Status', cls: 'bg-blue-100 text-accent' },
  { match: 'order.pay', label: 'Order Paid', cls: 'bg-green-100 text-success' },
  { match: 'order.delete', label: 'Order Deleted', cls: 'bg-red-100 text-danger' },
  { match: 'customer.add', label: 'Customer Added', cls: 'bg-green-100 text-success' },
  { match: 'customer.update', label: 'Customer Updated', cls: 'bg-amber-100 text-warning' },
  { match: 'customer.delete', label: 'Customer Deleted', cls: 'bg-red-100 text-danger' },
  { match: 'user.add', label: 'Staff Added', cls: 'bg-green-100 text-success' },
  { match: 'user.update', label: 'Staff Updated', cls: 'bg-amber-100 text-warning' },
  { match: 'user.delete', label: 'Staff Deleted', cls: 'bg-red-100 text-danger' },
  { match: 'auth.login', label: 'Login', cls: 'bg-gray-100 text-muted' },
  { match: 'auth.password_change', label: 'Password Changed', cls: 'bg-purple-100 text-purple-700' },
  { match: 'settings.update', label: 'Settings Updated', cls: 'bg-blue-100 text-accent' },
  { match: 'settings.reset', label: 'Data Reset', cls: 'bg-red-100 text-danger' },
]

function actionMeta(action) {
  for (const m of ACTION_META) if (action?.includes(m.match)) return m
  const cap = (action || '').replace(/[._-]+/g, ' ')
  return { label: cap.charAt(0).toUpperCase() + cap.slice(1), cls: 'bg-gray-100 text-muted' }
}

export default function AdminAudit() {
  const { auditLogs, fetchAudit, usersList } = useApp()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [userId, setUserId] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit])

  const applyFilters = () => {
    fetchAudit({ dateFrom, dateTo, userId, search })
  }

  const resetFilters = () => {
    setDateFrom(''); setDateTo(''); setUserId(''); setSearch('')
    fetchAudit()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-heading flex items-center gap-2"><History className="w-5 h-5 text-accent" /> ACTIVITY / AUDIT LOG</h2>
        <button onClick={() => fetchAudit({ dateFrom, dateTo, userId, search })} className="bg-accent text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-line p-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">User</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="">All Users</option>
              {usersList.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Action, user, details..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={applyFilters} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors">Apply Filters</button>
            <button onClick={resetFilters} className="border border-line px-4 py-2 rounded-lg text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Reset</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-line">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Date & Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Action</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map(log => {
              const meta = actionMeta(log.action)
              return (
                <tr key={log.id} className="border-b border-line hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{log.created_at}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-heading">{log.username || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted">{log.role}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.cls}`}>{meta.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{log.details || '—'}</td>
                </tr>
              )
            })}
            {auditLogs.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-muted text-sm">No activity recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}