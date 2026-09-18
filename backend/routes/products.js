import { Router } from 'express'
import { query, execute, queryOne } from '../config/db.js'
import { logAudit } from '../config/audit.js'

const router = Router()

const UNITS = ['Piece', 'Dozen', 'Carton']
const PRICE_COLS = ['retail_price', 'wholesale_price', 'optional_price']

async function attachPrices(rows) {
  if (rows.length === 0) return rows
  const ids = rows.map(p => p.id)
  const placeholders = ids.map(() => '?').join(',')
  const priceRows = await query(
    `SELECT product_id, unit, retail_price, wholesale_price, optional_price FROM product_prices WHERE product_id IN (${placeholders}) ORDER BY FIELD(unit, 'Piece', 'Dozen', 'Carton')`,
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

function validatePrices(prices, buyPrice) {
  const bp = Number(buyPrice) || 0
  const list = Array.isArray(prices) ? prices : []
  for (const p of list) {
    if (!UNITS.includes(p.unit)) return { error: `Invalid unit: ${p.unit}` }
    for (const col of PRICE_COLS) {
      const val = Number(p[col]) || 0
      if (val > 0 && col === 'optional_price' && val < bp) {
        return { error: `Optional price for ${p.unit} (TSh ${val.toLocaleString()}) must be greater than the buy price (TSh ${bp.toLocaleString()})` }
      }
    }
  }
  return { list }
}

function normalizePack(value) {
  const n = Math.floor(Number(value))
  return isFinite(n) && n > 0 ? n : null
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

router.post('/', async (req, res) => {
  try {
    const { name, category, stock, min_stock, unit, active, buy_price, prices, pieces_per_carton, dozens_per_carton } = req.body
    if (!name) return res.status(400).json({ error: 'Product name is required' })

    const bp = Number(buy_price || 0) || 0
    const normPrices = prices ? normalizePrices(!Array.isArray(prices) ? [prices] : prices) : []
    const check = validatePrices(normPrices, bp)
    if (check.error) return res.status(400).json({ error: check.error })

    const ppc = normalizePack(pieces_per_carton)
    const dpc = normalizePack(dozens_per_carton)

    const result = await execute(
      'INSERT INTO products (name, category, stock, min_stock, unit, active, buy_price, pieces_per_carton, dozens_per_carton) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, category || null, stock || 0, min_stock || 20, unit || null, active === undefined ? 1 : (active ? 1 : 0), bp, ppc, dpc]
    )

    if (normPrices.length > 0) await savePrices(result.insertId, normPrices)
    const product = await queryOne('SELECT * FROM products WHERE id = ?', [result.insertId])
    await logAudit(req, 'product.add', `Added product ${name}`)
    res.status(201).json((await attachPrices([product]))[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, category, stock, min_stock, unit, active, buy_price, prices, pieces_per_carton, dozens_per_carton } = req.body

    const sets = []
    const params = []
    if (name !== undefined) { sets.push('name=?'); params.push(name) }
    if (category !== undefined) { sets.push('category=?'); params.push(category) }
    if (stock !== undefined) { sets.push('stock=?'); params.push(stock) }
    if (min_stock !== undefined) { sets.push('min_stock=?'); params.push(min_stock) }
    if (unit !== undefined) { sets.push('unit=?'); params.push(unit) }
    if (active !== undefined) { sets.push('active=?'); params.push(active ? 1 : 0) }
    if (buy_price !== undefined) {
      const bp = Number(buy_price) || 0
      sets.push('buy_price=?'); params.push(bp)
    }
    if (pieces_per_carton !== undefined) { sets.push('pieces_per_carton=?'); params.push(normalizePack(pieces_per_carton)) }
    if (dozens_per_carton !== undefined) { sets.push('dozens_per_carton=?'); params.push(normalizePack(dozens_per_carton)) }

    const existing = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id])
    if (!existing) return res.status(404).json({ error: 'Product not found' })

    if (prices !== undefined) {
      const bp = buy_price !== undefined ? (Number(buy_price) || 0) : (Number(existing.buy_price) || 0)
      const normPrices = normalizePrices(!Array.isArray(prices) ? [prices] : prices)
      const check = validatePrices(normPrices, bp)
      if (check.error) return res.status(400).json({ error: check.error })
      await savePrices(req.params.id, normPrices)
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

router.delete('/:id', async (req, res) => {
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