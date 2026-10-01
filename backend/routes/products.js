import { Router } from 'express'
import { query, execute, queryOne } from '../config/db.js'
import { logAudit } from '../config/audit.js'
import { adminOnly } from '../middleware/auth.js'

const router = Router()

const UNITS = ['Piece', 'HalfDozen', 'Dozen', 'HalfCarton', 'Carton']
const PRICE_COLS = ['retail_price', 'wholesale_price', 'optional_price']

function unitPieces(unit, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  if (unit === 'Piece') return 1
  const ppd = Number(piecesPerDozen) || 0
  const ppc = Number(piecesPerCarton) || 0
  const dpc = Number(dozensPerCarton) || 0
  const perCarton = ppc > 0 ? ppc : dpc > 0 && ppd > 0 ? dpc * ppd : 0
  if (unit === 'Dozen') return ppd
  if (unit === 'HalfDozen') return ppd > 0 && ppd % 2 === 0 ? ppd / 2 : 0
  if (unit === 'Carton') return perCarton
  if (unit === 'HalfCarton') return perCarton > 0 && perCarton % 2 === 0 ? perCarton / 2 : 0
  return 0
}

function unitUnusableReason(unit, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  const ppd = Number(piecesPerDozen) || 0
  const ppc = Number(piecesPerCarton) || 0
  const dpc = Number(dozensPerCarton) || 0
  const perCarton = ppc > 0 ? ppc : dpc > 0 && ppd > 0 ? dpc * ppd : 0
  if (unit === 'Dozen' && ppd <= 0) return 'pieces per dozen is not set'
  if (unit === 'HalfDozen' && ppd <= 0) return 'pieces per dozen is not set'
  if (unit === 'HalfDozen' && ppd % 2 !== 0) return `a dozen of ${ppd} pieces cannot be split in half`
  if (unit === 'Carton' && perCarton <= 0) return 'carton size is not set'
  if (unit === 'HalfCarton' && perCarton <= 0) return 'carton size is not set'
  if (unit === 'HalfCarton' && perCarton % 2 !== 0) return `a carton of ${perCarton} pieces cannot be split in half`
  return null
}

async function attachPrices(rows) {
  if (rows.length === 0) return rows
  const ids = rows.map(p => p.id)
  const placeholders = ids.map(() => '?').join(',')
  const priceRows = await query(
    `SELECT product_id, unit, retail_price, wholesale_price, optional_price FROM product_prices WHERE product_id IN (${placeholders}) ORDER BY FIELD(unit, 'Piece', 'HalfDozen', 'Dozen', 'HalfCarton', 'Carton')`,
    ids
  )
  const byProduct = {}
  priceRows.forEach(row => {
    if (!byProduct[row.product_id]) byProduct[row.product_id] = []
    byProduct[row.product_id].push({
      unit: row.unit,
      retail_price: row.retail_price != null ? Number(row.retail_price) : null,
      wholesale_price: row.wholesale_price != null ? Number(row.wholesale_price) : null,
      optional_price: row.optional_price != null ? Number(row.optional_price) : null,
    })
  })
  return rows.map(p => {
    const prices = byProduct[p.id] || []
    const first = prices.find(x => x.unit === 'Piece') || prices[0] || null
    return {
      ...p,
      prices,
      defaultUnit: first?.unit || null,
      defaultPriceType: first?.retail_price != null ? 'Retail' : first?.wholesale_price != null ? 'Wholesale' : 'Optional',
      defaultPrice: first?.retail_price ?? first?.wholesale_price ?? first?.optional_price ?? 0,
    }
  })
}

function unitBuyCost(bp, baseUnit, unit, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  if (bp <= 0) return 0
  const perBase = unitPieces(baseUnit, piecesPerCarton, dozensPerCarton, piecesPerDozen)
  const perTarget = unitPieces(unit, piecesPerCarton, dozensPerCarton, piecesPerDozen)
  if (perBase <= 0 || perTarget <= 0) return 0
  return (bp / perBase) * perTarget
}

function validatePrices(prices, buyPrice, buyPriceUnit, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  const bp = Number(buyPrice) || 0
  const list = Array.isArray(prices) ? prices : []
  const base = UNITS.includes(buyPriceUnit) ? buyPriceUnit : 'Piece'
  const ppd = Number(piecesPerDozen) || 0
  const perCarton = (Number(piecesPerCarton) || 0) || ((Number(dozensPerCarton) || 0) > 0 && ppd > 0 ? (Number(dozensPerCarton) || 0) * ppd : 0)
  if (bp > 0 && base === 'Carton' && perCarton <= 0) {
    return { error: 'Buy Price is set per Carton but no pack size is set. Enter Pieces per Carton or Dozens per Carton.' }
  }
  if (bp > 0 && base === 'HalfCarton' && perCarton <= 0) {
    return { error: 'Buy Price is set per Half Carton but no pack size is set. Enter Pieces per Carton or Dozens per Carton.' }
  }
  if (bp > 0 && base === 'Dozen' && ppd <= 0) {
    return { error: 'Buy Price is set per Dozen but Pieces per Dozen is not set. Enter how many pieces are in one dozen for this product.' }
  }
  if (bp > 0 && base === 'HalfDozen' && ppd <= 0) {
    return { error: 'Buy Price is set per Half Dozen but Pieces per Dozen is not set. Enter how many pieces are in one dozen for this product.' }
  }
  for (const p of list) {
    if (!UNITS.includes(p.unit)) return { error: `Invalid unit: ${p.unit}` }
    const unusable = unitUnusableReason(p.unit, piecesPerCarton, dozensPerCarton, piecesPerDozen)
    if (unusable) {
      return { error: `${p.unit} cannot be sold for this product because ${unusable}. Enter the pack specification below, or untick that unit.` }
    }
    const cost = unitBuyCost(bp, base, p.unit, piecesPerCarton, dozensPerCarton, piecesPerDozen)
    for (const col of PRICE_COLS) {
      const val = Number(p[col]) || 0
      if (val > 0 && cost > 0 && val <= cost) {
        const label = col === 'retail_price' ? 'Retail' : col === 'wholesale_price' ? 'Wholesale' : 'Optional'
        return { error: `${label} price for ${p.unit} (TSh ${val.toLocaleString()}) must be greater than the buy price for that unit (TSh ${cost.toLocaleString()})` }
      }
    }
  }
  return { list }
}

function normalizePack(value) {
  const n = Math.floor(Number(value))
  return isFinite(n) && n > 0 ? n : null
}

function normalizeDozen(value) {
  return normalizePack(value)
}

function normalizePrices(input) {
  if (!Array.isArray(input)) return []
  return input
    .filter(p => p && UNITS.includes(p.unit))
    .map(p => ({
      unit: p.unit,
      retail_price: Number(p.retail_price) || null,
      wholesale_price: Number(p.wholesale_price) || null,
      optional_price: Number(p.optional_price) || null,
    }))
    .filter(p => p.retail_price != null || p.wholesale_price != null || p.optional_price != null)
}

router.get('/', async (req, res) => {
  try {
    const { category, search, includeInactive } = req.query
    let sql = 'SELECT * FROM products WHERE 1=1'
    const params = []
    if (category) { sql += ' AND category = ?'; params.push(category) }
    if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`) }
    if (includeInactive !== 'true') { sql += ' AND active = 1' }
    sql += ' ORDER BY name'
    const rows = await query(sql, params)
    res.json(await attachPrices(rows))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Product not found' })
    res.json((await attachPrices([row]))[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

async function savePrices(productId, prices) {
  await execute('DELETE FROM product_prices WHERE product_id = ?', [productId])
  for (const p of prices) {
    await execute(
      'INSERT INTO product_prices (product_id, unit, retail_price, wholesale_price, optional_price) VALUES (?, ?, ?, ?, ?)',
      [productId, p.unit, p.retail_price, p.wholesale_price, p.optional_price]
    )
  }
}

router.post('/', adminOnly, async (req, res) => {
  try {
    const { name, category, stock, min_stock, unit, active, buy_price, buy_price_unit, prices, pieces_per_carton, dozens_per_carton, pieces_per_dozen, alt_name } = req.body
    if (!name) return res.status(400).json({ error: 'Product name is required' })

    const bp = Number(buy_price || 0) || 0
    const normPrices = prices ? normalizePrices(!Array.isArray(prices) ? [prices] : prices) : []
    const ppc = normalizePack(pieces_per_carton)
    const dpc = normalizePack(dozens_per_carton)
    const ppd = normalizeDozen(pieces_per_dozen)
    const check = validatePrices(normPrices, bp, buy_price_unit, ppc, dpc, ppd)
    if (check.error) return res.status(400).json({ error: check.error })

    const result = await execute(
      'INSERT INTO products (name, alt_name, category, stock, min_stock, unit, active, buy_price, buy_price_unit, pieces_per_carton, dozens_per_carton, pieces_per_dozen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, alt_name || null, category || null, stock || 0, min_stock || 20, unit || null, active === undefined ? 1 : (active ? 1 : 0), bp, UNITS.includes(buy_price_unit) ? buy_price_unit : 'Piece', ppc, dpc, ppd]
    )

    if (normPrices.length > 0) await savePrices(result.insertId, normPrices)
    const product = await queryOne('SELECT * FROM products WHERE id = ?', [result.insertId])
    await logAudit(req, 'product.add', `Added product ${name}`)
    res.status(201).json((await attachPrices([product]))[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { name, category, stock, min_stock, unit, active, buy_price, buy_price_unit, prices, pieces_per_carton, dozens_per_carton, pieces_per_dozen, alt_name } = req.body

    const sets = []
    const params = []
    if (name !== undefined) { sets.push('name=?'); params.push(name) }
    if (alt_name !== undefined) { sets.push('alt_name=?'); params.push(alt_name || null) }
    if (category !== undefined) { sets.push('category=?'); params.push(category) }
    if (stock !== undefined) { sets.push('stock=?'); params.push(stock) }
    if (min_stock !== undefined) { sets.push('min_stock=?'); params.push(min_stock) }
    if (unit !== undefined) { sets.push('unit=?'); params.push(unit) }
    if (active !== undefined) { sets.push('active=?'); params.push(active ? 1 : 0) }
    if (buy_price !== undefined) {
      const bp = Number(buy_price) || 0
      sets.push('buy_price=?'); params.push(bp)
    }
    if (buy_price_unit !== undefined) {
      sets.push('buy_price_unit=?')
      params.push(UNITS.includes(buy_price_unit) ? buy_price_unit : 'Piece')
    }
    if (pieces_per_carton !== undefined) { sets.push('pieces_per_carton=?'); params.push(normalizePack(pieces_per_carton)) }
    if (dozens_per_carton !== undefined) { sets.push('dozens_per_carton=?'); params.push(normalizePack(dozens_per_carton)) }
    if (pieces_per_dozen !== undefined) { sets.push('pieces_per_dozen=?'); params.push(normalizeDozen(pieces_per_dozen)) }

    const existing = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Product not found' })

    const effPpc = pieces_per_carton !== undefined ? normalizePack(pieces_per_carton) : normalizePack(existing.pieces_per_carton)
    const effDpc = dozens_per_carton !== undefined ? normalizePack(dozens_per_carton) : normalizePack(existing.dozens_per_carton)
    const effPpd = pieces_per_dozen !== undefined ? normalizeDozen(pieces_per_dozen) : normalizeDozen(existing.pieces_per_dozen)
    const effBase = UNITS.includes(buy_price_unit) ? buy_price_unit : (buy_price_unit !== undefined ? 'Piece' : (existing.buy_price_unit || 'Piece'))
    const effBp = buy_price !== undefined ? (Number(buy_price) || 0) : (Number(existing.buy_price) || 0)

    if (prices !== undefined) {
      const normPrices = normalizePrices(!Array.isArray(prices) ? [prices] : prices)
      const check = validatePrices(normPrices, effBp, effBase, effPpc, effDpc, effPpd)
      if (check.error) return res.status(400).json({ error: check.error })
      await savePrices(req.params.id, normPrices)
    } else {
      const check = validatePrices([], effBp, effBase, effPpc, effDpc, effPpd)
      if (check.error) return res.status(400).json({ error: check.error })
    }

    if (sets.length > 0) {
      params.push(req.params.id)
      await execute(`UPDATE products SET ${sets.join(', ')} WHERE id=?`, params)
    }

    const product = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id])
    await logAudit(req, 'product.update', `Updated product ${product.name}${active !== undefined ? ` (active: ${active ? 'yes' : 'no'})` : ''}`)
    res.json((await attachPrices([product]))[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const product = await queryOne('SELECT id, name FROM products WHERE id = ?', [req.params.id])
    await execute('DELETE FROM products WHERE id = ?', [req.params.id])
    if (product) await logAudit(req, 'product.delete', `Deleted product ${product.name}`)
    res.json({ message: 'Product deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router