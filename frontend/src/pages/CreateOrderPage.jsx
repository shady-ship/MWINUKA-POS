import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer } from 'lucide-react'
import { useApp } from '../context/useApp'
import InvoicePrint from '../components/InvoicePrint'

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const { cart, addToCart, updateCartQuantity, updateCartItemUnit, removeFromCart, clearCart, placeOrder, cartTotal, products } = useApp()
  const [customerName, setCustomerName] = useState('')
  const [salesmanName, setSalesmanName] = useState('John Mwinuka')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [orderNotes, setOrderNotes] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [search, setSearch] = useState('')
  const [showProducts, setShowProducts] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [placedItems, setPlacedItems] = useState([])
  const [showPrintModal, setShowPrintModal] = useState(false)

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) return alert('Please enter customer name')
    if (cart.length === 0) return alert('Please add items to the order')
    const itemsForPrint = cart.map(item => ({
      product_name: item.name,
      quantity: item.quantity,
      unit: item.selectedUnit || 'Piece',
      unit_price: item.selectedPrice || item.price,
      total: (Number(item.selectedPrice || item.price) || 0) * (Number(item.quantity) || 0),
    }))
    const result = await placeOrder(customerName, salesmanName, paymentMethod, orderNotes)
    setPlacedOrder(result || {
      order_no: `ORD${String(Date.now()).slice(-6)}`,
      customer_name: customerName,
      salesman_name: salesmanName,
      order_date: new Date().toISOString().split('T')[0],
      total: cartTotal,
      payment_method: paymentMethod,
      status: 'Completed',
    })
    setPlacedItems(itemsForPrint)
    setOrderPlaced(true)
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-center shadow-lg border border-line">
          <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-heading mb-2">Order Placed Successfully!</h2>
          <p className="text-muted text-sm mb-6">Order {placedOrder?.order_no} has been created.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowPrintModal(true)}
              className="bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Invoice
            </button>
            <button
              onClick={() => { setOrderPlaced(false); navigate('/orders') }}
              className="border border-line px-6 py-2.5 rounded-lg text-sm font-semibold text-heading hover:bg-gray-50 transition-colors"
            >
              View Orders
            </button>
          </div>
        </div>
        {showPrintModal && (
          <InvoicePrint
            order={placedOrder}
            items={placedItems}
            onClose={() => { setShowPrintModal(false); setOrderPlaced(false); navigate('/orders') }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-heading mb-6 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-accent" />
          CREATE NEW ORDER
        </h2>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
            <h3 className="text-sm font-bold text-heading mb-4">1. CUSTOMER & SALESMAN INFORMATION</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Customer Name *</label>
                <input
                  type="text"
                  placeholder="Enter customer full name"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Salesman Name *</label>
                <input
                  type="text"
                  value={salesmanName}
                  onChange={e => setSalesmanName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-heading">2. ADD PRODUCTS TO ORDER</h3>
              <button
                onClick={() => setShowProducts(!showProducts)}
                className="bg-accent text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> ADD ITEM
              </button>
            </div>

            {showProducts && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-line">
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => { addToCart(product); setSearch(''); setShowProducts(false) }}
                      className="w-full flex items-center justify-between p-2 rounded hover:bg-white transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-xs font-semibold text-heading">{product.name}</p>
                          <p className="text-[10px] text-muted">{product.stock} in stock • {product.unit || 'Piece'}</p>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-accent">
                        {product.price ? `TSh ${Number(product.price).toLocaleString()} / Pc` : ''}
                        {!product.price && product.price_dozen ? `TSh ${Number(product.price_dozen).toLocaleString()} / Dz` : ''}
                        {!product.price && !product.price_dozen && product.price_carton ? `TSh ${Number(product.price_carton).toLocaleString()} / Ctn` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-line">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted">#</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted">Product</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted">Unit Price (TSh)</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted">Quantity</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted">Unit</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted">Total (TSh)</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={item.id} className="border-b border-line">
                      <td className="px-3 py-3 text-xs text-muted">{index + 1}</td>
                      <td className="px-3 py-3">
                        <span className="text-sm font-semibold text-heading">{item.name}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-heading text-right">{(Number(item.selectedPrice || item.price) || 0).toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <select
                          value={item.selectedUnit || 'Piece'}
                          onChange={e => updateCartItemUnit(item.id, e.target.value)}
                          className="px-2 py-1 rounded border border-line text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="Piece">Piece</option>
                          {item.price_dozen && <option value="Dozen">Dozen</option>}
                          {item.price_carton && <option value="Carton">Carton</option>}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold text-accent text-right">
                        {((Number(item.selectedPrice || item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-danger hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {cart.length === 0 && (
                <div className="py-8 text-center text-muted text-sm">
                  No items in the order. Click "ADD ITEM" to add products.
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                <button
                  onClick={clearCart}
                  className="text-xs text-accent font-semibold hover:underline flex items-center gap-1"
                >
                  ← CONTINUE SHOPPING
                </button>
                <div className="text-right">
                  <p className="text-xs text-muted">TOTAL AMOUNT (TSh)</p>
                  <p className="text-2xl font-bold text-accent">{cartTotal.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
            <h3 className="text-sm font-bold text-heading mb-4">3. PAYMENT & ORDER NOTES</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option>Cash</option>
                  <option>Mobile Money</option>
                  <option>Bank Transfer</option>
                  <option>Credit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Order Date</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">Order Notes (Optional)</label>
              <textarea
                placeholder="Add any notes for this order..."
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => { clearCart(); navigate(-1) }}
              className="px-6 py-2.5 border border-line rounded-lg text-sm font-semibold text-heading hover:bg-gray-50 transition-colors"
            >
              RESET
            </button>
            <button
              onClick={handlePlaceOrder}
              className="bg-success text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              ✓ PLACE ORDER
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
