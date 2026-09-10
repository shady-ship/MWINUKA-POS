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
import AdminReports from './pages/admin/AdminReports'
import AdminSettings from './pages/admin/AdminSettings'

function SalesLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}

function ProtectedRoute({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (role && user.role !== role) return <Navigate to="/" />
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

      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="stock" element={<AdminStock />} />
        <Route path="sales" element={<AdminSales />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
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
