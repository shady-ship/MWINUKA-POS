import { createPortal } from 'react-dom'
import { useApp } from '../context/useApp'
import { unitCode } from '../constants'

const money = (n) => Number(n || 0).toLocaleString()

function invoiceQuantity(quantity, unit) {
  if (unit !== 'HalfDozen' && unit !== 'HalfCarton') {
    return { quantity: String(quantity), unit: unitCode(unit) }
  }

  const halfPacks = Number(quantity) || 0
  const wholePacks = Math.floor(halfPacks / 2)
  const hasHalfPack = halfPacks % 2 !== 0
  const amount = hasHalfPack
    ? wholePacks > 0 ? `${wholePacks} 1/2` : '1/2'
    : String(wholePacks)

  return { quantity: amount, unit: unit === 'HalfDozen' ? 'dzn' : 'crtn' }
}

export default function InvoicePrint({ order, items, onClose }) {
  const { settings } = useApp()

  const now = new Date()
  const orderDate = order?.order_date || now.toISOString().slice(0, 10)
  const orderTime = order?.order_time || now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const cur = (settings.currency || 'TSh').toUpperCase()

  const lineTotal = (i) => Number(i.total != null ? i.total : (Number(i.unit_price || 0) * Number(i.quantity || 0)))
  const subtotal = items.reduce((sum, i) => sum + lineTotal(i), 0)
  const total = Number(order.total) || subtotal
  const discount = subtotal - total

  const contact = [settings.address, settings.phone ? `Tel: ${settings.phone}` : null, settings.email].filter(Boolean)

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
        <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
          <h3 className="text-sm font-bold text-heading mb-1">Print Receipt</h3>
          <p className="text-xs text-muted mb-6">Invoice {order.order_no}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => window.print()} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors">Print</button>
          </div>
        </div>
      </div>

      {createPortal(
        <div className="print-area">
          <article className="invoice">
            <header className="inv-head">
              <h1 className="inv-shop">{settings.business_name || 'MWINUKA ENTERPRISES CO. LTD'}</h1>
              {settings.tagline && <p className="inv-tagline">{settings.tagline}</p>}
              {contact.map(line => <p key={line} className="inv-contact">{line}</p>)}
            </header>

            <div className="inv-docbar">
              <span className="inv-docbar-title">INVOICE</span>
              <span className="inv-docbar-no">{order.order_no}</span>
            </div>

            <dl className="inv-meta">
              <div className="inv-meta-row"><dt>Date</dt><dd>{orderDate}</dd></div>
              <div className="inv-meta-row"><dt>Time</dt><dd>{orderTime}</dd></div>
              <div className="inv-meta-row"><dt>Served by</dt><dd>{order.salesman_name || '—'}</dd></div>
              <div className="inv-meta-row"><dt>Customer</dt><dd>{order.customer_name || 'Walk-in'}</dd></div>
              <div className="inv-meta-row"><dt>Payment</dt><dd>{order.payment_method || 'Cash'}</dd></div>
            </dl>

            <div className="inv-items-head" aria-hidden="true">
              <span className="inv-c-desc">ITEM</span>
              <span className="inv-c-qty">QTY</span>
              <span className="inv-c-price">PRICE</span>
              <span className="inv-c-total">AMOUNT</span>
            </div>

            <table className="inv-items">
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="inv-item">
                    <td className="inv-c-desc">{item.product_name}</td>
                    <td className="inv-c-qty">
                      <span className="inv-qty-num">{invoiceQuantity(item.quantity, item.unit).quantity}</span>
                      <span className="inv-qty-unit">{invoiceQuantity(item.quantity, item.unit).unit}</span>
                    </td>
                    <td className="inv-c-price">{money(item.unit_price)}</td>
                    <td className="inv-c-total">{money(lineTotal(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="inv-totals">
              <div className="inv-total-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              {discount > 0 && <div className="inv-total-row inv-total-disc"><span>Discount</span><span>−{money(discount)}</span></div>}
              <div className="inv-total-row inv-total-grand">
                <span>Total</span>
                <span>{cur} {money(total)}</span>
              </div>
            </div>

            <footer className="inv-foot">
              {settings.receipt_thankyou_en && <p className="inv-foot-thanks">{settings.receipt_thankyou_en}</p>}
              {settings.receipt_thankyou && <p className="inv-foot-thanks-alt">{settings.receipt_thankyou}</p>}
            </footer>
          </article>
        </div>,
        document.body
      )}
    </>
  )
}