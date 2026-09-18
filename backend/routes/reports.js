import { Router } from 'express'
import { query, execute, queryOne } from '../config/db.js'
import { logAudit } from '../config/audit.js'

const router = Router()

router.delete('/reset-orders', async (req, res) => {
  try {
    await execute('DELETE FROM order_items')
    await execute('DELETE FROM orders')
    await execute('DELETE FROM customers')
    await logAudit(req, 'settings.reset_sales', 'Reset all orders and customers')
    res.json({ message: 'All orders and customers cleared' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/reset-all', async (req, res) => {
  try {
    await execute('DELETE FROM order_items')
    await execute('DELETE FROM orders')
    await execute('DELETE FROM products')
    await execute('DELETE FROM customers')
    await logAudit(req, 'settings.reset_all', 'Reset all products, orders and customers')
    res.json({ message: 'All data cleared' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/dashboard', async (req, res) => {
  try {
    const totalProducts = (await queryOne('SELECT COUNT(*) as count FROM products'))?.count || 0
    const totalStock = (await queryOne('SELECT COALESCE(SUM(stock), 0) as total FROM products'))?.total || 0
    const todaySales = (await queryOne('SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE order_date = CURDATE()'))?.total || 0
    const totalRevenue = (await queryOne('SELECT COALESCE(SUM(total), 0) as total FROM orders'))?.total || 0

    res.json({ totalProducts, totalStock, todaySales, totalRevenue })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/sales', async (req, res) => {
  try {
    const sales = await query(`
      SELECT DATE(order_date) as date, SUM(total) as sales
      FROM orders
      WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(order_date)
      ORDER BY date
    `)
    res.json(sales)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/top-products', async (req, res) => {
  try {
    const products = await query(`
      SELECT p.name, SUM(oi.quantity) as sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.id, p.name
      ORDER BY sold DESC
      LIMIT 5
    `)
    res.json(products)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/low-stock', async (req, res) => {
  try {
    const products = await query('SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC')
    res.json(products)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/by-date', async (req, res) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' })

    const orders = await query(`
      SELECT o.id, o.order_no, o.customer_id, o.salesman_id, o.total, o.payment_method, o.notes, o.status,
             DATE_FORMAT(o.order_date, '%Y-%m-%d') as order_date, o.created_at,
             u.name as salesman_name, c.name as customer_name
      FROM orders o
      LEFT JOIN users u ON o.salesman_id = u.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.order_date = ?
      ORDER BY o.created_at ASC
    `, [date])

    const orderIds = orders.map(o => o.id)
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',')
      const items = await query(`
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id IN (${placeholders})
        ORDER BY oi.order_id, oi.id
      `, orderIds)

      const itemsByOrder = {}
      items.forEach(item => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
        itemsByOrder[item.order_id].push(item)
      })
      orders.forEach(o => { o.items = itemsByOrder[o.id] || [] })
    }

    const totalSales = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    res.json({ date, totalSales, orders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
