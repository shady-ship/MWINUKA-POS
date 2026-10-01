import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, ShoppingCart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/useApp'

export default function LoginPage() {
  const { login } = useAuth()
  const { settings } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)
    if (result.success) {
      if (result.user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/')
      }
    } else {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-heading">{(settings.business_name || 'Mwinuka Enterprises').toUpperCase()}</h1>
          <p className="text-muted text-sm mt-1">{settings.tagline || 'Point of Sale System'}</p>
        </div>

        <div className="bg-white rounded-3xl p-7 shadow-xl shadow-black/5 border border-line">
          <h2 className="text-xl font-bold text-heading text-center mb-6">Sign In</h2>

          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-xs rounded-xl p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-heading mb-1.5">Username or Email</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter username or email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface text-sm text-heading placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-heading mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-surface text-sm text-heading placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-md shadow-primary/25"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
