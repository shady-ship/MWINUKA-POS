import { Router } from 'express'
import { query, execute, queryOne } from '../config/db.js'
import { logAudit } from '../config/audit.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { search } = req.query
    let sql = `
      SELECT c.*,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total), 0) as total_spent
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
    `
    const params = []
    if (search) {
      sql += ' WHERE c.name LIKE ?'
      params.push(`%${search}%`)
    }
    sql += ' GROUP BY c.id ORDER BY c.name'
    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ error: 'Customer not found' })
    res.json(row)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, phone, email } = req.body
    const result = await execute('INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)', [name, phone || null, email || null])
    const customer = await queryOne('SELECT * FROM customers WHERE id = ?', [result.insertId])
    await logAudit(req, 'customer.add', `Added customer ${name}`)
    res.status(201).json(customer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email } = req.body
    await execute('UPDATE customers SET name=?, phone=?, email=? WHERE id=?', [name, phone || null, email || null, req.params.id])
    const customer = await queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id])
    await logAudit(req, 'customer.update', `Updated customer ${name}`)
    res.json(customer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const customer = await queryOne('SELECT id, name FROM customers WHERE id = ?', [req.params.id])
    await execute('DELETE FROM customers WHERE id = ?', [req.params.id])
    if (customer) await logAudit(req, 'customer.delete', `Deleted customer ${customer.name}`)
    res.json({ message: 'Customer deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
