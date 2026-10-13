import { Router } from 'express'
import { query, execute, queryOne, withTransaction, badRequest } from '../config/db.js'
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

function unitBuyCost(buyPrice, baseUnit, unit, piecesPerCarton, dozensPerCarton, piecesPerDozen) {
  const bp = Number(buyPrice) || 0
  const perBase = unitPieces(baseUnit, piecesPerCarton, dozensPerCarton, piecesPerDozen)
  const perTarget = unitPieces(unit, piecesPerCarton, dozensPerCarton, piecesPerDozen)
  if (bp <= 0 || perBase <= 0 || perTarget <= 0) return 0
  return (bp / perBase) * perTarget
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

/**
 * Converts a quantity in `unit` to pieces, using pack data that the caller has
 * already fetched. The old version took a product id and ran its own SELECT, which
 * meant one extra query per order line - the single biggest cost in creating a sale.
 */
function piecesOf(pack, qty, unit) {
  const q = Number(qty) || 0
  if (!q || !pack) return 0
  const per = unitPieces(unit, pack.pieces_per_carton, pack.dozens_per_carton, pack.pieces_per_dozen)
  return per > 0 ? q * per : 0
}

/**
 * Order numbers must be unique (there is a unique index on order_no). Deriving them
 * from Date.now() alone collides whenever two sales land in the same millisecond,
 * which used to abort the INSERT half way through an order. Two random characters
 * make that effectively impossible, and because order creation now runs in a
 * transaction, even a rare collision rolls back cleanly instead of leaving a stub.
 */
function makeOrderNo() {
  const stamp = String(Date.now()).slice(-6)
  const suffix = Math.random().toString(36).slice(2, 4).toUpperCase()
  return `ORD${stamp}${suffix}`
}

router.get('/', async (req, res) => {
  try {
    const rows = await query(`
      SELECT o.id, o.order_no, o.customer_id, o.salesman_id, o.total, o.payment_method, o.notes, o.status,
             DATE_FORMAT(o.order_date, '%Y-%m-%d') as order_date,
             DATE_FORMAT(o.created_at, '%H:%i') as order_time, o.created_at,
             u.name as salesman_name, c.name as customer_name,
             COALESCE(a.item_count, 0) AS item_count,
             COALESCE(a.paid_count, 0) AS paid_count,
             COALESCE(a.paid_total, 0) AS paid_total
      FROM orders o
      LEFT JOIN users u ON o.salesman_id = u.id
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN (
        SELECT order_id,
               SUM(quantity) AS item_count,
               SUM(CASE WHEN paid = 1 THEN quantity ELSE 0 END) AS paid_count,
               SUM(CASE WHEN paid = 1 THEN total ELSE 0 END) AS paid_total
        FROM order_items
        GROUP BY order_id
      ) a ON a.order_id = o.id
      ORDER BY o.created_at DESC
    `)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const singleOrderSelect = `
  SELECT o.id, o.order_no, o.customer_id, o.salesman_id, o.total, o.payment_method, o.notes, o.status,
         DATE_FORMAT(o.order_date, '%Y-%m-%d') as order_date,
         DATE_FORMAT(o.created_at, '%H:%i') as order_time, o.created_at,
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

    // Two statements (was one per item), and the status change now commits together
    // with the payments instead of being a separate, independently-failing write.
    const agg = await withTransaction(async (tx) => {
      await tx.execute('UPDATE order_items SET paid = 0 WHERE order_id = ?', [orderId])
      if (ids.length > 0) {
        await tx.execute(
          `UPDATE order_items SET paid = 1 WHERE order_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
          [orderId, ...ids]
        )
      }

      const a = await tx.queryOne(`
        SELECT COALESCE(SUM(quantity), 0) AS total_items,
               COALESCE(SUM(CASE WHEN paid = 1 THEN quantity ELSE 0 END), 0) AS paid_count,
               COALESCE(SUM(CASE WHEN paid = 1 THEN total ELSE 0 END), 0) AS paid_total
        FROM order_items WHERE order_id = ?
      `, [orderId])

      // SUM() returns DECIMAL, which mysql2 hands back as a string. Comparing those
      // directly is lexicographic - "10" >= "9" is false - which could leave an order
      // stuck as Pending. Coerce to numbers before comparing.
      const totalItems = Number(a.total_items) || 0
      const paidCount = Number(a.paid_count) || 0
      const paidTotal = Number(a.paid_total) || 0

      if (order.status !== 'Cancelled') {
        const newStatus = totalItems > 0 && paidCount >= totalItems ? 'Completed' : 'Pending'
        await tx.execute('UPDATE orders SET status = ? WHERE id = ?', [newStatus, orderId])
      }

      return { totalItems, paidCount, paidTotal }
    })

    const updated = await queryOne(`${singleOrderSelect} WHERE o.id = ?`, [orderId])
    const items = await query(
      'SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [orderId]
    )
    await logAudit(req, 'order.pay', `Order ${order.order_no} — ${agg.paidCount}/${agg.totalItems} items paid (TSh ${agg.paidTotal})`)
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

    // One fetch of everything this order needs - pack sizes, buy prices and stock -
    // replacing two separate IN() queries plus the per-line SELECT that used to run
    // inside the insert loop.
    const orderPids = [...new Set(items.map(i => Number(i.product_id)).filter(Boolean))]
    if (orderPids.length === 0) {
      return res.status(400).json({ error: 'An order needs at least one product' })
    }

    const listed = await query(
      `SELECT id, name, stock, buy_price, buy_price_unit, pieces_per_carton, dozens_per_carton, pieces_per_dozen
       FROM products WHERE id IN (${orderPids.map(() => '?').join(',')})`,
      orderPids
    )
    const productOf = Object.fromEntries(listed.map(p => [Number(p.id), p]))

    const vanished = orderPids.find(pid => !productOf[pid])
    if (vanished) return res.status(400).json({ error: 'One of the products on this order no longer exists' })

    for (const item of items) {
      const p = productOf[Number(item.product_id)]
      const reason = unitUnusableReason(item.unit || 'Piece', p.pieces_per_carton, p.dozens_per_carton, p.pieces_per_dozen)
      if (reason) {
        return res.status(400).json({ error: `${p.name}: ${item.unit} cannot be sold because ${reason}. An admin must set its pack specification first.` })
      }
    }

    for (const item of items) {
      const prod = productOf[Number(item.product_id)]
      const cost = unitBuyCost(
        Number(prod.buy_price) || 0,
        prod.buy_price_unit || 'Piece',
        item.unit || 'Piece',
        prod.pieces_per_carton,
        prod.dozens_per_carton,
        prod.pieces_per_dozen
      )
      const sp = Number(item.price) || 0
      if (cost > 0 && sp > 0 && sp <= cost && String(item.price_type || 'Retail').toLowerCase() === 'optional') {
        return res.status(400).json({ error: `Optional price TSh ${sp.toLocaleString()} must be greater than the buy price for that unit (TSh ${cost.toLocaleString()})` })
      }
    }

    const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity), 0)
    const orderNo = makeOrderNo()
    const orderDate = order_date || new Date().toISOString().split('T')[0]

    // Everything below is all-or-nothing. If any statement fails - the connection
    // drops, stock is short, the server restarts mid-sale - the whole sale rolls
    // back, so an order can never exist without its items, and stock can never be
    // deducted for an order that was not written.
    const created = await withTransaction(async (tx) => {
      // Resolve (or create) the customer inside the transaction too, so a rejected
      // sale does not leave an orphan customer row behind.
      const existing = await tx.queryOne('SELECT id FROM customers WHERE name = ?', [customerName])
      const customerId = existing
        ? existing.id
        : (await tx.execute('INSERT INTO customers (name, phone) VALUES (?, ?)', [customerName, customer_phone || null])).insertId

      // Lock the stock rows this sale touches. Without FOR UPDATE two cashiers can
      // read the same stock at the same instant and both sell the last carton.
      const locked = await tx.query(
        `SELECT id, name, stock FROM products WHERE id IN (${orderPids.map(() => '?').join(',')}) FOR UPDATE`,
        orderPids
      )
      const stockOf = Object.fromEntries(locked.map(p => [Number(p.id), p]))

      // Pieces this sale takes, per product (the same product can appear on several lines).
      const neededByProduct = {}
      for (const item of items) {
        const pid = Number(item.product_id)
        neededByProduct[pid] = (neededByProduct[pid] || 0) + piecesOf(productOf[pid], item.quantity, item.unit || 'Piece')
      }

      for (const [pid, needed] of Object.entries(neededByProduct)) {
        const prod = stockOf[pid]
        const inStock = Number(prod?.stock) || 0
        if (needed > inStock) {
          // Reject the sale instead of clamping stock to zero and hiding the shortfall.
          throw badRequest(`Not enough stock for ${prod?.name || 'product'}: this sale needs ${needed} pc but only ${inStock} pc are available`)
        }
      }

      const orderId = (await tx.execute(
        'INSERT INTO orders (order_no, customer_id, salesman_id, total, payment_method, notes, order_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [orderNo, customerId, salesman_id, total, payment_method || 'Cash', notes || null, orderDate, 'Pending']
      )).insertId

      // One multi-row INSERT for the whole order instead of one statement per line.
      const itemParams = []
      const itemValues = items.map(item => {
        itemParams.push(orderId, item.product_id, item.quantity, item.unit || 'Piece', item.price_type || 'Retail', item.price || 0, Number(item.price || 0) * Number(item.quantity))
        return '(?, ?, ?, ?, ?, ?, ?)'
      })
      await tx.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, unit, price_type, unit_price, total) VALUES ${itemValues.join(', ')}`,
        itemParams
      )

      for (const [pid, needed] of Object.entries(neededByProduct)) {
        await tx.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [needed, Number(pid)])
      }

      return { orderId, customerId }
    })

    const order = await queryOne('SELECT id, order_no, customer_id, salesman_id, total, payment_method, notes, status, DATE_FORMAT(order_date, "%Y-%m-%d") as order_date, DATE_FORMAT(created_at, "%H:%i") as order_time FROM orders WHERE id = ?', [created.orderId])
    await logAudit(req, 'order.create', `Order ${orderNo} billed for ${customerName} (TSh ${total}) — awaiting payment`)
    res.status(201).json(order)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
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

    // Old quantities are needed to work out the stock difference, so they are read
    // with their pack sizes up front - no more one SELECT per old line.
    const oldItems = await query('SELECT product_id, quantity, unit FROM order_items WHERE order_id = ?', [orderId])

    const itemPids = [...new Set(items.map(item => Number(item.product_id)).filter(pid => Number.isInteger(pid) && pid > 0))]
    const itemProducts = itemPids.length
      ? await query(
        `SELECT id, name, stock, buy_price, buy_price_unit, pieces_per_carton, dozens_per_carton, pieces_per_dozen FROM products WHERE id IN (${itemPids.map(() => '?').join(',')})`,
        itemPids
      )
      : []
    const itemProductById = Object.fromEntries(itemProducts.map(product => [Number(product.id), product]))

    const oldPids = [...new Set(oldItems.map(it => Number(it.product_id)).filter(Boolean))]
    const oldPacks = oldPids.length
      ? await query(`SELECT id, pieces_per_carton, dozens_per_carton, pieces_per_dozen FROM products WHERE id IN (${oldPids.map(() => '?').join(',')})`, oldPids)
      : []
    const oldPackOf = Object.fromEntries(oldPacks.map(p => [Number(p.id), p]))

    const oldByProduct = {}
    for (const it of oldItems) {
      const pid = Number(it.product_id)
      const pieces = piecesOf(oldPackOf[pid], it.quantity, it.unit || 'Piece')
      oldByProduct[pid] = (oldByProduct[pid] || 0) + pieces
    }

    const newByProduct = {}
    let total = 0
    for (const item of items) {
      const pid = Number(item.product_id)
      const qty = Number(item.quantity) || 0
      if (!pid || qty < 1) return res.status(400).json({ error: 'Each item needs a product and a quantity of at least 1' })
      const product = itemProductById[pid]
      if (!product) return res.status(400).json({ error: 'Product not found' })
      const unit = item.unit || 'Piece'
      const price = Number(item.price)
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Item price must be zero or more' })
      const cost = unitBuyCost(
        product.buy_price,
        product.buy_price_unit || 'Piece',
        unit,
        product.pieces_per_carton,
        product.dozens_per_carton,
        product.pieces_per_dozen
      )
      if (cost > 0 && price <= cost) {
        return res.status(400).json({
          error: `Price for ${product.name} (${unit}) must be greater than its buy price for that unit (TSh ${cost.toLocaleString()})`,
        })
      }
      newByProduct[pid] = (newByProduct[pid] || 0) + piecesOf(product, qty, unit)
      total += price * qty
    }

    const affectedPids = [...new Set([
      ...Object.keys(oldByProduct).map(Number),
      ...Object.keys(newByProduct).map(Number),
    ])]

    await withTransaction(async (tx) => {
      // Lock every stock row this edit touches, then check all of them against their
      // projected stock BEFORE writing, so a rejected edit never leaves the order
      // half re-written or stock half adjusted.
      const locked = affectedPids.length
        ? await tx.query(`SELECT id, name, stock FROM products WHERE id IN (${affectedPids.map(() => '?').join(',')}) FOR UPDATE`, affectedPids)
        : []
      const stockOf = Object.fromEntries(locked.map(p => [Number(p.id), p]))

      for (const pid of affectedPids) {
        const curStock = Number(stockOf[pid]?.stock) || 0
        const shortfall = curStock + (oldByProduct[pid] || 0) - (newByProduct[pid] || 0)
        if (shortfall < 0) {
          throw badRequest(`Insufficient stock for ${stockOf[pid]?.name || 'product'} (have ${curStock}, this edit needs ${-shortfall} more)`)
        }
      }

      for (const pid of affectedPids) {
        const curStock = Number(stockOf[pid]?.stock) || 0
        const projected = curStock + (oldByProduct[pid] || 0) - (newByProduct[pid] || 0)
        await tx.execute('UPDATE products SET stock = ? WHERE id = ?', [projected, pid])
      }

      await tx.execute('DELETE FROM order_items WHERE order_id = ?', [orderId])

      const lineParams = []
      const lineValues = items.map(item => {
        lineParams.push(orderId, Number(item.product_id), Number(item.quantity), item.unit || 'Piece', item.price_type || 'Retail', item.price || 0, (Number(item.price) || 0) * Number(item.quantity), order.status === 'Completed' ? 1 : 0)
        return '(?, ?, ?, ?, ?, ?, ?, ?)'
      })
      await tx.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, unit, price_type, unit_price, total, paid) VALUES ${lineValues.join(', ')}`,
        lineParams
      )

      await tx.execute('UPDATE orders SET total = ? WHERE id = ?', [total, orderId])
      if (order.status !== 'Completed') {
        await tx.execute('UPDATE orders SET status = ? WHERE id = ?', ['Pending', orderId])
      }
    })

    const updated = await queryOne(`${singleOrderSelect} WHERE o.id = ?`, [orderId])
    const newItems = await query(
      'SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [orderId]
    )
    await logAudit(req, 'order.update', `Order ${order.order_no} items corrected (TSh ${total})`)
    res.json({ ...updated, items: newItems })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

router.put('/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body
    // Order status and the item paid flags describe the same fact, so they change together.
    await withTransaction(async (tx) => {
      await tx.execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id])
      if (status === 'Completed') {
        await tx.execute('UPDATE order_items SET paid = 1 WHERE order_id = ?', [req.params.id])
      } else if (status === 'Pending') {
        await tx.execute('UPDATE order_items SET paid = 0 WHERE order_id = ?', [req.params.id])
      }
    })
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
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const items = await query('SELECT product_id, quantity, unit FROM order_items WHERE order_id = ?', [order.id])

    // Restoring stock and removing the order must succeed together. Done separately,
    // a failure between them could either restore stock for an order that still
    // exists (double stock on a retry) or delete the order without restoring stock.
    await withTransaction(async (tx) => {
      const restoreByProduct = {}
      const pids = [...new Set(items.map(it => Number(it.product_id)).filter(Boolean))]
      const packs = pids.length
        ? await tx.query(`SELECT id, pieces_per_carton, dozens_per_carton, pieces_per_dozen FROM products WHERE id IN (${pids.map(() => '?').join(',')}) FOR UPDATE`, pids)
        : []
      const packOf = Object.fromEntries(packs.map(p => [Number(p.id), p]))

      for (const it of items) {
        const pid = Number(it.product_id)
        restoreByProduct[pid] = (restoreByProduct[pid] || 0) + piecesOf(packOf[pid], it.quantity, it.unit || 'Piece')
      }

      for (const [pid, pieces] of Object.entries(restoreByProduct)) {
        await tx.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [pieces, Number(pid)])
      }

      await tx.execute('DELETE FROM order_items WHERE order_id = ?', [order.id])
      await tx.execute('DELETE FROM orders WHERE id = ?', [order.id])
    })

    await logAudit(req, 'order.delete', `Deleted order ${order.order_no} (TSh ${order.total}) — stock restored`)
    res.json({ message: 'Order deleted' })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

export default router
