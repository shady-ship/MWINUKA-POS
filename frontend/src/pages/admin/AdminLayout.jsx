import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import { User, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-line px-6 py-3 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-muted">{user?.role === 'admin' ? 'Admin' : 'Staff'}</p>
              <p className="text-sm font-semibold text-heading">{user?.name || 'Administrator'}</p>
            </div>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <button onClick={handleLogout} className="text-muted hover:text-danger transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
