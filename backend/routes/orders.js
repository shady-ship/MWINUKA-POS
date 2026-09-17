import { Router } from 'express'
import { query, execute, queryOne } from '../config/db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const rows = await query(`
      SELECT o.id, o.order_no, o.customer_id, o.salesman_id, o.total, o.payment_method, o.notes, o.status,
             DATE_FORMAT(o.order_date, '%Y-%m-%d') as order_date, o.created_at,
             u.name as salesman_name, c.name as customer_name
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

router.get('/:id', async (req, res) => {
  try {
    const order = await queryOne(`
      SELECT o.id, o.order_no, o.customer_id, o.salesman_id, o.total, o.payment_method, o.notes, o.status,
             DATE_FORMAT(o.order_date, '%Y-%m-%d') as order_date, o.created_at,
             u.name as salesman_name, c.name as customer_name
      FROM orders o
      LEFT JOIN users u ON o.salesman_id = u.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `, [req.params.id])
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
      'INSERT INTO orders (order_no, customer_id, salesman_id, total, payment_method, notes, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [orderNo, customerId, salesman_id, total, payment_method || 'Cash', notes || null, order_date || new Date().toISOString().split('T')[0]]
    )
    const orderId = orderResult.insertId

    for (const item of items) {
      await execute(
        'INSERT INTO order_items (order_id, product_id, quantity, unit, price_type, unit_price, total) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.unit || 'Piece', item.price_type || 'Retail', item.price || 0, item.price * item.quantity]
      )
      await execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id])
    }

    const order = await queryOne('SELECT id, order_no, customer_id, salesman_id, total, payment_method, notes, status, DATE_FORMAT(order_date, "%Y-%m-%d") as order_date FROM orders WHERE id = ?', [orderId])
    res.status(201).json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body
    await execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id])
    const order = await queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id])
    res.json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM order_items WHERE order_id = ?', [req.params.id])
    await execute('DELETE FROM orders WHERE id = ?', [req.params.id])
    res.json({ message: 'Order deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
