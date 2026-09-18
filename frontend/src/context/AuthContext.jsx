import { useState, useEffect, useContext, createContext } from 'react'

const AuthContext = createContext()

const API = 'http://localhost:5000/api'

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
    window.fetch = (input, init) => {
      const headers = new Headers(init?.headers || (input?.headers || {}))
      headers.set('x-user-id', String(user.id))
      return original(input, { ...init, headers })
    }
    return () => { window.fetch = original }
  }, [user])

  const login = async (usernameOrEmail, password) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usernameOrEmail, password }),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error || 'Invalid credentials' }
      setUser(data.user)
      return { success: true, user: data.user }
    } catch (err) {
      return { success: false, error: 'Unable to connect to server' }
    }
  }

  const logout = () => {
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