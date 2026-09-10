import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  ClipboardList, Users, BarChart3, Settings, LogOut
} from 'lucide-react'

const links = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Products', to: '/admin/products', icon: Package },
  { label: 'Stock', to: '/admin/stock', icon: Warehouse },
  { label: 'Sales', to: '/admin/sales', icon: ShoppingCart },
  { label: 'Orders', to: '/admin/orders', icon: ClipboardList },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-60 bg-sidebar min-h-screen text-white flex flex-col">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-lg p-1.5">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">MWINUKA</h1>
            <p className="text-[10px] text-blue-200">ENTERPRISES CO LTD</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-white font-medium'
                  : 'text-blue-200 hover:bg-white/10'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
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
