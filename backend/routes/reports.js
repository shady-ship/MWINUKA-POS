import { Router } from 'express'
import { query, execute, queryOne } from '../config/db.js'

const router = Router()

router.delete('/reset-orders', async (req, res) => {
  try {
    await execute('DELETE FROM order_items')
    await execute('DELETE FROM orders')
    await execute('DELETE FROM customers')
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
    const products = await query('SELECT * FROM products WHERE stock <= 20 ORDER BY stock ASC')
    res.json(products)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
