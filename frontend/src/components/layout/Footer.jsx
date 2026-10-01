import { useApp } from '../../context/useApp'

export default function Footer() {
  const { settings } = useApp()
  const name = settings.business_name || 'Mwinuka Enterprises Co Ltd'
  return (
    <footer className="bg-white border-t border-line mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-bold text-sm mb-3 text-heading">ABOUT US</h3>
          <p className="text-muted text-xs leading-relaxed">
            {name}<br />
            is your trusted store for<br />
            quality products.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-3 text-heading">QUICK LINKS</h3>
          <ul className="space-y-1.5 text-muted text-xs">
            <li><a href="/" className="hover:text-primary">Home</a></li>
            <li><a href="/products" className="hover:text-primary">Products</a></li>
            <li><a href="/stock" className="hover:text-primary">Stock Check</a></li>
            <li><a href="/orders" className="hover:text-primary">Orders</a></li>
            <li><a href="/reports" className="hover:text-primary">Reports</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-3 text-heading">CONTACT US</h3>
          <ul className="space-y-1.5 text-muted text-xs">
            <li>📞 Phone: {settings.phone || '—'}</li>
            <li>✉️ Email: {settings.email || '—'}</li>
            <li>📍 {settings.address || '—'}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted pb-safe">
        © 2025 {name}. All Rights Reserved.
      </div>
    </footer>
  )
}