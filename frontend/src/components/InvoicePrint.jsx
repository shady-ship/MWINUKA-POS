import { ShoppingCart } from 'lucide-react'

export default function InvoicePrint({ order, items, onClose }) {
  const handlePrint = () => {
    window.print()
  }

  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const subtotal = items.reduce((sum, item) => sum + (Number(item.unit_price) || 0) * item.quantity, 0)
  const total = Number(order.total) || 0
  const discount = subtotal - total

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
            <h1 className="invoice-company">MWINUKA ENTERPRISES CO LTD</h1>
            <p className="invoice-tagline">Quality Products, Better Life</p>
            <p className="invoice-address">Dar es Salaam, Tanzania</p>
            <p className="invoice-phone">Tel: 0712 345 678</p>
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
                <th className="right">PRICE<br/>(TSH)</th>
                <th className="right">TOTAL<br/>(TSH)</th>
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
            <p className="invoice-thankyou">Asante sana na karibu tena!</p>
            <p className="invoice-thankyou-en">Thank you very much and welcome again!</p>
            <p className="invoice-smile">:)</p>
          </div>
        </div>
      </div>
    </>
  )
}
