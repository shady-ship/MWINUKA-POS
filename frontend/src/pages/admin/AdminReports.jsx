import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, ShoppingCart, Package, Download, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useApp } from '../../context/useApp'

const API = 'http://localhost:5000/api'
const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#8b5cf6']

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AdminReports() {
  const { products, ordersList } = useApp()
  const [day, setDay] = useState(todayStr())
  const [dayReport, setDayReport] = useState(null)
  const [loadingDay, setLoadingDay] = useState(false)

  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)
  const totalRevenue = ordersList.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

  const monthlySales = (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    return months.slice(0, now.getMonth() + 1).map((month, i) => ({
      month,
      sales: ordersList.filter(o => {
        if (!o.order_date) return false
        const d = new Date(o.order_date.slice(0, 10))
        return d.getMonth() === i
      }).reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    }))
  })()

  const salesByCategory = (() => {
    const cats = {}
    ordersList.forEach(order => {
      order.items?.forEach(item => {
        const cat = item.category || 'Products'
        if (!cats[cat]) cats[cat] = 0
        cats[cat] += (Number(item.total) || 0)
      })
    })
    return Object.entries(cats).map(([name, value]) => ({ name, value })).slice(0, 5)
  })()

  const fetchDayReport = async () => {
    setLoadingDay(true)
    try {
      const res = await fetch(`${API}/reports/by-date?date=${day}`)
      const data = await res.json()
      setDayReport(data)
    } catch (err) {
      console.error('Failed to load day report:', err)
    } finally {
      setLoadingDay(false)
    }
  }

  useEffect(() => {
    fetchDayReport()
  }, [day])

  const exportCsv = () => {
    if (!dayReport) return
    const dateLabel = day
    const rows = []
    rows.push(['MWINUKA ENTERPRISES CO LTD'])
    rows.push(['FULL SALES REPORT - ' + dateLabel])
    rows.push([])
    rows.push(['Order No', 'Time', 'Salesman', 'Customer', 'Payment', 'Item', 'Qty', 'Price Type', 'Unit Price (TSh)', 'Line Total (TSh)'])
    dayReport.orders.forEach(o => {
      const time = o.created_at ? new Date(o.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
      if (o.items && o.items.length > 0) {
        o.items.forEach(item => {
          rows.push([o.order_no, time, o.salesman_name, o.customer_name, o.payment_method, item.product_name, item.quantity, item.price_type, Number(item.unit_price).toFixed(2) || '0.00', Number(item.total).toFixed(2)])
        })
      } else {
        rows.push([o.order_no, time, o.salesman_name, o.customer_name, o.payment_method, '', '', '', '', Number(o.total).toFixed(2)])
      }
    })
    rows.push([])
    rows.push(['TOTAL ORDERS', dayReport.orders.length])
    rows.push(['TOTAL SALES (TSh)', Number(dayReport.totalSales || 0).toFixed(2)])

    const csv = rows.map(r =>
      r.map(cell => {
        const s = String(cell ?? '')
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }).join(',')
    ).join('\r\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Sales_Report_${dateLabel}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-heading">REPORTS</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-line rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-muted" />
            <input
              type="date"
              value={day}
              onChange={e => setDay(e.target.value)}
              className="text-xs text-heading focus:outline-none"
            />
          </div>
          <button onClick={exportCsv} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
            <Download className="w-3 h-3" /> EXPORT REPORT
          </button>
        </div>
      </div>

      {loadingDay ? (
        <p className="text-xs text-muted mb-4">Loading day report...</p>
      ) : dayReport && (
        <div className="bg-white rounded-xl border border-line p-4 mb-6">
          <p className="text-xs text-muted">
            Sales for <span className="font-bold text-heading">{day}</span>: {' '}
            <span className="font-bold text-accent">TSh {Number(dayReport.totalSales || 0).toLocaleString()}</span>
            {' '}from <span className="font-bold text-heading">{dayReport.orders.length}</span> orders
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Products', value: totalProducts, icon: Package, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Total Stock', value: totalStock, icon: ShoppingCart, color: 'text-success', bg: 'bg-green-100' },
          { label: 'Total Orders', value: ordersList.length, icon: BarChart3, color: 'text-warning', bg: 'bg-yellow-100' },
          { label: 'Total Revenue', value: `TSh ${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-danger', bg: 'bg-red-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-line">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted">{stat.label}</p>
                <p className="text-lg font-bold text-heading">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
          <h3 className="text-sm font-bold text-heading mb-4">MONTHLY SALES</h3>
          {monthlySales.some(m => m.sales > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(value) => [`TSh ${(Number(value) || 0).toLocaleString()}`, 'Sales']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted text-center py-16">No sales data yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
          <h3 className="text-sm font-bold text-heading mb-4">SALES BY CATEGORY</h3>
          {salesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={salesByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {salesByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`TSh ${(Number(value) || 0).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted text-center py-16">No category data yet</p>
          )}
          {salesByCategory.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2">
              {salesByCategory.map((cat, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] text-muted">{cat.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-line overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h3 className="text-sm font-bold text-heading">ORDER HISTORY</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-line">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Order No</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Customer</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Salesman</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted">Date</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-muted">Total (TSh)</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {ordersList.map(order => (
              <tr key={order.id} className="border-b border-line hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-sm font-semibold text-accent">{order.order_no}</td>
                <td className="px-6 py-3 text-sm text-heading">{order.customer_name}</td>
                <td className="px-6 py-3 text-sm text-heading">{order.salesman_name}</td>
                <td className="px-6 py-3 text-sm text-muted">{order.order_date}</td>
                <td className="px-6 py-3 text-sm font-semibold text-heading text-right">TSh {Number(order.total).toLocaleString()}</td>
                <td className="px-6 py-3 text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-success">
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ordersList.length === 0 && (
          <div className="py-12 text-center text-muted text-sm">No orders yet.</div>
        )}
      </div>
    </div>
  )
}