import { useState, useEffect, useRef } from 'react'
import { Search, User, ShoppingCart, LogOut, Menu, X, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/useApp'
import { useAuth } from '../../context/AuthContext'
import { ADMIN_MODULES, canAccess, modulesOf } from '../../constants'

export default function Navbar({ showNav = true }) {
  const { cart, products } = useApp()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [q, setQ] = useState('')
  const menuRef = useRef(null)
  const searchRef = useRef(null)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const grantedKeys = modulesOf(user)
  const firstGranted = grantedKeys.find(k => ADMIN_MODULES.some(m => m.key === k))
  const homeTo = user?.role === 'admin' ? '/admin' : firstGranted ? `/admin/${firstGranted}` : '/'

  const results = q.trim().length > 0
    ? products
        .filter(p => p.active !== 0 && p.name.toLowerCase().includes(q.trim().toLowerCase()))
        .slice(0, 8)
    : []

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setQ('')
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const adminItems = ADMIN_MODULES
    .filter(m => canAccess(user, m.key))
    .map(m => ({ label: m.label, to: m.key === 'dashboard' ? '/admin' : `/admin/${m.key}` }))
  const salesItems = [
    { label: 'HOME', to: '/' },
    { label: 'PRODUCTS', to: '/products' },
    { label: 'ORDERS', to: '/orders' },
    { label: 'STOCK CHECK', to: '/stock' },
    { label: 'REPORTS', to: '/reports' },
  ]

  const close = () => setMenuOpen(false)

  return (
    <header className="bg-white/85 backdrop-blur-md sticky top-0 z-50 border-b border-line">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {showNav && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors ${
                menuOpen ? 'bg-accent text-white' : 'bg-surface text-heading hover:bg-line'
              }`}
              title="Menu"
            >
              {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span className="hidden sm:inline">MENU</span>
            </button>

            {menuOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-black/10 border border-line overflow-hidden z-50">
                <nav className="max-h-[70vh] overflow-y-auto no-scrollbar">
                  {adminItems.length > 0 && (
                    <div>
                      <p className="px-4 pt-4 pb-1 text-[10px] font-semibold text-muted uppercase tracking-wider">Admin</p>
                      {adminItems.map(item => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={close}
                          className="flex items-center justify-between px-4 py-2.5 text-sm text-heading hover:bg-surface"
                        >
                          {item.label}
                          <ChevronRight className="w-4 h-4 text-muted" />
                        </Link>
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="px-4 pt-4 pb-1 text-[10px] font-semibold text-muted uppercase tracking-wider">Sales</p>
                    {salesItems.map(item => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={close}
                        className="block px-4 py-2.5 text-sm text-heading hover:bg-surface"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </nav>
              </div>
            )}
          </div>
        )}

        <Link to={homeTo} className="flex items-center gap-2 shrink-0 mr-auto">
          <div className="bg-primary rounded-xl p-1.5">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-sm leading-tight text-heading">MWINUKA</h1>
            <p className="text-[10px] text-muted">ENTERPRISES CO LTD</p>
          </div>
        </Link>

        <div className="relative flex-1 min-w-0 max-w-md mx-2 md:mx-4" ref={searchRef}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 rounded-full text-sm text-heading bg-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent transition"
            />
          </div>
          {q.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl shadow-black/10 border border-line overflow-hidden z-50">
              {results.length > 0 ? (
                <nav className="max-h-80 overflow-y-auto no-scrollbar">
                  {results.map(p => {
                    const price = p.prices?.find(x => x.retail_price != null)?.retail_price
                    return (
                      <Link
                        key={p.id}
                        to={`/products?q=${encodeURIComponent(p.name)}`}
                        onClick={() => setQ('')}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-heading hover:bg-surface"
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="text-xs text-muted shrink-0">
                          {price != null ? `TSh ${Number(price).toLocaleString()} · ` : ''}{p.stock} in stock
                        </span>
                      </Link>
                    )
                  })}
                </nav>
              ) : (
                <div className="px-4 py-3 text-xs text-muted">No products found</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {cartCount > 0 && (
            <Link to="/orders/new" className="relative">
              <ShoppingCart className="w-5 h-5 text-heading" />
              <span className="absolute -top-2 -right-2 bg-danger text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            </Link>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-muted">{user?.role === 'admin' ? 'Admin' : 'Sales Staff'}</p>
            <p className="text-sm font-medium text-heading">{user?.name || 'Sales Staff'}</p>
          </div>
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <button onClick={logout} className="text-muted hover:text-danger transition-colors" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}