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
  const paid = order.paid_total != null && order.paid_total !== undefined ? Number(order.paid_total) : total
  const balance = Math.max(0, total - paid)
  const cur = (settings.currency || 'TSh').toUpperCase()

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
        <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
          <h3 className="text-sm font-bold text-heading mb-4">Print Copy</h3>
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
              <svg viewBox="0 0 512 512" width="34" height="34">
                <defs>
                  <linearGradient id="lgBg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#11406f"/>
                    <stop offset="0.55" stopColor="#0b2c50"/>
                    <stop offset="1" stopColor="#071a33"/>
                  </linearGradient>
                  <linearGradient id="lgGold" x1="0" y1="0" x2="0.2" y2="1">
                    <stop offset="0" stopColor="#f3d98d"/>
                    <stop offset="0.5" stopColor="#d9b458"/>
                    <stop offset="1" stopColor="#b08a2e"/>
                  </linearGradient>
                </defs>
                <rect x="10" y="10" width="492" height="492" rx="108" fill="url(#lgBg)" stroke="#c8a03c" strokeWidth="4"/>
                <circle cx="256" cy="212" r="52" fill="url(#lgGold)" opacity="0.92"/>
                <rect x="120" y="300" width="72" height="112" rx="10" fill="url(#lgGold)"/>
                <rect x="220" y="238" width="72" height="174" rx="10" fill="url(#lgGold)"/>
                <rect x="320" y="176" width="72" height="236" rx="10" fill="url(#lgGold)"/>
                <rect x="120" y="426" width="272" height="10" rx="5" fill="url(#lgGold)"/>
              </svg>
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
              <span>{paid.toLocaleString()}</span>
            </div>
            <div className={`invoice-total-row${balance > 0 ? ' invoice-balance-owes' : ''}`}>
              <span>BALANCE</span>
              <span>{balance.toLocaleString()}</span>
            </div>
          </div>

          <hr className="invoice-divider" />

          <p className="invoice-items-summary">Items: {items.length} &nbsp;•&nbsp; Total Qty: {items.reduce((s, i) => s + Number(i.quantity || 0), 0)}</p>

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