import { Router } from 'express'
import { query, execute, queryOne } from '../config/db.js'
import { logAudit } from '../config/audit.js'
import { adminOnly } from '../middleware/auth.js'

const router = Router()

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

async function piecesFor(productId, qty, unit) {
  const q = Number(qty) || 0
  if (!q) return 0
  const p = await queryOne('SELECT pieces_per_carton, dozens_per_carton, pieces_per_dozen FROM products WHERE id = ?', [productId])
  const per = unitPieces(unit, p?.pieces_per_carton, p?.dozens_per_carton, p?.pieces_per_dozen)
  return per > 0 ? q * per : 0
}

router.get('/', async (req, res) => {
  try {
    const rows = await query(`
      SELECT o.id, o.order_no, o.customer_id, o.salesman_id, o.total, o.payment_method, o.notes, o.status,
             DATE_FORMAT(o.order_date, '%Y-%m-%d') as order_date, o.created_at,
             u.name as salesman_name, c.name as customer_name,
(SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
             (SELECT COALESCE(SUM(CASE WHEN oi.paid = 1 THEN oi.quantity ELSE 0 END), 0) FROM order_items oi WHERE oi.order_id = o.id) AS paid_count,
             (SELECT COALESCE(SUM(CASE WHEN oi.paid = 1 THEN oi.total ELSE 0 END), 0) FROM order_items oi WHERE oi.order_id = o.id) AS paid_total
      FROM orders o
      LEFT JOIN users u ON o.salesman_id = u.id
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
    `)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const singleOrderSelect = `
  SELECT o.id, o.order_no, o.customer_id, o.salesman_id, o.total, o.payment_method, o.notes, o.status,
         DATE_FORMAT(o.order_date, '%Y-%m-%d') as order_date, o.created_at,
         u.name as salesman_name, c.name as customer_name,
(SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
         (SELECT COALESCE(SUM(CASE WHEN oi.paid = 1 THEN oi.quantity ELSE 0 END), 0) FROM order_items oi WHERE oi.order_id = o.id) AS paid_count,
         (SELECT COALESCE(SUM(CASE WHEN oi.paid = 1 THEN oi.total ELSE 0 END), 0) FROM order_items oi WHERE oi.order_id = o.id) AS paid_total
  FROM orders o
  LEFT JOIN users u ON o.salesman_id = u.id
  LEFT JOIN customers c ON o.customer_id = c.id
`

router.get('/:id', async (req, res) => {
  try {
    const order = await queryOne(`${singleOrderSelect} WHERE o.id = ?`, [req.params.id])
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const items = await query(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [req.params.id])

    res.json({ ...order, items })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id/pay-items', async (req, res) => {
  try {
    const orderId = req.params.id
    const { item_ids } = req.body
    const ids = Array.isArray(item_ids) ? item_ids.map(Number).filter(Boolean) : []

    const order = await queryOne('SELECT order_no, status, salesman_id FROM orders WHERE id = ?', [orderId])
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const isAdmin = req.user.role === 'admin'
    if (!isAdmin && Number(order.salesman_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only record payment on your own orders' })
    }

    await execute('UPDATE order_items SET paid = 0 WHERE order_id = ?', [orderId])
    for (const id of ids) {
      await execute('UPDATE order_items SET paid = 1 WHERE id = ? AND order_id = ?', [id, orderId])
    }

    const agg = await queryOne(`
      SELECT COALESCE(SUM(quantity), 0) AS total_items,
             COALESCE(SUM(CASE WHEN paid = 1 THEN quantity ELSE 0 END), 0) AS paid_count,
             COALESCE(SUM(CASE WHEN paid = 1 THEN total ELSE 0 END), 0) AS paid_total
      FROM order_items WHERE order_id = ?
    `, [orderId])

    if (order.status !== 'Cancelled') {
      const newStatus = agg.total_items > 0 && agg.paid_count >= agg.total_items ? 'Completed' : 'Pending'
      await execute('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId])
    }

    const updated = await queryOne(`${singleOrderSelect} WHERE o.id = ?`, [orderId])
    const items = await query(
      'SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [orderId]
    )
    await logAudit(req, 'order.pay', `Order ${order.order_no} — ${agg.paid_count}/${agg.total_items} items paid (TSh ${agg.paid_total})`)
    res.json({ ...updated, items })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { customer_name, customer_phone, salesman_id, items, payment_method, notes, order_date } = req.body

    const customerName = typeof customer_name === 'string' ? customer_name.trim() : ''
    if (!customerName) {
      return res.status(400).json({ error: 'Customer name is required' })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'An order needs at least one item' })
    }

    for (const item of items) {
      if (!item.product_id) return res.status(400).json({ error: 'Every item needs a product' })
      const qty = Number(item.quantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Item quantity must be greater than zero' })
      }
      const price = Number(item.price)
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: 'Item price must be zero or more' })
      }
    }

    const orderPids = [...new Set(items.map(i => Number(i.product_id)).filter(Boolean))]
    if (orderPids.length > 0) {
      const packs = await query(
        'SELECT id, name, pieces_per_carton, dozens_per_carton, pieces_per_dozen FROM products WHERE id IN (?)',
        [orderPids.join(',')]
      )
      const packOf = {}
      packs.forEach(p => { packOf[p.id] = p })
      for (const item of items) {
        const p = packOf[Number(item.product_id)]
        if (!p) continue
        const reason = unitUnusableReason(item.unit || 'Piece', p.pieces_per_carton, p.dozens_per_carton, p.pieces_per_dozen)
        if (reason) {
          return res.status(400).json({ error: `${p.name}: ${item.unit} cannot be sold because ${reason}. An admin must set its pack specification first.` })
        }
      }
    }

    let customer = await queryOne('SELECT id FROM customers WHERE name = ?', [customerName])
    let customerId
    if (!customer) {
      const custResult = await execute('INSERT INTO customers (name, phone) VALUES (?, ?)', [customerName, customer_phone || null])
      customerId = custResult.insertId
    } else {
      customerId = customer.id
    }

    const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity), 0)
    const itemPids = [...new Set(items.map(i => Number(i.product_id)).filter(Boolean))]
    if (itemPids.length > 0) {
      const buys = await query(`SELECT id, buy_price, buy_price_unit, pieces_per_carton, dozens_per_carton, pieces_per_dozen FROM products WHERE id IN (${itemPids.map(() => '?').join(',')})`, itemPids)
      const buyOf = {}
      buys.forEach(b => { buyOf[b.id] = b })
      const unitCost = (bp, baseUnit, unit, ppc, dpc, ppd) => {
        if (bp <= 0) return 0
        const perBase = unitPieces(baseUnit, ppc, dpc, ppd)
        const perTarget = unitPieces(unit, ppc, dpc, ppd)
        if (perBase <= 0 || perTarget <= 0) return 0
        return (bp / perBase) * perTarget
      }
      for (const item of items) {
        const prod = buyOf[Number(item.product_id)]
        if (!prod) continue
        const cost = unitCost(Number(prod.buy_price) || 0, prod.buy_price_unit || 'Piece', item.unit || 'Piece', prod.pieces_per_carton, prod.dozens_per_carton, prod.pieces_per_dozen)
        const sp = Number(item.price) || 0
        if (cost > 0 && sp > 0 && sp <= cost && String(item.price_type || 'Retail').toLowerCase() === 'optional') {
          return res.status(400).json({ error: `Optional price TSh ${sp.toLocaleString()} must be greater than the buy price for that unit (TSh ${cost.toLocaleString()})` })
        }
      }
    }
    const orderNo = `ORD${String(Date.now()).slice(-6)}`

    const orderResult = await execute(
      'INSERT INTO orders (order_no, customer_id, salesman_id, total, payment_method, notes, order_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [orderNo, customerId, salesman_id, total, payment_method || 'Cash', notes || null, order_date || new Date().toISOString().split('T')[0], 'Pending']
    )
    const orderId = orderResult.insertId

    for (const item of items) {
      await execute(
        'INSERT INTO order_items (order_id, product_id, quantity, unit, price_type, unit_price, total) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.unit || 'Piece', item.price_type || 'Retail', item.price || 0, item.price * item.quantity]
      )
      const pieces = await piecesFor(item.product_id, item.quantity, item.unit || 'Piece')
      await execute('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [pieces, item.product_id])
    }

    const order = await queryOne('SELECT id, order_no, customer_id, salesman_id, total, payment_method, notes, status, DATE_FORMAT(order_date, "%Y-%m-%d") as order_date FROM orders WHERE id = ?', [orderId])
    await logAudit(req, 'order.create', `Order ${orderNo} billed for ${customerName} (TSh ${total}) — awaiting payment`)
    res.status(201).json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { customer_name, payment_method, notes, order_date } = req.body
    const order = await queryOne('SELECT order_no FROM orders WHERE id = ?', [req.params.id])
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const updates = []
    const params = []
    if (customer_name !== undefined) {
      const newName = typeof customer_name === 'string' ? customer_name.trim() : ''
      if (!newName) return res.status(400).json({ error: 'Customer name is required' })
      let cust = await queryOne('SELECT id FROM customers WHERE name = ?', [newName])
      if (!cust) {
        const r = await execute('INSERT INTO customers (name) VALUES (?)', [newName])
        cust = { id: r.insertId }
      }
      updates.push('customer_id=?')
      params.push(cust.id)
    }
    if (payment_method !== undefined) { updates.push('payment_method=?'); params.push(payment_method) }
    if (notes !== undefined) { updates.push('notes=?'); params.push(notes || null) }
    if (order_date !== undefined) { updates.push('order_date=?'); params.push(order_date) }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' })
    params.push(req.params.id)
    await execute(`UPDATE orders SET ${updates.join(', ')} WHERE id=?`, params)
    await logAudit(req, 'order.update', `Order ${order.order_no} details updated`)
    const updated = await queryOne(`${singleOrderSelect} WHERE o.id = ?`, [req.params.id])
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id/items', adminOnly, async (req, res) => {
  try {
    const orderId = req.params.id
    const { items } = req.body
    const order = await queryOne('SELECT order_no, status FROM orders WHERE id = ?', [orderId])
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Order must contain at least one item' })

    const oldItems = await query('SELECT product_id, quantity, unit FROM order_items WHERE order_id = ?', [orderId])

    const oldByProduct = {}
    for (const it of oldItems) {
      const pieces = await piecesFor(it.product_id, it.quantity, it.unit || 'Piece')
      oldByProduct[it.product_id] = (oldByProduct[it.product_id] || 0) + pieces
    }

    const newByProduct = {}
    let total = 0
    for (const item of items) {
      const pid = Number(item.product_id)
      const qty = Number(item.quantity) || 0
      if (!pid || qty < 1) return res.status(400).json({ error: 'Each item needs a product and a quantity of at least 1' })
      const unit = item.unit || 'Piece'
      const pieces = await piecesFor(pid, qty, unit)
      newByProduct[pid] = (newByProduct[pid] || 0) + pieces
      total += (Number(item.price) || 0) * qty
    }

    const allProductIds = [...new Set([...Object.keys(oldByProduct), ...Object.keys(newByProduct)])]
    const allProducts = await query(`SELECT id, stock FROM products WHERE id IN (${allProductIds.join(',') || '0'})`)

    for (const pid of Object.keys(newByProduct)) {
      const prod = allProducts.find(p => p.id === Number(pid))
      const curStock = Number(prod?.stock) || 0
      const oldPieces = oldByProduct[pid] || 0
      if (curStock + oldPieces - newByProduct[pid] < 0) {
        const p = await queryOne('SELECT name FROM products WHERE id = ?', [pid])
        return res.status(400).json({ error: `Insufficient stock for ${p?.name || 'product'} (have ${curStock}, try to add ${newByProduct[pid] - oldPieces} more)` })
      }
    }
    for (const pid of Object.keys(newByProduct)) {
      const prod = allProducts.find(p => p.id === Number(pid))
      const curStock = Number(prod?.stock) || 0
      const oldPieces = oldByProduct[pid] || 0
      const projected = curStock + oldPieces - newByProduct[pid]
      await execute('UPDATE products SET stock = GREATEST(0, ?) WHERE id = ?', [projected, Number(pid)])
    }

    await execute('DELETE FROM order_items WHERE order_id = ?', [orderId])
    for (const item of items) {
      await execute(
        'INSERT INTO order_items (order_id, product_id, quantity, unit, price_type, unit_price, total, paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [orderId, Number(item.product_id), Number(item.quantity), item.unit || 'Piece', item.price_type || 'Retail', item.price || 0, (Number(item.price) || 0) * Number(item.quantity), order.status === 'Completed' ? 1 : 0]
      )
    }
    await execute('UPDATE orders SET total = ? WHERE id = ?', [total, orderId])
    if (order.status !== 'Completed') {
      await execute('UPDATE orders SET status = ? WHERE id = ?', ['Pending', orderId])
    }

    const updated = await queryOne(`${singleOrderSelect} WHERE o.id = ?`, [orderId])
    const newItems = await query(
      'SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [orderId]
    )
    await logAudit(req, 'order.update', `Order ${order.order_no} items corrected (TSh ${total})`)
    res.json({ ...updated, items: newItems })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body
    await execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id])
    if (status === 'Completed') {
      await execute('UPDATE order_items SET paid = 1 WHERE order_id = ?', [req.params.id])
    } else if (status === 'Pending') {
      await execute('UPDATE order_items SET paid = 0 WHERE order_id = ?', [req.params.id])
    }
    const order = await queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id])
    await logAudit(req, 'order.status', `Order ${order?.order_no || req.params.id} status → ${status}`)
    res.json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const order = await queryOne('SELECT id, order_no, total FROM orders WHERE id = ?', [req.params.id])
    const items = await query('SELECT product_id, quantity, unit FROM order_items WHERE order_id = ?', [req.params.id])
    for (const it of items) {
      const pieces = await piecesFor(it.product_id, it.quantity, it.unit || 'Piece')
      await execute('UPDATE products SET stock = stock + ? WHERE id = ?', [pieces, it.product_id])
    }
    await execute('DELETE FROM order_items WHERE order_id = ?', [req.params.id])
    await execute('DELETE FROM orders WHERE id = ?', [req.params.id])
    if (order) await logAudit(req, 'order.delete', `Deleted order ${order.order_no} (TSh ${order.total}) — stock restored`)
    res.json({ message: 'Order deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
