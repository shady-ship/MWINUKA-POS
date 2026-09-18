export const ADMIN_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'products', label: 'Products' },
  { key: 'stock', label: 'Stock' },
  { key: 'sales', label: 'Sales' },
  { key: 'orders', label: 'Orders' },
  { key: 'customers', label: 'Customers' },
  { key: 'users', label: 'Staff' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
  { key: 'audit', label: 'Audit Log' },
]

export const MODULE_LABELS = ADMIN_MODULES.reduce((acc, m) => { acc[m.key] = m.label; return acc }, {})

export const modulesOf = (u) =>
  String(u?.admin_modules || '').split(',').map(s => s.trim()).filter(Boolean)

export const canAccess = (u, key) => u?.role === 'admin' || modulesOf(u).includes(key)

export function packPerCarton(piecesPerCarton, dozensPerCarton) {
  const ppc = Number(piecesPerCarton) || 0
  const dpc = Number(dozensPerCarton) || 0
  if (ppc > 0) return ppc
  if (dpc > 0) return dpc * 12
  return 0
}

export function piecesForQty(qty, unit, piecesPerCarton, dozensPerCarton) {
  const q = Number(qty) || 0
  if (q <= 0) return 0
  if (unit === 'Dozen') return q * 12
  if (unit === 'Carton') {
    const per = packPerCarton(piecesPerCarton, dozensPerCarton)
    return per > 0 ? q * per : q
  }
  return q
}

export function packBreakdown(stock, piecesPerCarton, dozensPerCarton) {
  const total = Math.max(0, Number(stock) || 0)
  const per = packPerCarton(piecesPerCarton, dozensPerCarton)
  if (per > 0) {
    const cartons = Math.floor(total / per)
    const rem = total - cartons * per
    const dozens = Math.floor(rem / 12)
    const pieces = rem % 12
    return { total, cartons, dozens, pieces, perCarton: per }
  }
  const dozens = Math.floor(total / 12)
  const pieces = total % 12
  return { total, cartons: 0, dozens, pieces, perCarton: 0 }
}

export function formatPackBreakdown(stock, piecesPerCarton, dozensPerCarton) {
  const { total, cartons, dozens, pieces, perCarton } = packBreakdown(stock, piecesPerCarton, dozensPerCarton)
  if (!perCarton && total === 0) return '0 pcs'
  const parts = []
  if (cartons > 0) parts.push(`${cartons} carton${cartons !== 1 ? 's' : ''}`)
  if (dozens > 0) parts.push(`${dozens} dozen${dozens !== 1 ? 's' : ''}`)
  if (pieces > 0 || parts.length === 0) parts.push(`${pieces} pc${pieces !== 1 ? 's' : ''}`)
  return parts.join(' + ')
}