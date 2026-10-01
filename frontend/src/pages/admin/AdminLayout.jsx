import { Outlet, useNavigate, NavLink, useLocation } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import { User, LogOut, LayoutDashboard, Package, ClipboardList, ShoppingCart, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { canAccess } from '../../constants'

const bottomNav = [
  { to: '/admin', label: 'Home', icon: LayoutDashboard, module: 'dashboard', end: true },
  { to: '/admin/products', label: 'Products', icon: Package, module: 'products' },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList, module: 'orders' },
  { to: '/admin/sales', label: 'Sales', icon: ShoppingCart, module: 'sales' },
  { to: '/admin/settings', label: 'Settings', icon: Settings, module: 'settings' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const visibleBottomNav = bottomNav.filter(i => canAccess(user, i.module))
  const activePath = location.pathname
  const currentLabel =
    visibleBottomNav.find(i => activePath === i.to || (i.to !== '/admin' && activePath.startsWith(i.to + '/')))?.label ||
    headerLabel(activePath)

  function headerLabel(path) {
    const map = {
      '/admin': 'Dashboard', '/admin/products': 'Products', '/admin/stock': 'Stock',
      '/admin/sales': 'Sales', '/admin/orders': 'Orders', '/admin/customers': 'Customers',
      '/admin/users': 'Staff', '/admin/devices': 'Devices', '/admin/reports': 'Reports',
      '/admin/audit': 'Audit Log', '/admin/settings': 'Settings',
    }
    return map[path] || 'Admin'
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col pb-16 lg:pb-0">
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-line px-4 lg:px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-heading">{currentLabel}</h1>
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-muted">{user?.role === 'admin' ? 'Admin' : 'Staff'}</p>
              <p className="text-sm font-semibold text-heading">{user?.name || 'Administrator'}</p>
            </div>
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <button onClick={handleLogout} className="text-muted hover:text-danger transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-4">
          <Outlet />
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-line safe-bottom">
        <div className="flex items-stretch">
          {visibleBottomNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium ${
                  isActive ? 'text-primary' : 'text-muted'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}