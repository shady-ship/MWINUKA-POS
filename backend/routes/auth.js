import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, execute, queryOne } from '../config/db.js'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email])
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = bcrypt.compareSync(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    const hash = bcrypt.hashSync(password, 10)
    const result = await execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hash, role || 'sales_staff'])
    res.status(201).json({ id: result.insertId, name, email, role: role || 'sales_staff' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
