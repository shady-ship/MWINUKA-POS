import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, execute, queryOne } from '../config/db.js'
import { logAudit, parseModules } from '../config/audit.js'
import { adminOnly } from '../middleware/auth.js'
import { notifyLogin, smtpConfigured } from '../notify.js'

const router = Router()

const clientIp = (req) => {
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return String(fwd).split(',')[0].trim()
  return req.socket?.remoteAddress || req.ip || ''
}

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

    const device = req.body.device || {}
    let sessionId = null
    try {
      const r = await execute(
        'INSERT INTO sessions (user_id, device_label, browser, os, ip) VALUES (?, ?, ?, ?, ?)',
        [user.id, device.label || device.browser || 'Device', device.browser || '', device.os || '', clientIp(req)]
      )
      sessionId = r.insertId
    } catch (e) { }

    await logAudit(req, 'auth.login', `${user.name} logged in${device.label ? ` from ${device.label}` : ''}`)

    notifyLogin({
      user: { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role },
      device,
      ip: clientIp(req),
    }).catch(() => {})

    res.json({
      token,
      session_id: sessionId,
      alertConfigured: smtpConfigured(),
      user: { id: user.id, name: user.name, role: user.role, username: user.username, admin_modules: parseModules(user.admin_modules).join(','), allow_manual_price: user.allow_manual_price ? 1 : 0 },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/me', async (req, res) => {
  try {
    const u = await queryOne('SELECT id, name, username, role, active, admin_modules, allow_manual_price FROM users WHERE id = ? AND active = 1', [req.user?.id])
    if (!u) return res.status(401).json({ error: 'Account disabled or not found' })
    res.json({
      id: u.id,
      name: u.name,
      role: u.role,
      username: u.username,
      admin_modules: parseModules(u.admin_modules).join(','),
      allow_manual_price: u.allow_manual_price ? 1 : 0,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/logout', async (req, res) => {
  try {
    const { sessionId } = req.body
    if (sessionId) {
      await execute('UPDATE sessions SET logout_at = NOW() WHERE id = ? AND logout_at IS NULL', [sessionId])
    }
    if (req.user) await logAudit(req, 'auth.logout', `${req.user.name} logged out`)
    res.json({ message: 'Logged out' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/ping', async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.headers['x-session-id']
    const userId = req.headers['x-user-id']
    if (sessionId && userId) {
      await execute('UPDATE sessions SET last_seen = NOW() WHERE id = ? AND user_id = ? AND logout_at IS NULL', [sessionId, userId])
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/sessions', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const sessions = await query(
      `SELECT s.id, s.user_id, u.name, u.role, s.device_label, s.browser, s.os, s.ip,
              s.login_at, s.last_seen, s.logout_at,
              CASE WHEN s.logout_at IS NULL THEN 1 ELSE 0 END AS active
       FROM sessions s LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.login_at DESC`
    )
    const now = Date.now()
    const online = sessions.filter(s => !s.logout_at && now - new Date(s.last_seen).getTime() <= 120000).length
    const active = sessions.filter(s => !s.logout_at).length
    res.json({ sessions, counts: { online, active, total: sessions.length } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/sessions/:id/revoke', async (req, res) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const { id } = req.params
    const session = await queryOne('SELECT s.id, u.name, s.device_label FROM sessions s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?', [id])
    if (!session) return res.status(404).json({ error: 'Session not found' })
    await execute('UPDATE sessions SET logout_at = NOW() WHERE id = ? AND logout_at IS NULL', [id])
    await logAudit(req, 'auth.session_revoke', `Signed out ${session.name || 'user'} session (${session.device_label || 'device'})`)
    res.json({ message: 'Session signed out' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/users', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT id, name, username, email, role, admin_modules, allow_manual_price, active, created_at FROM users ORDER BY id')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/users', adminOnly, async (req, res) => {
  try {
    const { name, username, email, password, role, admin_modules, allow_manual_price } = req.body
    if (!name || !password) return res.status(400).json({ error: 'Name and password are required' })
    if (!username && !email) return res.status(400).json({ error: 'Username or email is required' })
    const existing = await queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username || null, email || `${username || name}@mwinuka.co.tz`])
    if (existing) return res.status(400).json({ error: 'Username already exists, choose a different one' })
    const hash = bcrypt.hashSync(password, 10)
    const result = await execute(
      'INSERT INTO users (name, username, email, password, role, active, admin_modules, allow_manual_price) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      [name, username || null, email || `${username || name}@mwinuka.co.tz`, hash, role || 'sales_staff', parseModules(admin_modules).join(','), allow_manual_price ? 1 : 0]
    )
    await logAudit(req, 'user.add', `Added user ${name} (${role || 'sales_staff'})`)
    res.status(201).json({ id: result.insertId, name, username, email, role: role || 'sales_staff', active: 1, admin_modules: parseModules(admin_modules).join(','), allow_manual_price: allow_manual_price ? 1 : 0 })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already exists, choose a different one' })
    }
    res.status(500).json({ error: err.message })
  }
})

router.put('/users/:id', async (req, res) => {
  try {
    const { name, username, email, password, role, active, admin_modules, allow_manual_price } = req.body
    const targetId = Number(req.params.id)
    const isAdmin = req.user?.role === 'admin'
    if (!isAdmin && req.user?.id !== targetId) return res.status(403).json({ error: 'Admin access required' })
    if (!isAdmin && (role !== undefined || active !== undefined || admin_modules !== undefined || allow_manual_price !== undefined)) {
      return res.status(403).json({ error: 'Only an admin can change role and access permissions' })
    }

    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id])
    if (!user) return res.status(404).json({ error: 'User not found' })

    const updates = []
    const params = []
    if (name !== undefined) { updates.push('name=?'); params.push(name) }
    if (username !== undefined) { updates.push('username=?'); params.push(username) }
    if (email !== undefined) { updates.push('email=?'); params.push(email) }
    if (role !== undefined) { updates.push('role=?'); params.push(role) }
    if (active !== undefined) { updates.push('active=?'); params.push(active ? 1 : 0) }
    if (admin_modules !== undefined) { updates.push('admin_modules=?'); params.push(parseModules(admin_modules).join(',')) }
    if (allow_manual_price !== undefined) { updates.push('allow_manual_price=?'); params.push(allow_manual_price ? 1 : 0) }
    if (password) {
      updates.push('password=?')
      params.push(bcrypt.hashSync(password, 10))
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' })
    params.push(req.params.id)
    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id=?`, params)
    await logAudit(req, 'user.update', `Updated user ${name || user.name}${role !== undefined ? ` (role: ${role})` : ''}${admin_modules !== undefined ? ` (modules: ${parseModules(admin_modules).join(',') || 'none'})` : ''}`)
    const updated = await queryOne('SELECT id, name, username, email, role, active, admin_modules, allow_manual_price FROM users WHERE id = ?', [req.params.id])
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
    const { currentPassword, newPassword } = req.body
    const isAdmin = req.user?.role === 'admin'
    const userId = isAdmin && req.body.userId ? Number(req.body.userId) : req.user?.id
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId])
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (!bcrypt.compareSync(currentPassword || '', user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' })
    }
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }
    await execute('UPDATE users SET password=? WHERE id=?', [bcrypt.hashSync(String(newPassword), 10), userId])
    await logAudit(req, 'auth.password_change', `${user.name} changed password`)
    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, name FROM users WHERE id = ?', [req.params.id])
    await execute('DELETE FROM users WHERE id = ?', [req.params.id])
    if (user) await logAudit(req, 'user.delete', `Deleted user ${user.name}`)
    res.json({ message: 'User deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/register', adminOnly, async (req, res) => {
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