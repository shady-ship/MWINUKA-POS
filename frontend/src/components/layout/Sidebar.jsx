import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  ClipboardList, Users, UserPlus, BarChart3, Settings, LogOut,
  Store, ShoppingBag, FileText, Boxes, History, MonitorSmartphone
} from 'lucide-react'
import { useApp } from '../../context/useApp'
import { useAuth } from '../../context/AuthContext'
import { canAccess } from '../../constants'

const links = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, module: 'dashboard', end: true },
  { label: 'Products', to: '/admin/products', icon: Package, module: 'products' },
  { label: 'Stock', to: '/admin/stock', icon: Warehouse, module: 'stock' },
  { label: 'Sales', to: '/admin/sales', icon: ShoppingCart, module: 'sales' },
  { label: 'Orders', to: '/admin/orders', icon: ClipboardList, module: 'orders' },
  { label: 'Customers', to: '/admin/customers', icon: Users, module: 'customers' },
  { label: 'Staff', to: '/admin/users', icon: UserPlus, module: 'users' },
  { label: 'Devices', to: '/admin/devices', icon: MonitorSmartphone, module: 'devices' },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3, module: 'reports' },
  { label: 'Audit Log', to: '/admin/audit', icon: History, module: 'audit' },
  { label: 'Settings', to: '/admin/settings', icon: Settings, module: 'settings' },
]

const staffLinks = [
  { label: 'Sales Dashboard', to: '/', icon: Boxes, end: true },
  { label: 'New Order', to: '/orders/new', icon: ShoppingBag },
  { label: 'Products', to: '/products', icon: Package },
  { label: 'Orders', to: '/orders', icon: ClipboardList },
  { label: 'Stock Check', to: '/stock', icon: Warehouse },
  { label: 'Reports', to: '/reports', icon: FileText },
]

function renderLink({ label, to, icon: Icon, end }) {
  return (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
          isActive
            ? 'bg-accent/10 text-primary font-semibold'
            : 'text-heading/70 hover:bg-surface'
        }`
      }
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const { settings } = useApp()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const visibleLinks = links.filter(l => canAccess(user, l.module))
  const name = settings.business_name || 'Mwinuka Enterprises Co Ltd'
  const shortName = name.length > 14 ? name.split(' ').slice(0, 2).join(' ') : name

  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  return (
    <aside className="hidden lg:flex w-60 bg-sidebar min-h-screen flex-col border-r border-line">
      <div className="p-4 border-b border-line">
        <div className="flex items-center gap-2.5">
          <div className="bg-accent/10 rounded-xl p-1.5">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-heading">{shortName.toUpperCase()}</h1>
            <p className="text-[10px] text-muted">{settings.tagline || 'Enterprise'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleLinks.map(renderLink)}

        {isAdmin && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-muted uppercase tracking-wider">
              Sales Staff Modules
            </p>
            {staffLinks.map(renderLink)}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-line">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-danger hover:bg-surface w-full transition-colors">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}