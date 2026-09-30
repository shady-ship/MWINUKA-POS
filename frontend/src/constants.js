export const ADMIN_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'products', label: 'Products' },
  { key: 'stock', label: 'Stock' },
  { key: 'sales', label: 'Sales' },
  { key: 'orders', label: 'Orders' },
  { key: 'customers', label: 'Customers' },
  { key: 'users', label: 'Staff' },
  { key: 'devices', label: 'Devices' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
  { key: 'audit', label: 'Audit Log' },
]

export const MODULE_LABELS = ADMIN_MODULES.reduce((acc, m) => { acc[m.key] = m.label; return acc }, {})

export const modulesOf = (u) =>
  String(u?.admin_modules || '').split(',').map(s => s.trim()).filter(Boolean)

export const canAccess = (u, key) => u?.role === 'admin' || modulesOf(u).includes(key)

export function packPerCarton(piecesPerCarton, dozensPerCarton, piecesPerDozen = 12) {
  const ppc = Number(piecesPerCarton) || 0
  const dpc = Number(dozensPerCarton) || 0
  if (ppc > 0) return ppc
  if (dpc > 0) return dpc * (Number(piecesPerDozen) || 12)
  return 0
}

export function unitBuyCost(buyPrice, unit, piecesPerCarton, dozensPerCarton, piecesPerDozen = 12) {
  const bp = Number(buyPrice) || 0
  const ppd = Number(piecesPerDozen) || 12
  if (bp <= 0) return 0
  const per = packPerCarton(piecesPerCarton, dozensPerCarton, ppd)
  if (unit === 'Carton') return bp
  if (per > 0) {
    const perPiece = bp / per
    if (unit === 'Dozen') return perPiece * ppd
    return perPiece
  }
  if (unit === 'Dozen') return bp * ppd
  return bp
}

export function piecesForQty(qty, unit, piecesPerCarton, dozensPerCarton, piecesPerDozen = 12) {
  const q = Number(qty) || 0
  if (q <= 0) return 0
  if (unit === 'Dozen') return q * (Number(piecesPerDozen) || 12)
  if (unit === 'Carton') {
    const per = packPerCarton(piecesPerCarton, dozensPerCarton, piecesPerDozen)
    return per > 0 ? q * per : q
  }
  return q
}

export function packBreakdown(stock, piecesPerCarton, dozensPerCarton, piecesPerDozen = 12) {
  const total = Math.max(0, Number(stock) || 0)
  const per = packPerCarton(piecesPerCarton, dozensPerCarton, piecesPerDozen)
  const ppd = Number(piecesPerDozen) || 12
  if (per > 0) {
    const cartons = Math.floor(total / per)
    const rem = total - cartons * per
    const dozens = Math.floor(rem / ppd)
    const pieces = rem % ppd
    return { total, cartons, dozens, pieces, perCarton: per }
  }
  const dozens = Math.floor(total / ppd)
  const pieces = total % ppd
  return { total, cartons: 0, dozens, pieces, perCarton: 0 }
}

export function priceUnits(prices) {
  if (!Array.isArray(prices)) return []
  return prices.filter(p => p.retail_price != null || p.wholesale_price != null || p.optional_price != null).map(p => p.unit)
}

export function stockPack(product) {
  const total = Math.max(0, Number(product?.stock) || 0)
  const ppc = Number(product?.pieces_per_carton) || 0
  const dpc = Number(product?.dozens_per_carton) || 0
  const ppd = Number(product?.pieces_per_dozen) || 12
  const units = priceUnits(product?.prices)
  const rawPer = packPerCarton(ppc, dpc, ppd)
  const hasCarton = rawPer > 0 || units.includes('Carton')
  const perCarton = hasCarton ? (rawPer > 0 ? rawPer : 1) : 0
  const hasDozen = units.includes('Dozen')
  const hasPiece = units.includes('Piece')
  let rem = total
  let cartons = 0
  if (hasCarton) {
    cartons = Math.floor(rem / perCarton)
    rem = rem % perCarton
  }
  let dozens = 0
  if (hasDozen) {
    dozens = Math.floor(rem / ppd)
    rem = rem % ppd
  }
  const pieces = hasPiece ? rem : 0
  return { total, hasCarton, hasDozen, hasPiece, perCarton, perDozen: ppd, cartons, dozens, pieces }
}

export function stockParts(product) {
  const b = stockPack(product)
  const parts = []
  if (b.hasCarton && b.cartons > 0) parts.push(`${b.cartons} crtn`)
  if (b.hasDozen && b.dozens > 0) parts.push(`${b.dozens} dzn`)
  if (b.hasPiece && b.pieces > 0) parts.push(`${b.pieces} pc`)
  if (parts.length === 0) parts.push(`${b.total} pcs`)
  return parts
}

export function formatPackBreakdown(stock, piecesPerCarton, dozensPerCarton, piecesPerDozen = 12) {
  const { total, cartons, dozens, pieces, perCarton } = packBreakdown(stock, piecesPerCarton, dozensPerCarton, piecesPerDozen)
  if (!perCarton && total === 0) return '0 pcs'
  const parts = []
  if (cartons > 0) parts.push(`${cartons} carton${cartons !== 1 ? 's' : ''}`)
  if (dozens > 0) parts.push(`${dozens} dozen${dozens !== 1 ? 's' : ''}`)
  if (pieces > 0 || parts.length === 0) parts.push(`${pieces} pc${pieces !== 1 ? 's' : ''}`)
  return parts.join(' + ')
}