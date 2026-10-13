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

export function packPerCarton(piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  const ppc = Number(piecesPerCarton) || 0
  const dpc = Number(dozensPerCarton) || 0
  const ppd = Number(piecesPerDozen) || 0
  if (ppc > 0) return ppc
  if (dpc > 0) return ppd > 0 ? dpc * ppd : 0
  return 0
}

export const ALL_UNITS = ['Piece', 'HalfDozen', 'Dozen', 'HalfCarton', 'Carton']

const UNIT_CODES = {
  Piece: 'pc',
  HalfDozen: '1/2 dzn',
  Dozen: 'dzn',
  HalfCarton: '1/2 crtn',
  Carton: 'crtn',
}

export const unitCode = (unit) => UNIT_CODES[unit] || 'pc'

export function unitPieces(unit, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  if (unit === 'Piece') return 1
  const ppd = Number(piecesPerDozen) || 0
  const perCarton = packPerCarton(piecesPerCarton, dozensPerCarton, ppd)
  if (unit === 'Dozen') return ppd
  if (unit === 'HalfDozen') return ppd > 0 && ppd % 2 === 0 ? ppd / 2 : 0
  if (unit === 'Carton') return perCarton
  if (unit === 'HalfCarton') return perCarton > 0 && perCarton % 2 === 0 ? perCarton / 2 : 0
  return 0
}

export function unitUnusableReason(unit, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  const ppd = Number(piecesPerDozen) || 0
  const perCarton = packPerCarton(piecesPerCarton, dozensPerCarton, ppd)
  if (unit === 'Dozen' && ppd <= 0) return 'pieces per dozen is not set'
  if (unit === 'HalfDozen' && ppd <= 0) return 'pieces per dozen is not set'
  if (unit === 'HalfDozen' && ppd % 2 !== 0) return `a dozen of ${ppd} pieces cannot be split in half`
  if (unit === 'Carton' && perCarton <= 0) return 'carton size is not set'
  if (unit === 'HalfCarton' && perCarton <= 0) return 'carton size is not set'
  if (unit === 'HalfCarton' && perCarton % 2 !== 0) return `a carton of ${perCarton} pieces cannot be split in half`
  return null
}

export function unitBuyCost(buyPrice, baseUnit, unit, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  const bp = Number(buyPrice) || 0
  if (bp <= 0) return 0
  const perBase = unitPieces(baseUnit, piecesPerCarton, dozensPerCarton, piecesPerDozen)
  const perTarget = unitPieces(unit, piecesPerCarton, dozensPerCarton, piecesPerDozen)
  if (perBase <= 0 || perTarget <= 0) return 0
  return (bp / perBase) * perTarget
}

export function piecesForQty(qty, unit, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  const q = Number(qty) || 0
  if (q <= 0) return 0
  const per = unitPieces(unit, piecesPerCarton, dozensPerCarton, piecesPerDozen)
  return per > 0 ? q * per : 0
}

/**
 * Inverse of piecesForQty: expresses a stored piece count in the given unit.
 * Used when loading a saved product (stock is stored in pieces) so the form shows
 * the quantity in the unit it was entered with, instead of re-multiplying on save.
 * When the unit has no pack size, the value is already pieces and is returned as-is.
 */
export function qtyFromPieces(pieces, unit, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  const n = Number(pieces)
  if (!Number.isFinite(n) || n <= 0) return ''
  const per = unitPieces(unit, piecesPerCarton, dozensPerCarton, piecesPerDozen)
  if (per <= 0) return String(n)
  // Trim float noise but keep exact quotients exact, so save -> load round-trips to the same number.
  return String(Math.round((n / per) * 1e6) / 1e6)
}

export function packBreakdown(stock, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  const total = Math.max(0, Number(stock) || 0)
  const per = packPerCarton(piecesPerCarton, dozensPerCarton, piecesPerDozen)
  const ppd = Number(piecesPerDozen) || 0
  if (per > 0 && ppd > 0) {
    const cartons = Math.floor(total / per)
    const rem = total - cartons * per
    const dozens = Math.floor(rem / ppd)
    const pieces = rem % ppd
    return { total, cartons, dozens, pieces, perCarton: per, perDozen: ppd }
  }
  if (per > 0) {
    const cartons = Math.floor(total / per)
    return { total, cartons, dozens: 0, pieces: total - cartons * per, perCarton: per, perDozen: ppd }
  }
  if (ppd > 0) {
    return { total, cartons: 0, dozens: Math.floor(total / ppd), pieces: total % ppd, perCarton: 0, perDozen: ppd }
  }
  return { total, cartons: 0, dozens: 0, pieces: total, perCarton: 0, perDozen: 0 }
}

export const priceUnits = (prices) => {
  if (!Array.isArray(prices)) return []
  return prices.filter(p => p.retail_price != null || p.wholesale_price != null || p.optional_price != null).map(p => p.unit)
}

export function stockPack(product) {
  const total = Math.max(0, Number(product?.stock) || 0)
  const ppc = Number(product?.pieces_per_carton) || 0
  const dpc = Number(product?.dozens_per_carton) || 0
  const ppd = Number(product?.pieces_per_dozen) || 0
  const units = priceUnits(product?.prices)
  const rawPer = packPerCarton(ppc, dpc, ppd)
  const hasCarton = rawPer > 0 || units.includes('Carton') || units.includes('HalfCarton')
  const perCarton = hasCarton ? (rawPer > 0 ? rawPer : 1) : 0
  const hasDozen = units.includes('Dozen') || units.includes('HalfDozen')
  const hasPiece = units.includes('Piece')
  let rem = total
  let cartons = 0
  if (hasCarton) {
    cartons = Math.floor(rem / perCarton)
    rem = rem % perCarton
  }
  let dozens = 0
  let halfDozens = 0
  if (hasDozen && ppd > 0) {
    const half = ppd % 2 === 0 ? ppd / 2 : 0
    const preferHalf = half > 0 && !units.includes('Dozen') && units.includes('HalfDozen')
    if (preferHalf && rem >= half && rem % ppd !== 0) {
      halfDozens = Math.floor(rem / half)
      rem = rem % half
    } else {
      dozens = Math.floor(rem / ppd)
      rem = rem % ppd
    }
  }
  const pieces = hasPiece || !hasDozen || ppd <= 0 ? rem : 0
  return { total, hasCarton, hasDozen, hasPiece, perCarton, perDozen: ppd, cartons, dozens, halfDozens, pieces }
}

export function stockParts(product) {
  const b = stockPack(product)
  const parts = []
  if (b.hasCarton && b.cartons > 0) parts.push(`${b.cartons} crtn`)
  if (b.halfDozens > 0) parts.push(`${b.halfDozens} x ${unitCode('HalfDozen')}`)
  if (b.hasDozen && b.dozens > 0) parts.push(`${b.dozens} dzn`)
  if (b.hasPiece && b.pieces > 0) parts.push(`${b.pieces} pc`)
  if (parts.length === 0) parts.push(`${b.total} pcs`)
  return parts
}

export function formatPackBreakdown(stock, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  const { total, cartons, dozens, pieces, perCarton } = packBreakdown(stock, piecesPerCarton, dozensPerCarton, piecesPerDozen)
  if (!perCarton && total === 0) return '0 pcs'
  const parts = []
  if (cartons > 0) parts.push(`${cartons} carton${cartons !== 1 ? 's' : ''}`)
  if (dozens > 0) parts.push(`${dozens} dozen${dozens !== 1 ? 's' : ''}`)
  if (pieces > 0 || parts.length === 0) parts.push(`${pieces} pc${pieces !== 1 ? 's' : ''}`)
  return parts.join(' + ')
}

const UNIT_HINTS = [
  { re: /\b(hcrtn|half[\s-]?cartons?)\b/i, unit: 'HalfCarton' },
  { re: /\b(hdzn|half[\s-]?dozens?)\b/i, unit: 'HalfDozen' },
  { re: /\b(crtn|cartons?|ctn)\b/i, unit: 'Carton' },
  { re: /\b(dzns?|dozens?|dzn)\b/i, unit: 'Dozen' },
  { re: /\b(pcs?|pieces?|piece)\b/i, unit: 'Piece' },
]

export const STOCK_UNIT_OPTIONS = [
  { value: 'Piece', short: 'pc', label: 'Pieces (pc)' },
  { value: 'HalfDozen', short: '1/2 dzn', label: '1/2 Dozen' },
  { value: 'Dozen', short: 'dzn', label: 'Dozens (dzn)' },
  { value: 'HalfCarton', short: '1/2 crtn', label: '1/2 Carton' },
  { value: 'Carton', short: 'crtn', label: 'Cartons (crtn)' },
]

export const stockUnitShort = (unit) => unitCode(unit)

export function detectUnitFromName(name) {
  const text = String(name || '')
  if (!text.trim()) return null
  for (const { re, unit } of UNIT_HINTS) {
    if (re.test(text)) return unit
  }
  return null
}

export function packSizeMissing(unit, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  if (unit === 'Carton' || unit === 'HalfCarton') return packPerCarton(piecesPerCarton, dozensPerCarton, piecesPerDozen) <= 0
  return false
}