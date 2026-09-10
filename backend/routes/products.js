import { Router } from 'express'
import { query, execute, queryOne } from '../config/db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query
    let sql = 'SELECT * FROM products WHERE 1=1'
    const params = []
    if (category) { sql += ' AND category = ?'; params.push(category) }
    if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`) }
    sql += ' ORDER BY name'
    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Product not found' })
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, category, price, price_dozen, price_carton, stock, unit } = req.body
    const result = await execute(
      'INSERT INTO products (name, category, price, price_dozen, price_carton, stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category || null, price || null, price_dozen || null, price_carton || null, stock || 0, unit || null]
    )
    const product = await queryOne('SELECT * FROM products WHERE id = ?', [result.insertId])
    res.status(201).json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, category, price, price_dozen, price_carton, stock, unit } = req.body
    await execute(
      'UPDATE products SET name=?, category=?, price=?, price_dozen=?, price_carton=?, stock=?, unit=? WHERE id=?',
      [name, category || null, price, price_dozen || null, price_carton || null, stock, unit || null, req.params.id]
    )
    const product = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id])
    res.json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM products WHERE id = ?', [req.params.id])
    res.json({ message: 'Product deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
