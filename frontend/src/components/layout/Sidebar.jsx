import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  ClipboardList, Users, UserPlus, BarChart3, Settings, LogOut,
  Store, ShoppingBag, FileText, Boxes
} from 'lucide-react'
import { useApp } from '../../context/useApp'

const links = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Stock', to: '/admin/stock', icon: Warehouse },
  { label: 'Sales', to: '/admin/sales', icon: ShoppingCart },
  { label: 'Orders', to: '/admin/orders', icon: ClipboardList },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  { label: 'Staff', to: '/admin/users', icon: UserPlus },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
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
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-accent text-white font-medium'
            : 'text-blue-200 hover:bg-white/10'
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
  const name = settings.business_name || 'Mwinuka Enterprises Co Ltd'
  const shortName = name.length > 14 ? name.split(' ').slice(0, 2).join(' ') : name
  return (
    <aside className="w-60 bg-sidebar min-h-screen text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-lg p-1.5">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">{shortName.toUpperCase()}</h1>
            <p className="text-[10px] text-blue-200">{settings.tagline || 'Enterprise'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map(renderLink)}

        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-blue-300/60 uppercase tracking-wider">
          Sales Staff Modules
        </p>
        {staffLinks.map(renderLink)}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-200 hover:bg-white/10 w-full transition-colors">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}