import { ShoppingCart } from 'lucide-react'
import { useApp } from '../context/useApp'

export default function InvoicePrint({ order, items, onClose }) {
  const { settings } = useApp()
  const handlePrint = () => {
    window.print()
  }

  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const subtotal = items.reduce((sum, item) => sum + (Number(item.unit_price) || 0) * item.quantity, 0)
  const total = Number(order.total) || 0
  const discount = subtotal - total
  const cur = (settings.currency || 'TSh').toUpperCase()

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
        <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
          <h3 className="text-sm font-bold text-heading mb-4">Print Invoice</h3>
          <p className="text-xs text-muted mb-6">Order {order.order_no} will be sent to printer</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handlePrint} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors">Print</button>
          </div>
        </div>
      </div>

      <div className="print-area">
        <div className="invoice">
          <div className="invoice-header">
            <div className="invoice-logo">
              <ShoppingCart size={28} />
            </div>
            <h1 className="invoice-company">{(settings.business_name || 'Mwinuka Enterprises Co Ltd').toUpperCase()}</h1>
            {settings.tagline && <p className="invoice-tagline">{settings.tagline}</p>}
            {settings.address && <p className="invoice-address">{settings.address}</p>}
            {settings.phone && <p className="invoice-phone">Tel: {settings.phone}</p>}
            {settings.email && <p className="invoice-phone">Email: {settings.email}</p>}
          </div>

          <hr className="invoice-divider" />

          <h2 className="invoice-title">ORDER INVOICE</h2>

          <div className="invoice-info">
            <div className="invoice-info-left">
              <p><span className="invoice-label">Invoice No</span> : <strong>{order.order_no}</strong></p>
              <p><span className="invoice-label">Date</span> : {order.order_date}</p>
              <p><span className="invoice-label">Time</span> : {time}</p>
            </div>
            <div className="invoice-info-right">
              <p><span className="invoice-label">Payment</span> : {order.payment_method || 'Cash'}</p>
              <p><span className="invoice-label">Status</span> : {order.status}</p>
            </div>
          </div>

          <hr className="invoice-divider" />

          <div className="invoice-customer">
            <p><span className="invoice-label">Customer</span> : {order.customer_name}</p>
            <p><span className="invoice-label">Salesman</span> : {order.salesman_name}</p>
          </div>

          <hr className="invoice-divider" />

          <table className="invoice-table">
            <thead>
              <tr>
                <th>S/N</th>
                <th>ITEM NAME</th>
                <th>QTY</th>
                <th>UNIT</th>
                <th className="right">PRICE<br/>({cur})</th>
                <th className="right">TOTAL<br/>({cur})</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{item.product_name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit === 'Dozen' ? 'Dzs' : item.unit === 'Carton' ? 'Ctns' : 'Pcs'}</td>
                  <td className="right">{Number(item.unit_price).toLocaleString()}</td>
                  <td className="right">{Number(item.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="invoice-divider" />

          <div className="invoice-totals">
            <div className="invoice-total-row">
              <span>SUBTOTAL</span>
              <span>{subtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="invoice-total-row">
                <span>DISCOUNT</span>
                <span>{discount.toLocaleString()}</span>
              </div>
            )}
            <hr className="invoice-divider-sm" />
            <div className="invoice-total-row invoice-grand-total">
              <span>TOTAL AMOUNT</span>
              <span>{total.toLocaleString()}</span>
            </div>
            <div className="invoice-total-row">
              <span>PAID AMOUNT</span>
              <span>{total.toLocaleString()}</span>
            </div>
            <div className="invoice-total-row">
              <span>BALANCE</span>
              <span>0</span>
            </div>
          </div>

          <hr className="invoice-divider" />

          <div className="invoice-footer">
            {settings.receipt_thankyou && <p className="invoice-thankyou">{settings.receipt_thankyou}</p>}
            {settings.receipt_thankyou_en && <p className="invoice-thankyou-en">{settings.receipt_thankyou_en}</p>}
            <p className="invoice-smile">:)</p>
          </div>
        </div>
      </div>
    </>
  )
}
