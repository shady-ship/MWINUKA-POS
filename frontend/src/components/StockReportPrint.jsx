import { useApp } from '../context/useApp'
import { stockPack } from '../constants'

export default function StockReportPrint({ products, title, onClose }) {
  const { settings } = useApp()

  const rows = products.map((p, i) => {
    const bd = stockPack(p)
    const st = Number(p.stock) || 0
    const min = p.min_stock || 20
    const status = st === 0 ? 'Out of Stock' : st <= min ? 'Low Stock' : 'In Stock'
    const prices = (p.prices || [])
      .filter(x => x.retail_price != null || x.wholesale_price != null || x.optional_price != null)
      .map(x => {
        const parts = []
        if (x.retail_price != null) parts.push(`R${Number(x.retail_price).toLocaleString()}`)
        if (x.wholesale_price != null) parts.push(`W${Number(x.wholesale_price).toLocaleString()}`)
        if (x.optional_price != null) parts.push(`O${Number(x.optional_price).toLocaleString()}`)
        return `${x.unit} ${parts.join('|') || '—'}`
      })
      .join(' • ') || '—'
    return { i: i + 1, ...p, bd, st, min, status, prices }
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
        <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
          <h3 className="text-sm font-bold text-heading mb-4">Export PDF</h3>
          <p className="text-xs text-muted mb-6">{title} — {rows.length} products will be sent to the printer (choose "Save as PDF")</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => window.print()} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors">Print / PDF</button>
          </div>
        </div>
      </div>

      <div className="print-area">
        <div className="report">
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

          <h2 className="invoice-title">{title.toUpperCase()}</h2>

          <div className="invoice-info">
            <div className="invoice-info-left">
              <p><span className="invoice-label">Generated</span> : {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="invoice-info-right">
              <p><span className="invoice-label">Products</span> : {rows.length}</p>
            </div>
          </div>

          <hr className="invoice-divider" />

          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>PRODUCT</th>
                <th>PRICES (TSh)</th>
                <th>CRTN</th>
                <th>DZN</th>
                <th>PCS</th>
                <th>TOTAL (PCS)</th>
                <th>MIN STOCK</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.i}</td>
                  <td>{r.name}</td>
                  <td>{r.prices}</td>
                  <td>{r.bd.hasCarton ? r.bd.cartons : '—'}</td>
                  <td>{r.bd.hasDozen ? r.bd.dozens : '—'}</td>
                  <td>{r.bd.hasPiece ? r.bd.pieces : '—'}</td>
                  <td>{r.st}</td>
                  <td>{r.min}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="invoice-divider" />

          <div className="invoice-footer">
            {settings.receipt_thankyou_en && <p className="invoice-thankyou-en">{settings.receipt_thankyou_en}</p>}
          </div>
        </div>
      </div>
    </>
  )
}