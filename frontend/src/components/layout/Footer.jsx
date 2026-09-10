export default function Footer() {
  return (
    <footer className="bg-primary-dark text-white">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-bold text-sm mb-3">ABOUT US</h3>
          <p className="text-blue-200 text-xs leading-relaxed">
            Mwinuka Enterprises Co Ltd<br />
            is your trusted store for<br />
            quality products.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-3">QUICK LINKS</h3>
          <ul className="space-y-1.5 text-blue-200 text-xs">
            <li><a href="/" className="hover:text-white">Home</a></li>
            <li><a href="/products" className="hover:text-white">Products</a></li>
            <li><a href="/stock" className="hover:text-white">Stock Check</a></li>
            <li><a href="/orders" className="hover:text-white">Orders</a></li>
            <li><a href="/reports" className="hover:text-white">Reports</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-3">CONTACT US</h3>
          <ul className="space-y-1.5 text-blue-200 text-xs">
            <li>📞 Phone: 0712 345 678</li>
            <li>✉️ Email: info@mwinuka.co.tz</li>
            <li>📍 Dar es Salaam, Tanzania</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-blue-300">
        © 2025 Mwinuka Enterprises Co Ltd. All Rights Reserved.
      </div>
    </footer>
  )
}
