import { useState, useEffect, useContext, createContext } from 'react'

const AuthContext = createContext()

const API = `/api`

function detectDevice() {
  const ua = navigator.userAgent || ''
  let browser = 'Unknown'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\//.test(ua)) browser = 'Opera'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua)) browser = 'Safari'
  const plat = navigator.userAgentData?.platform || navigator.platform || ''
  let os = 'Unknown'
  if (/Win/.test(plat)) os = 'Windows'
  else if (/Mac/.test(plat)) os = 'macOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iPhone|iPad/.test(ua)) os = 'iOS'
  else if (/Linux/.test(plat)) os = 'Linux'
  const dims = `${window.screen?.width || '?'}\u00d7${window.screen?.height || '?'}`
  const label = `${browser} on ${os} (${dims}, ${/Mobi/i.test(ua) ? 'Mobile' : 'Desktop'})`
  return { label, browser, os }
}

function loadUser() {
  try {
    const data = localStorage.getItem('mwinuka_auth')
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser)

  useEffect(() => {
    if (user) {
      localStorage.setItem('mwinuka_auth', JSON.stringify(user))
    } else {
      localStorage.removeItem('mwinuka_auth')
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const original = window.fetch
    window.fetch = async (input, init) => {
      const headers = new Headers(init?.headers || (input?.headers || {}))
      headers.set('x-user-id', String(user.id))
      if (user.sessionId) headers.set('x-session-id', String(user.sessionId))
      const res = await original(input, { ...init, headers })
      const url = String(input?.url || input || '')
      const isAuth = url.includes('/auth/login') || url.includes('/auth/logout')
      if (res.status === 401 && !isAuth) setUser(null)
      return res
    }
    return () => { window.fetch = original }
  }, [user])

  useEffect(() => {
    if (!user?.sessionId) return
    const ping = () => {
      fetch(`${API}/auth/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: user.sessionId }),
      }).catch(() => {})
    }
    ping()
    const t = setInterval(ping, 30000)
    return () => clearInterval(t)
  }, [user?.sessionId])

  const login = async (usernameOrEmail, password) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usernameOrEmail, password, device: detectDevice() }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error || 'Invalid credentials' }
      setUser({ ...data.user, sessionId: data.session_id })
      return { success: true, user: data.user }
    } catch (err) {
      return { success: false, error: 'Unable to connect to server' }
    }
  }

  const logout = () => {
    if (user?.sessionId) {
      fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: user.sessionId }),
      }).catch(() => {})
    }
    setUser(null)
  }

  const updateUser = async (patch) => {
    const res = await fetch(`${API}/auth/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to update profile')
    setUser(prev => ({
      ...prev,
      name: data.name !== undefined ? data.name : prev.name,
      username: data.username !== undefined ? data.username : prev.username,
      role: data.role !== undefined ? data.role : prev.role,
      admin_modules: data.admin_modules !== undefined ? data.admin_modules : prev.admin_modules,
    }))
    return data
  }

  const changePassword = async (currentPassword, newPassword) => {
    const res = await fetch(`${API}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, currentPassword, newPassword }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to change password')
    return data
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}