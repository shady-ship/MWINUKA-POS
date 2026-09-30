import { useState, useEffect, useCallback } from 'react'
import { MonitorSmartphone, Power, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const API = '/api'

const fmt = (d) => {
  if (!d) return '-'
  const dt = new Date(d)
  return dt.toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const rel = (d) => {
  if (!d) return '-'
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr ago`
  return fmt(d)
}

export default function AdminDevices() {
  const { user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [filter, setFilter] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/auth/sessions`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load sessions')
      setData(json)
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  const revoke = async (s) => {
    if (!window.confirm(`Sign out "${s.name || 'Unknown'}" on "${s.device_label || 'this device'}"?\nThey will be logged out immediately.`)) return
    setError('')
    let json = null
    try {
      const res = await fetch(`${API}/auth/sessions/${s.id}/revoke`, { method: 'POST' })
      try {
        json = await res.json()
      } catch {
        const text = await res.text().catch(() => '')
        setError(`Server returned HTML (status ${res.status}) instead of JSON. The backend likely wasn't restarted — stop it (Ctrl+C) then run: node server.js`)
        return
      }
      if (!res.ok) {
        setError(json.error || 'Failed to sign out')
        return
      }
    } catch (err) {
      setError('Unable to reach the server. Is the backend running?')
      return
    }

    if (String(s.id) === String(user?.sessionId)) {
      setData(prev => prev && {
        ...prev,
        sessions: prev.sessions.map(x => x.id === s.id ? { ...x, logout_at: new Date().toISOString() } : x),
      })
      window.alert('You signed out your own session. Logging you out now.')
      logout()
      return
    }

    setData(prev => prev && {
      ...prev,
      sessions: prev.sessions.map(x => x.id === s.id ? { ...x, logout_at: new Date().toISOString() } : x),
      counts: { ...prev.counts, active: Math.max(0, (prev.counts?.active ?? 0) - 1) },
    })
    load()
  }

  const sessions = data?.sessions || []
  const isOnline = (s) => !s.logout_at && now - new Date(s.last_seen).getTime() <= 120000
  const statusOf = (s) => (s.logout_at ? 'out' : isOnline(s) ? 'online' : 'idle')
  const filtered = sessions.filter(s => {
    if (filter === 'active') return !s.logout_at
    if (filter === 'out') return !!s.logout_at
    if (filter === 'online') return isOnline(s)
    return true
  })

  const onlineCount = sessions.filter(isOnline).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-heading">DEVICES &amp; ACTIVE SESSIONS</h2>
        <button onClick={load} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> REFRESH
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
          <p className="text-xs text-muted mb-1">Logged in right now</p>
          <p className="text-2xl font-bold text-success"><MonitorSmartphone className="inline w-5 h-5 -mt-1 mr-1" />{onlineCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
          <p className="text-xs text-muted mb-1">Devices signed in</p>
          <p className="text-2xl font-bold text-heading">{data?.counts?.active ?? sessions.filter(s => !s.logout_at).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-line p-4">
          <p className="text-xs text-muted mb-1">Total logins recorded</p>
          <p className="text-2xl font-bold text-heading">{data?.counts?.total ?? sessions.length}</p>
        </div>
      </div>

      {error && <p className="text-xs text-danger mb-4">{error}</p>}

      <div className="flex items-center gap-2 mb-4">
        {[
          { key: 'active', label: `Signed in (${sessions.filter(s => !s.logout_at).length})` },
          { key: 'online', label: `Online now (${onlineCount})` },
          { key: 'out', label: 'Signed out' },
          { key: 'all', label: 'All' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === t.key ? 'bg-accent text-white' : 'bg-white border border-line text-muted hover:text-heading'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-line">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Device</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Staff</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Logged In</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Last Seen</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const st = statusOf(s)
              return (
                <tr key={s.id} className={`border-b border-line hover:bg-gray-50 transition-colors ${st === 'out' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-heading">{s.device_label || 'Unknown device'}</p>
                    <p className="text-[10px] text-muted mt-0.5">
                      {[s.browser, s.os, s.ip].filter(Boolean).join(' · ') || '·'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-heading">{s.name || 'Deleted user'}</p>
                    <p className="text-[10px] text-muted mt-0.5 capitalize">{s.role || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{fmt(s.login_at)}</td>
                  <td className="px-4 py-3 text-xs text-muted">{s.logout_at ? fmt(s.logout_at) : rel(s.last_seen)}</td>
                  <td className="px-4 py-3 text-center">
                    {st === 'online' && <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-success text-[10px] font-semibold">Online</span>}
                    {st === 'idle' && <span className="inline-block px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-semibold">Idle</span>}
                    {st === 'out' && <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-muted text-[10px] font-semibold">Signed Out</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {st !== 'out' ? (
                      <button onClick={() => revoke(s)} className="inline-flex items-center gap-1 text-danger hover:text-red-700 text-[11px] font-semibold transition-colors">
                        <Power className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-muted text-sm">No sessions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted mt-3">
        {loading ? 'Loading sessions...' : 'Sessions update live every 15s. "Sign Out" forces a device to log off immediately.'}
      </p>
    </div>
  )
}