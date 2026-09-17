import { useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, Package } from 'lucide-react'
import { useApp } from '../context/useApp'
import { useAuth } from '../context/AuthContext'
import InvoicePrint from '../components/InvoicePrint'

export default function CreateOrderPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cart, addToCart, addPackSplit, updateCartQuantity, updateCartItemUnit, updateCartPriceType, updateCartPrice, removeFromCart, clearCart, placeOrder, cartTotal, products, usersList, getAvailableTypes } = useApp()
  const [customerName, setCustomerName] = useState('')
  const [salesmanId, setSalesmanId] = useState(user?.id || '')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [orderNotes, setOrderNotes] = useState('')
  const [search, setSearch] = useState('')
  const [showProducts, setShowProducts] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [placedItems, setPlacedItems] = useState([])
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [optionalWarnings, setOptionalWarnings] = useState({})
  const [splitOpen, setSplitOpen] = useState({})
  const [splitValues, setSplitValues] = useState({})

  const isAdmin = user?.role === 'admin'
  const staffList = usersList.filter(u => u.role !== 'admin' && u.active !== 0)
  const selectedSalesman = usersList.find(u => Number(u.id) === Number(salesmanId))

  const filteredProducts = products.filter(p =>
    p.active !== 0 && p.name.toLowerCase().includes(search.toLowerCase())
  )

  const checkOptionalPrice = (lineId, item, newPrice) => {
    const buyPrice = Number(item.buy_price) || 0
    const val = Number(newPrice) || 0
    if (val > 0 && buyPrice > 0 && val <= buyPrice) {
      setOptionalWarnings(prev => ({ ...prev, [lineId]: `Must be > TSh ${buyPrice.toLocaleString()} (buy price)` }))
    } else {
      setOptionalWarnings(prev => { const next = { ...prev }; delete next[lineId]; return next })
    }
  }

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) return alert('Please enter customer name')
    if (cart.length === 0) return alert('Please add items to the order')
    for (const item of cart) {
      if (item.selectedPriceType === 'Optional' && Number(item.buy_price) > 0 && Number(item.selectedPrice) <= Number(item.buy_price)) {
        return alert(`Optional price for ${item.name} must be greater than the buy price (TSh ${Number(item.buy_price).toLocaleString()})`)
      }
    }
    const salesman = usersList.find(u => Number(u.id) === Number(salesmanId))
    const itemsForPrint = cart.map(item => ({
      product_name: item.name,
      quantity: item.quantity,
      unit: item.selectedUnit,
      price_type: item.selectedPriceType,
      unit_price: item.selectedPrice || 0,
      total: (Number(item.selectedPrice) || 0) * (Number(item.quantity) || 0),
    }))
    const result = await placeOrder(customerName, salesmanId, paymentMethod, orderNotes)
    setPlacedOrder({
      ...(result || {}),
      order_no: result?.order_no || `ORD${String(Date.now()).slice(-6)}`,
      customer_name: customerName,
      salesman_name: salesman?.name || user?.name || 'Unknown',
      order_date: result?.order_date || new Date().toISOString().split('T')[0],
      total: result?.total || cartTotal,
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
            <button onClick={() => setShowPrintModal(true)} className="bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print Invoice
            </button>
            <button onClick={() => { setOrderPlaced(false); navigate('/orders') }} className="border border-line px-6 py-2.5 rounded-lg text-sm font-semibold text-heading hover:bg-gray-50 transition-colors">
              View Orders
            </button>
          </div>
        </div>
        {showPrintModal && <InvoicePrint order={placedOrder} items={placedItems} onClose={() => { setShowPrintModal(false); setOrderPlaced(false); navigate('/orders') }} />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-heading mb-6 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-accent" /> CREATE NEW ORDER
        </h2>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
            <h3 className="text-sm font-bold text-heading mb-4">1. CUSTOMER & SALESMAN INFORMATION</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Customer Name *</label>
                <input type="text" placeholder="Enter customer full name" value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Salesman *</label>
                {isAdmin ? (
                  <select value={salesmanId} onChange={e => setSalesmanId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                    <option value="">Select salesman...</option>
                    {staffList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                ) : (
                  <input type="text" readOnly value={user?.name || ''} className="w-full px-4 py-2.5 rounded-lg border border-line text-sm bg-gray-50 text-heading font-semibold" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-line">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-heading">2. ADD PRODUCTS TO ORDER</h3>
              <button onClick={() => setShowProducts(!showProducts)} className="bg-accent text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1">
                <Plus className="w-3 h-3" /> ADD ITEM
              </button>
            </div>

            {showProducts && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-line">
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredProducts.filter(p => p.prices?.length > 0).map(product => (
                    <button key={product.id}
                      onClick={() => { addToCart(product); setSearch(''); setShowProducts(false) }}
                      className="w-full flex items-center justify-between p-2 rounded hover:bg-white transition-colors text-left">
                      <div>
                        <p className="text-xs font-semibold text-heading">{product.name}</p>
                        <p className="text-[10px] text-muted">
                          {product.prices?.map(x => {
                            const parts = []
                            if (x.retail_price != null) parts.push(`R ${Number(x.retail_price).toLocaleString()}`)
                            if (x.wholesale_price != null) parts.push(`W ${Number(x.wholesale_price).toLocaleString()}`)
                            if (x.optional_price != null) parts.push(`O ${Number(x.optional_price).toLocaleString()}`)
                            return `${x.unit}: ${parts.join(' | ')}`
                          }).join(' • ')}
                        </p>
                        <p className="text-[10px] text-muted">{product.stock} in stock</p>
                      </div>
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
                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted">Unit</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted">Type</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted">Unit Price</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted">Quantity</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted">Line Total</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => {
                    const isOptional = item.selectedPriceType === 'Optional'
                    const ppc = item.pieces_per_carton
                    const dpc = item.dozens_per_carton
                    const hasSplit = (ppc && ppc > 0) || (dpc && dpc > 0)
                    const sv = splitValues[item.lineId] || {}
                    const looseUnit = ppc > 0 ? 'Piece' : 'Dozen'
                    const loosePerCarton = looseUnit === 'Piece' ? ppc : dpc
                    const splitTotal = (sv.totalQty || 0)
                    const splitCartons = loosePerCarton > 0 ? Math.floor(splitTotal / loosePerCarton) : 0
                    const splitLoose = loosePerCarton > 0 ? splitTotal % loosePerCarton : 0
                    const splitType = item.selectedPriceType || 'Retail'
                    const cp = (item.prices || []).find(p => p.unit === 'Carton')
                    const lp = (item.prices || []).find(p => p.unit === looseUnit)
                    const splitPrice = (cp ? Number(cp[splitType === 'Retail' ? 'retail_price' : splitType === 'Wholesale' ? 'wholesale_price' : 'optional_price']) || 0 : 0)
                    const loosePrice = (lp ? Number(lp[splitType === 'Retail' ? 'retail_price' : splitType === 'Wholesale' ? 'wholesale_price' : 'optional_price']) || 0 : 0)
                    const splitTotalPrice = splitCartons * splitPrice + splitLoose * loosePrice
                    const splitDisabled = splitTotal < 1 || splitPrice < 1 || (splitLoose > 0 && loosePrice < 1)

                    return (
                      <Fragment key={item.lineId}>
                        <tr className="border-b border-line">
                          <td className="px-3 py-3 text-xs text-muted">{index + 1}</td>
                          <td className="px-3 py-3">
                            <p className="text-sm font-semibold text-heading">{item.name}</p>
                            {item.buy_price > 0 && <p className="text-[10px] text-muted">Buy: TSh {Number(item.buy_price).toLocaleString()}</p>}
                            {hasSplit && <p className="text-[10px] text-accent font-medium">{ppc > 0 ? `${ppc} pcs/carton` : `${dpc} dzs/carton`}</p>}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <select value={item.selectedUnit} onChange={e => updateCartItemUnit(item.lineId, e.target.value)}
                              className="px-2 py-1 rounded border border-line text-xs focus:outline-none focus:ring-1 focus:ring-accent">
                              {(item.prices || []).filter(p => p.retail_price != null || p.wholesale_price != null || p.optional_price != null).map(p => <option key={p.unit} value={p.unit}>{p.unit}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <select value={item.selectedPriceType} onChange={e => updateCartPriceType(item.lineId, e.target.value)}
                              className="px-2 py-1 rounded border border-line text-xs focus:outline-none focus:ring-1 focus:ring-accent">
                              {getAvailableTypes(item.prices, item.selectedUnit).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isOptional ? (
                              <div className="flex flex-col items-end">
                                <input type="number" min={Number(item.buy_price) + 1 || 1} value={item.manualOverride ?? ''} placeholder={(item.prices?.find(p => p.unit === item.selectedUnit)?.optional_price ?? 0).toLocaleString()}
                                  onChange={e => { updateCartPrice(item.lineId, e.target.value); checkOptionalPrice(item.lineId, item, e.target.value) }}
                                  className="w-28 px-2 py-1 rounded border border-red-200 text-xs text-right focus:outline-none focus:ring-2 focus:ring-accent" />
                                {optionalWarnings[item.lineId] && <span className="text-[9px] text-danger mt-0.5">{optionalWarnings[item.lineId]}</span>}
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-heading">TSh {Number(item.selectedPrice).toLocaleString()}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => updateCartQuantity(item.lineId, item.quantity - 1)} className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                              <button onClick={() => updateCartQuantity(item.lineId, item.quantity + 1)} className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200 transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-accent text-right">
                            TSh {((Number(item.selectedPrice) || 0) * (Number(item.quantity) || 0)).toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {hasSplit && (
                                <button onClick={() => setSplitOpen(prev => ({ ...prev, [item.lineId]: !prev[item.lineId] }))}
                                  className={`p-1 rounded transition-colors ${splitOpen[item.lineId] ? 'bg-accent text-white' : 'text-accent hover:bg-accent/10'}`}
                                  title={`Pack split (${ppc > 0 ? ppc + ' pcs' : dpc + ' dzs'} per carton)`}>
                                  <Package className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => removeFromCart(item.lineId)} className="text-danger hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                        {hasSplit && splitOpen[item.lineId] && (
                          <tr key={`${item.lineId}-split`} className="bg-blue-50/60 border-b border-line">
                            <td colSpan={8} className="px-4 py-3">
                              <div className="flex flex-col gap-2 max-w-xl">
                                <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-semibold text-muted mb-0.5">
                                      Total {looseUnit === 'Piece' ? 'Pieces' : 'Dozens'} needed ({loosePerCarton} {looseUnit === 'Piece' ? 'pcs' : 'dzs'} = 1 carton)
                                    </label>
                                    <input type="number" min={0} placeholder="0"
                                      value={sv.totalQty ?? ''}
                                      onChange={e => setSplitValues(prev => ({ ...prev, [item.lineId]: { ...prev[item.lineId], totalQty: Math.max(0, Math.floor(Number(e.target.value) || 0)) } }))}
                                      className="w-32 px-2 py-1 rounded border border-line text-xs focus:outline-none focus:ring-1 focus:ring-accent" />
                                  </div>
                                  <div className="text-xs text-muted leading-relaxed">
                                    {splitTotal > 0 && <p>= <span className="font-semibold text-heading">{splitCartons} carton{splitCartons !== 1 ? 's' : ''}</span>{splitLoose > 0 ? <> + <span className="font-semibold text-heading">{splitLoose} {looseUnit === 'Piece' ? 'pc' : 'dz'}</span></> : null}</p>}
                                    {splitTotalPrice > 0 && <p className="text-accent font-semibold">TSh {splitTotalPrice.toLocaleString()}</p>}
                                  </div>
                                </div>
                                <button disabled={splitDisabled}
                                  onClick={() => {
                                    if (splitDisabled) return
                                    addPackSplit(item, splitCartons, splitLoose, splitLoose > 0 ? looseUnit : null, splitType)
                                    setSplitValues(prev => ({ ...prev, [item.lineId]: {} }))
                                    setSplitOpen(prev => ({ ...prev, [item.lineId]: false }))
                                  }}
                                  className="self-start bg-accent text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                                  <Package className="w-3 h-3" /> Add {looseUnit === 'Piece' ? 'Pieces' : 'Dozens'} to Order
                                </button>
                                {splitPrice < 1 && <p className="text-[10px] text-danger">Carton {splitType} price not set for this product</p>}
                                {splitLoose > 0 && loosePrice < 1 && <p className="text-[10px] text-danger">{looseUnit} {splitType} price not set — cannot add loose {looseUnit === 'Piece' ? 'pieces' : 'dozens'}</p>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
              {cart.length === 0 && (
                <div className="py-8 text-center text-muted text-sm">No items in the order. Click "ADD ITEM" to add products.</div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                <button onClick={clearCart} className="text-xs text-accent font-semibold hover:underline flex items-center gap-1">← CONTINUE SHOPPING</button>
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
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option>Cash</option>
                  <option>Mobile Money</option>
                  <option>Bank Transfer</option>
                  <option>Credit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-heading mb-1">Order Date</label>
                <input type="date" value={new Date().toISOString().split('T')[0]} readOnly
                  className="w-full px-4 py-2.5 rounded-lg border border-line text-sm bg-gray-50 text-heading" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">Order Notes (Optional)</label>
              <textarea placeholder="Add any notes for this order..." value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => { clearCart(); navigate(-1) }} className="px-6 py-2.5 border border-line rounded-lg text-sm font-semibold text-heading hover:bg-gray-50 transition-colors">RESET</button>
            <button onClick={handlePlaceOrder}
              disabled={!customerName.trim() || cart.length === 0 || (isAdmin && !salesmanId)}
              className="bg-success text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              ✓ PLACE ORDER
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}