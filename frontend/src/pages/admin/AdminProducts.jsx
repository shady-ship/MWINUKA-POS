import { useState } from 'react'
import { Plus, Search, Edit, Trash2, X, Power, Copy } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { piecesForQty, packPerCarton, formatPackBreakdown, stockParts, unitBuyCost, detectUnitFromName, stockUnitShort, STOCK_UNIT_OPTIONS, packSizeMissing, unitUnusableReason } from '../../constants'

const UNIT_ROWS = ['Piece', 'HalfDozen', 'Dozen', 'HalfCarton', 'Carton']

const emptyPrices = () => UNIT_ROWS.map(unit => ({
  enabled: unit === 'Piece',
  unit,
  retail: '',
  wholesale: '',
  optional: '',
}))

export default function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct, toggleProductActive } = useApp()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', altName: '', category: '', stock: '', min_stock: '', buyPrice: '', piecesPerCarton: '', dozensPerCarton: '', piecesPerDozen: '', prices: emptyPrices() })
  const [editId, setEditId] = useState(null)
  const [countedIn, setCountedIn] = useState('Piece')
  const [unitTouched, setUnitTouched] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
    || (p.alt_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const onNameChange = (value) => {
    const detected = detectUnitFromName(value)
    setForm(prev => ({ ...prev, name: value }))
    if (detected && !unitTouched) setCountedIn(detected)
  }

  const packArgs = [form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen]
  const stockPieces = piecesForQty(Number(form.stock || 0), countedIn, ...packArgs)
  const minStockPieces = piecesForQty(Number(form.min_stock || 0), countedIn, ...packArgs)
  const cartonUnset = packSizeMissing(countedIn, form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen)
  const dozenCount = Number(form.piecesPerDozen) || 0
  const dozenUsed = countedIn === 'Dozen' || countedIn === 'HalfDozen'
    || form.dozensPerCarton !== ''
    || form.prices.some(p => p.enabled && (p.unit === 'Dozen' || p.unit === 'HalfDozen'))
  const dozenNeeded = dozenUsed && dozenCount <= 0

  const buyCostFor = (unit) => Number(form.buyPrice) > 0
    ? unitBuyCost(form.buyPrice, countedIn, unit, form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen)
    : 0

  const costBlockedBecause = (unit) => {
    if (Number(form.buyPrice) <= 0) return 'enter the Buy Price above'
    const reason = unitUnusableReason(unit, form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen)
    if (reason) return reason.includes('dozen') ? 'set Pieces per Dozen below' : reason.includes('carton') ? 'set the carton size below' : reason
    const baseReason = unitUnusableReason(countedIn, form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen)
    if (baseReason) return baseReason.includes('dozen') ? 'set Pieces per Dozen below' : 'set the carton size below'
    return null
  }

  const openAdd = () => {
    setForm({ name: '', altName: '', category: '', stock: '', min_stock: '', buyPrice: '', piecesPerCarton: '', dozensPerCarton: '', piecesPerDozen: '', prices: emptyPrices() })
    setEditId(null)
    setCountedIn('Piece')
    setUnitTouched(false)
    setError('')
    setModal('add')
  }

  const openEdit = (p) => {
    const formPrices = emptyPrices().map(f => {
      const found = (p.prices || []).find(x => x.unit === f.unit)
      if (!found) return { ...f, enabled: false }
      return {
        enabled: true,
        unit: found.unit,
        retail: found.retail_price != null ? String(found.retail_price) : '',
        wholesale: found.wholesale_price != null ? String(found.wholesale_price) : '',
        optional: found.optional_price != null ? String(found.optional_price) : '',
      }
    })
    setForm({
      name: p.name,
      altName: p.alt_name || '',
      category: p.category || '',
      stock: String(p.stock ?? ''),
      min_stock: String(p.min_stock ?? 20),
      buyPrice: String(p.buy_price ?? 0),
      piecesPerCarton: String(p.pieces_per_carton ?? ''),
      dozensPerCarton: String(p.dozens_per_carton ?? ''),
      piecesPerDozen: String(p.pieces_per_dozen ?? ''),
      prices: formPrices,
    })
    setEditId(p.id)
    setCountedIn(STOCK_UNIT_OPTIONS.some(o => o.value === p.buy_price_unit) ? p.buy_price_unit : 'Piece')
    setUnitTouched(true)
    setError('')
    setModal('edit')
  }

  const setPrice = (idx, field, val) => {
    setForm(prev => ({
      ...prev,
      prices: prev.prices.map((p, i) => i === idx ? { ...p, [field]: val } : p)
    }))
  }

  const buildData = () => {
    const prices = form.prices
      .filter(p => p.enabled && (Number(p.retail) > 0 || Number(p.wholesale) > 0 || Number(p.optional) > 0))
      .map(p => ({
        unit: p.unit,
        retail_price: Number(p.retail) || null,
        wholesale_price: Number(p.wholesale) || null,
        optional_price: Number(p.optional) || null,
      }))
    return {
      name: form.name,
      alt_name: form.altName.trim() || null,
      category: form.category || null,
      stock: piecesForQty(Number(form.stock || 0), countedIn, form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen),
      min_stock: piecesForQty(Number(form.min_stock || 0), countedIn, form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen) || 20,
      buy_price: Number(form.buyPrice || 0),
      buy_price_unit: countedIn,
      pieces_per_carton: Number(form.piecesPerCarton) || null,
      dozens_per_carton: Number(form.dozensPerCarton) || null,
      pieces_per_dozen: Number(form.piecesPerDozen) > 0 ? Number(form.piecesPerDozen) : null,
      prices,
    }
  }

  const save = async () => {
    if (!form.name.trim()) { setError('Product name is required'); return }
    if ((countedIn === 'Carton' || countedIn === 'HalfCarton') && packPerCarton(form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen) === 0) {
      setError('You selected Cartons for stock but no carton size is set. Enter "Pieces per Carton" or "Dozens per Carton" below, or switch the stock unit to pc/dzn.'); return
    }
    if (dozenNeeded) {
      setError('Pieces per Dozen is empty. This product is counted or sold by the dozen, so you must enter how many pieces are in one dozen (there is no default).'); return
    }
    if (form.prices.every(p => !p.enabled || (!Number(p.retail) && !Number(p.wholesale) && !Number(p.optional)))) {
      setError('Enable at least one unit and set at least one price'); return
    }
    const bp = Number(form.buyPrice || 0)
    if (bp > 0) {
      const labelOf = { retail: 'Retail', wholesale: 'Wholesale', optional: 'Optional' }
      for (const p of form.prices) {
        if (!p.enabled) continue
        const cost = unitBuyCost(bp, countedIn, p.unit, form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen)
        for (const f of ['retail', 'wholesale', 'optional']) {
          const val = Number(p[f]) || 0
          if (val > 0 && cost > 0 && val <= cost) {
            const packHint = packPerCarton(form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen) === 0 && p.unit !== 'Piece'
              ? ' (Set Pieces/Dozens per Carton above so the per-carton cost can be worked out.)'
              : ''
            setError(`${labelOf[f]} price for ${p.unit} (TSh ${val.toLocaleString()}) must be greater than the buy price for that unit (TSh ${cost.toLocaleString()})${packHint}`)
            return
          }
        }
      }
    }
    setSaving(true)
    setError('')
    try {
      const data = buildData()
      if (modal === 'add') {
        await addProduct(data)
      } else {
        await updateProduct(editId, data)
      }
      setModal(null)
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const cloneProduct = (p) => {
    addProduct({
      name: `${p.name} (Copy)`,
      alt_name: p.alt_name || null,
      category: p.category,
      stock: Number(p.stock) || 0,
      min_stock: Number(p.min_stock) || 20,
      buy_price: Number(p.buy_price) || 0,
      buy_price_unit: p.buy_price_unit || 'Piece',
      pieces_per_carton: p.pieces_per_carton || null,
      dozens_per_carton: p.dozens_per_carton || null,
      pieces_per_dozen: p.pieces_per_dozen || null,
      prices: (p.prices || []).map(x => ({ unit: x.unit, retail_price: x.retail_price, wholesale_price: x.wholesale_price, optional_price: x.optional_price })),
    })
  }

  const pricesSummary = (prices) =>
    prices?.length > 0
      ? prices.map(x => {
          const parts = []
          if (x.retail_price != null) parts.push(`R ${Number(x.retail_price).toLocaleString()}`)
          if (x.wholesale_price != null) parts.push(`W ${Number(x.wholesale_price).toLocaleString()}`)
          if (x.optional_price != null) parts.push(`O ${Number(x.optional_price).toLocaleString()}`)
          return `${x.unit}: ${parts.join(' | ')}`
        }).join('  •  ')
      : <span className="text-muted">No prices</span>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-heading">PRODUCTS</h2>
        <button onClick={openAdd} className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-dark transition-colors flex items-center gap-1">
          <Plus className="w-3 h-3" /> ADD PRODUCT
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-line p-6">
        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border border-line bg-white focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-line">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Product</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Buy Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Prices (R=Retail, W=Wholesale, O=Optional)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, index) => {
                return (
                <tr key={product.id} className={`border-b border-line hover:bg-gray-50 transition-colors ${product.active === 0 ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-xs text-muted">{index + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-heading">{product.name}</span>
                    {product.alt_name && <div className="text-[10px] text-muted">Alt: {product.alt_name}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-heading text-right">TSh {(Number(product.buy_price) || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-heading whitespace-pre-line">{pricesSummary(product.prices)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-heading text-right">
                    <div className="text-sm text-heading">{stockParts(product).join(' · ') || `${product.stock} pcs`}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.active === 0 ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-danger">Disabled</span>
                    ) : product.stock === 0 ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-danger">Out</span>
                    ) : product.stock <= (product.min_stock || 20) ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-danger">Low</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-success">OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(product)} className="text-accent hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => cloneProduct(product)} className="text-accent hover:text-primary transition-colors" title="Clone product"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => toggleProductActive(product.id, product.active === 0 ? 1 : 0)} className={`${product.active === 0 ? 'text-warning' : 'text-success'}`} title={product.active === 0 ? 'Enable' : 'Disable'}><Power className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(product.id)} className="text-danger hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted text-sm">No products yet. Click "ADD PRODUCT" to add one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-heading">{modal === 'add' ? 'ADD NEW PRODUCT' : 'EDIT PRODUCT'}</h3>
              <button onClick={() => setModal(null)} className="text-muted hover:text-heading"><X className="w-4 h-4" /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-danger text-xs rounded-lg p-3 mb-3">{error}</div>}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Product Name *</label>
                  <input value={form.name} onChange={e => onNameChange(e.target.value)} placeholder="e.g. niceone 400g"
                    className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  {detectUnitFromName(form.name) && (
                    <p className="text-[10px] text-accent mt-0.5">Detected &ldquo;{stockUnitShort(detectUnitFromName(form.name))}&rdquo; in the name — counted as that below.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Alternative Name (Optional)</label>
                  <input value={form.altName} onChange={e => setForm({ ...form, altName: e.target.value })} placeholder="e.g. KMK, niceone, kibanio"
                    className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  <p className="text-[10px] text-muted mt-0.5">Short name a salesman can print on the receipt instead of the full name.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Category (Optional)</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Detergent"
                    className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-heading mb-1">How is this product counted? *</label>
                    <div className="flex flex-wrap gap-2">
                      {STOCK_UNIT_OPTIONS.map(o => {
                        const active = countedIn === o.value
                        const blocked = active ? unitUnusableReason(o.value, form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen) : null
                        return (
                          <button type="button" key={o.value} onClick={() => { setCountedIn(o.value); setUnitTouched(true) }}
                            className={`flex-1 min-w-[92px] px-3 py-2 rounded-lg border text-left transition-colors ${active ? 'border-primary bg-primary text-white' : 'border-line bg-white hover:border-primary'}`}>
                            <span className="block text-xs font-bold">{o.short}</span>
                            <span className={`block text-[10px] ${active ? 'text-white/80' : 'text-muted'}`}>{o.label.replace(/\s*\(.*\)/, '')}</span>
                            {blocked && active && <span className="block text-[10px] text-white/90">needs pack size</span>}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-muted mt-1">
                      Stock and Min Stock are entered in <span className="font-semibold text-heading">{stockUnitShort(countedIn)}</span> and converted to pieces automatically.
                    </p>
                  </div>
                </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Stock ({stockUnitShort(countedIn)}) *</label>
                  <input value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} type="number" min="0" placeholder="0"
                    className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  {Number(form.stock || 0) > 0 && (
                    <p className={`text-[10px] mt-0.5 ${cartonUnset ? 'text-danger font-semibold' : 'text-muted'}`}>
                      {cartonUnset
                        ? `No carton size set — ${form.stock} crtn would be saved as ${form.stock} pc. Enter Pieces per Carton below.`
                        : `= ${stockPieces.toLocaleString()} pc (${formatPackBreakdown(stockPieces, ...packArgs)})`}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Min Stock ({stockUnitShort(countedIn)}) *</label>
                  <input value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} type="number" min="0" placeholder="20"
                    className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  {Number(form.min_stock || 0) > 0 && (
                    <p className="text-[10px] text-muted mt-0.5">
                      = warns at {minStockPieces.toLocaleString()} pc
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-heading mb-1">Buy Price per {stockUnitShort(countedIn)} (TSh) *</label>
                  <input value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} type="number" min="0" placeholder="0"
                    className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  {cartonUnset && Number(form.buyPrice) > 0 ? (
                    <p className="text-[10px] text-danger font-semibold mt-0.5">You counted this product by Carton but no pack size is set. Enter Pieces per Carton or Dozens per Carton below so the cost per piece can be worked out.</p>
                  ) : Number(form.buyPrice) > 0 ? (
                    <p className="text-[10px] text-muted mt-0.5">
                      TSh {Number(form.buyPrice).toLocaleString()} buys one {stockUnitShort(countedIn)} → Buy costs: {form.prices.filter(p => p.enabled).map(p => `${p.unit} TSh ${unitBuyCost(form.buyPrice, countedIn, p.unit, form.piecesPerCarton, form.dozensPerCarton, form.piecesPerDozen).toLocaleString()}`).join(' • ')} — selling prices must be above each.
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-heading mb-2">PACK SIZE (Optional)</p>
                <p className="text-[10px] text-muted mb-2">How the product is sealed. Enables the pack-split button on the order screen.</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-heading mb-1">Pieces per Carton</label>
                    <input value={form.piecesPerCarton} onChange={e => setForm({ ...form, piecesPerCarton: e.target.value })} type="number" min="0" placeholder="e.g. 24"
                      className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    <p className="text-[10px] text-muted mt-0.5">If sealed as, e.g. 24 pieces in a carton</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-heading mb-1">Dozens per Carton</label>
                    <input value={form.dozensPerCarton} onChange={e => setForm({ ...form, dozensPerCarton: e.target.value })} type="number" min="0" placeholder="e.g. 12"
                      className="w-full px-4 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    <p className="text-[10px] text-muted mt-0.5">How many dozens are in one carton</p>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${dozenNeeded ? 'text-danger' : 'text-heading'}`}>Pieces per Dozen</label>
                    <input value={form.piecesPerDozen} onChange={e => setForm({ ...form, piecesPerDozen: e.target.value })} type="number" min="0" placeholder="e.g. 12"
                      className={`w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${dozenNeeded ? 'border-danger focus:ring-danger' : 'border-line focus:ring-accent'}`} />
                    <p className={`text-[10px] mt-0.5 ${dozenNeeded ? 'text-danger font-semibold' : 'text-muted'}`}>
                      {dozenNeeded
                        ? 'Required — no default is assumed. Enter how many pieces are in one dozen for this product.'
                        : 'How many pieces are in one dozen. No default — leave empty only if this product is never sold by the dozen.'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-heading mb-2">PRICES PER UNIT (Retail, Wholesale & Optional)</p>
                <p className="text-[10px] text-muted mb-3">Each selling price must be greater than the Buy cost for that unit. Only ticked units are saved.</p>
                <div className="space-y-2">
                  {form.prices.map((row, idx) => (
                    <div
                      key={row.unit}
                      className={`flex items-center gap-2 rounded-lg p-2 flex-wrap transition-colors ${row.enabled ? 'bg-gray-50 border border-line' : 'bg-gray-100 border border-dashed border-line opacity-60'}`}
                    >
                      <label className="flex items-center gap-2 w-32 cursor-pointer" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={row.enabled} onChange={e => setPrice(idx, 'enabled', e.target.checked)} className="accent-primary" />
                        <span className={`text-xs font-semibold ${row.enabled ? 'text-heading' : 'text-muted line-through'}`}>{row.unit}</span>
                        {!row.enabled && <span className="text-[9px] font-bold text-muted bg-white px-1.5 py-0.5 rounded-full border border-line">OFF</span>}
                      </label>
                      {row.enabled ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              <label className="text-[10px] font-bold text-success">R</label>
                              <input value={row.retail} onChange={e => setPrice(idx, 'retail', e.target.value)} type="number" min="0" placeholder="Retail"
                                className={`w-24 px-2 py-1.5 rounded border text-xs focus:outline-none focus:ring-2 focus:ring-accent ${(() => { const c = Number(form.buyPrice) > 0 ? buyCostFor(row.unit) : 0; return Number(row.retail) > 0 && c > 0 && Number(row.retail) <= c ? 'border-red-400 bg-red-50' : 'border-line' })()}`}
                                onClick={e => e.stopPropagation()} />
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="text-[10px] font-bold text-warning">W</label>
                              <input value={row.wholesale} onChange={e => setPrice(idx, 'wholesale', e.target.value)} type="number" min="0" placeholder="Wholesale"
                                className={`w-24 px-2 py-1.5 rounded border text-xs focus:outline-none focus:ring-2 focus:ring-accent ${(() => { const c = Number(form.buyPrice) > 0 ? buyCostFor(row.unit) : 0; return Number(row.wholesale) > 0 && c > 0 && Number(row.wholesale) <= c ? 'border-red-400 bg-red-50' : 'border-line' })()}`}
                                onClick={e => e.stopPropagation()} />
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="text-[10px] font-bold text-danger">O</label>
                              <input value={row.optional} onChange={e => setPrice(idx, 'optional', e.target.value)} type="number" min="0" placeholder="Optional"
                                className={`w-24 px-2 py-1.5 rounded border text-xs focus:outline-none focus:ring-2 focus:ring-accent ${(() => { const c = Number(form.buyPrice) > 0 ? buyCostFor(row.unit) : 0; return Number(row.optional) > 0 && c > 0 && Number(row.optional) <= c ? 'border-red-400 bg-red-50' : 'border-line' })()}`}
                                onClick={e => e.stopPropagation()} />
                            </div>
                          </div>
                          {Number(form.buyPrice) > 0 && (
                            costBlockedBecause(row.unit)
                              ? <span className="text-[10px] text-warning font-semibold">Buy cost for {row.unit}: — {costBlockedBecause(row.unit)}</span>
                              : <span className="text-[10px] text-muted">Buy cost for {row.unit}: TSh {buyCostFor(row.unit).toLocaleString()}</span>
                          )}
                          {(['retail', 'wholesale', 'optional'].some(f => { const c = buyCostFor(row.unit); return Number(row[f]) > 0 && c > 0 && Number(row[f]) <= c }) && (
                            <span className="text-danger font-bold text-[10px]">Must be {'>'} buy price (TSh {buyCostFor(row.unit).toLocaleString()})!</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted">Tick the checkbox to enable this unit</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-primary text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : modal === 'add' ? 'Add Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><Trash2 className="w-6 h-6 text-danger" /></div>
            <h3 className="text-sm font-bold text-heading mb-1">Delete Product?</h3>
            <p className="text-xs text-muted mb-6">This will permanently remove this product and its prices.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-line rounded-lg py-2.5 text-xs font-semibold text-heading hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => { deleteProduct(deleteId); setDeleteId(null) }} className="flex-1 bg-danger text-white rounded-lg py-2.5 text-xs font-semibold hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}