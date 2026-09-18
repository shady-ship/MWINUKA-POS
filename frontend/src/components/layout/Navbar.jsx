import { Search, User, ShoppingCart, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import { useAuth } from '../../context/AuthContext'
import { ADMIN_MODULES, canAccess, modulesOf } from '../../constants'

export default function Navbar({ showNav = true }) {
  const { cart } = useApp()
  const { user, logout } = useAuth()
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const grantedKeys = modulesOf(user)
  const firstGranted = grantedKeys.find(k => ADMIN_MODULES.some(m => m.key === k))
  const homeTo = user?.role === 'admin' ? '/admin' : firstGranted ? `/admin/${firstGranted}` : '/'

  return (
    <header className="bg-primary text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to={homeTo} className="flex items-center gap-2">
          <div className="bg-white rounded-lg p-1.5">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">MWINUKA</h1>
            <p className="text-[10px] text-blue-200">ENTERPRISES CO LTD</p>
          </div>
        </Link>

        <div className="flex-1 max-w-md mx-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-gray-800 bg-white/95 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {cartCount > 0 && (
            <Link to="/orders/new" className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-danger text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </Link>
          )}
          <div className="text-right">
            <p className="text-xs text-blue-200">{user?.role === 'admin' ? 'Admin' : 'Sales Staff'}</p>
            <p className="text-sm font-medium">{user?.name || 'Sales Staff'}</p>
          </div>
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <button onClick={logout} className="text-blue-200 hover:text-white transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showNav && (
        <nav className="bg-primary-dark">
          <div className="max-w-7xl mx-auto px-4 flex gap-1">
            {[
              ...(canAccess(user, 'dashboard') || firstGranted ? [{ label: 'ADMIN PANEL', to: homeTo }] : []),
              { label: 'HOME', to: '/' },
              { label: 'PRODUCTS', to: '/products' },
              { label: 'ORDERS', to: '/orders' },
              { label: 'STOCK CHECK', to: '/stock' },
              { label: 'REPORTS', to: '/reports' },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="px-4 py-2.5 text-xs font-semibold text-blue-100 hover:bg-white/10 transition-colors rounded-t"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
