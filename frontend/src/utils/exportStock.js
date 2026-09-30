export function exportObjectRows(rows, baseName) {
  const header = Object.keys(rows[0] || {})
  const lines = [header.join(',')]
  rows.forEach(r => {
    lines.push(header.map(h => {
      const s = String(r[h] ?? '')
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }).join(','))
  })
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${baseName}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function stockExportRows(products, { stockPack, statusOf, minOf } = {}) {
  return products.map(p => {
    const bd = stockPack ? stockPack(p) : null
    const st = Number(p.stock) || 0
    const min = minOf ? minOf(p) : (p.min_stock || 20)
    const prices = (p.prices || [])
      .filter(x => x.retail_price != null || x.wholesale_price != null || x.optional_price != null)
      .map(x => {
        const parts = []
        if (x.retail_price != null) parts.push(`R${Number(x.retail_price).toLocaleString()}`)
        if (x.wholesale_price != null) parts.push(`W${Number(x.wholesale_price).toLocaleString()}`)
        if (x.optional_price != null) parts.push(`O${Number(x.optional_price).toLocaleString()}`)
        return `${x.unit} ${parts.join('|') || '—'}`
      })
      .join(' | ') || '—'
    return {
      Product: p.name,
      'Prices (TSh)': prices,
      Crtn: bd && bd.hasCarton ? bd.cartons : '',
      Dzn: bd && bd.hasDozen ? bd.dozens : '',
      Pcs: bd && bd.hasPiece ? bd.pieces : '',
      'Total Stock (pcs)': st,
      'Min Stock': min,
      Status: statusOf ? statusOf(p) : st === 0 ? 'Out of Stock' : st <= min ? 'Low Stock' : 'In Stock',
    }
  })
}