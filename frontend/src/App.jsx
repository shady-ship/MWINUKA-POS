import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import OrdersPage from './pages/OrdersPage'
import CreateOrderPage from './pages/CreateOrderPage'
import StockPage from './pages/StockPage'
import ReportsPage from './pages/ReportsPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminStock from './pages/admin/AdminStock'
import AdminSales from './pages/admin/AdminSales'
import AdminOrders from './pages/admin/AdminOrders'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminUsers from './pages/admin/AdminUsers'
import AdminReports from './pages/admin/AdminReports'
import AdminSettings from './pages/admin/AdminSettings'
import AdminAudit from './pages/admin/AdminAudit'
import { ADMIN_MODULES, canAccess, modulesOf } from './constants'

function SalesLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  return children
}

function AdminGate({ module, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (!canAccess(user, module)) {
    const first = modulesOf(user).find(k => ADMIN_MODULES.some(m => m.key === k))
    return <Navigate to={first ? `/admin/${first}` : '/'} replace />
  }
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} /> : <LoginPage />} />

      <Route path="/" element={<ProtectedRoute><SalesLayout><HomePage /></SalesLayout></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><SalesLayout><ProductsPage /></SalesLayout></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><SalesLayout><OrdersPage /></SalesLayout></ProtectedRoute>} />
      <Route path="/orders/new" element={<ProtectedRoute><SalesLayout><CreateOrderPage /></SalesLayout></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute><SalesLayout><StockPage /></SalesLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><SalesLayout><ReportsPage /></SalesLayout></ProtectedRoute>} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminGate module="dashboard"><AdminDashboard /></AdminGate>} />
        <Route path="products" element={<AdminGate module="products"><AdminProducts /></AdminGate>} />
        <Route path="stock" element={<AdminGate module="stock"><AdminStock /></AdminGate>} />
        <Route path="sales" element={<AdminGate module="sales"><AdminSales /></AdminGate>} />
        <Route path="orders" element={<AdminGate module="orders"><AdminOrders /></AdminGate>} />
        <Route path="customers" element={<AdminGate module="customers"><AdminCustomers /></AdminGate>} />
        <Route path="users" element={<AdminGate module="users"><AdminUsers /></AdminGate>} />
        <Route path="reports" element={<AdminGate module="reports"><AdminReports /></AdminGate>} />
        <Route path="settings" element={<AdminGate module="settings"><AdminSettings /></AdminGate>} />
        <Route path="audit" element={<AdminGate module="audit"><AdminAudit /></AdminGate>} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </AuthProvider>
  )
}
