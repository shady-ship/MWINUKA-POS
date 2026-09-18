import { Router } from 'express'
import { query, execute, queryOne } from '../config/db.js'
import { logAudit } from '../config/audit.js'

const router = Router()

async function piecesFor(productId, qty, unit) {
  const q = Number(qty) || 0
  if (!q) return 0
  if (unit === 'Dozen') return q * 12
  if (unit === 'Carton') {
    const p = await queryOne('SELECT pieces_per_carton, dozens_per_carton FROM products WHERE id = ?', [productId])
    const ppc = Number(p?.pieces_per_carton) || 0
    const dpc = Number(p?.dozens_per_carton) || 0
    const perCarton = ppc > 0 ? ppc : dpc > 0 ? dpc * 12 : 0
    return perCarton > 0 ? q * perCarton : q
  }
  return q
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

    const order = await queryOne('SELECT order_no, status FROM orders WHERE id = ?', [orderId])
    if (!order) return res.status(404).json({ error: 'Order not found' })

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

    let customer = await queryOne('SELECT id FROM customers WHERE name = ?', [customer_name])
    let customerId
    if (!customer) {
      const custResult = await execute('INSERT INTO customers (name, phone) VALUES (?, ?)', [customer_name, customer_phone || null])
      customerId = custResult.insertId
    } else {
      customerId = customer.id
    }

    const total = items.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0)
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
    await logAudit(req, 'order.create', `Order ${orderNo} billed for ${customer_name} (TSh ${total}) — awaiting payment`)
    res.status(201).json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id/status', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
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
