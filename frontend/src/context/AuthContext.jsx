import { useState, useEffect, useContext, createContext } from 'react'

const AuthContext = createContext()

const USERS = [
  { id: 1, name: 'Administrator', email: 'admin@mwinuka.co.tz', password: 'admin123', role: 'admin' },
  { id: 2, name: 'John Mwinuka', email: 'john@mwinuka.co.tz', password: 'staff123', role: 'sales' },
]

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

  const login = (email, password) => {
    const found = USERS.find(u => u.email === email && u.password === password)
    if (found) {
      const authenticatedUser = { id: found.id, name: found.name, email: found.email, role: found.role }
      setUser(authenticatedUser)
      return { success: true, user: authenticatedUser }
    }
    return { success: false, error: 'Invalid email or password' }
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
