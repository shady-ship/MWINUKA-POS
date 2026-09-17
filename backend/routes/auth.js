import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, execute, queryOne } from '../config/db.js'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await queryOne('SELECT * FROM users WHERE (email = ? OR username = ?) AND active = 1', [email, email])
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = bcrypt.compareSync(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, username: user.username } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/users', async (req, res) => {
  try {
    const rows = await query('SELECT id, name, username, email, role, active, created_at FROM users ORDER BY id')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/users', async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body
    if (!name || !password) return res.status(400).json({ error: 'Name and password are required' })
    if (!username && !email) return res.status(400).json({ error: 'Username or email is required' })
    const existing = await queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username || null, email || `${username || name}@mwinuka.co.tz`])
    if (existing) return res.status(400).json({ error: 'Username already exists, choose a different one' })
    const hash = bcrypt.hashSync(password, 10)
    const result = await execute(
      'INSERT INTO users (name, username, email, password, role, active) VALUES (?, ?, ?, ?, ?, 1)',
      [name, username || null, email || `${username || name}@mwinuka.co.tz`, hash, role || 'sales_staff']
    )
    res.status(201).json({ id: result.insertId, name, username, email, role: role || 'sales_staff', active: 1 })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already exists, choose a different one' })
    }
    res.status(500).json({ error: err.message })
  }
})

router.put('/users/:id', async (req, res) => {
  try {
    const { name, username, email, password, role, active } = req.body
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id])
    if (!user) return res.status(404).json({ error: 'User not found' })

    const updates = []
    const params = []
    if (name !== undefined) { updates.push('name=?'); params.push(name) }
    if (username !== undefined) { updates.push('username=?'); params.push(username) }
    if (email !== undefined) { updates.push('email=?'); params.push(email) }
    if (role !== undefined) { updates.push('role=?'); params.push(role) }
    if (active !== undefined) { updates.push('active=?'); params.push(active ? 1 : 0) }
    if (password) {
      updates.push('password=?')
      params.push(bcrypt.hashSync(password, 10))
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' })
    params.push(req.params.id)
    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id=?`, params)
    const updated = await queryOne('SELECT id, name, username, email, role, active FROM users WHERE id = ?', [req.params.id])
    res.json(updated)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already exists, choose a different one' })
    }
    res.status(500).json({ error: err.message })
  }
})

router.post('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId])
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (!bcrypt.compareSync(currentPassword || '', user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' })
    }
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }
    await execute('UPDATE users SET password=? WHERE id=?', [bcrypt.hashSync(String(newPassword), 10), userId])
    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/users/:id', async (req, res) => {
  try {
    await execute('DELETE FROM users WHERE id = ?', [req.params.id])
    res.json({ message: 'User deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body
    const hash = bcrypt.hashSync(password, 10)
    const result = await execute('INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)', [name, username || null, email, hash, role || 'sales_staff'])
    res.status(201).json({ id: result.insertId, name, email, role: role || 'sales_staff' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router