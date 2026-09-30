import jwt from 'jsonwebtoken'
import { queryOne, execute } from '../config/db.js'

export const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Authentication required' })

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    const u = await queryOne('SELECT id, name, username, role, active, admin_modules, allow_manual_price FROM users WHERE id = ? AND active = 1', [decoded.id])
    if (!u) return res.status(401).json({ error: 'Account disabled or not found' })

    const sid = req.headers['x-session-id']
    if (!sid) return res.status(401).json({ error: 'Session required. Please log in again.' })

    const s = await queryOne('SELECT id, user_id, logout_at FROM sessions WHERE id = ? AND user_id = ?', [sid, u.id])
    if (!s || s.logout_at) return res.status(401).json({ error: 'Session ended. Please log in again.' })

    await execute('UPDATE sessions SET last_seen = NOW() WHERE id = ? AND logout_at IS NULL AND last_seen < NOW() - INTERVAL 1 MINUTE', [sid]).catch(() => {})

    req.user = { id: u.id, name: u.name, username: u.username, role: u.role, admin_modules: u.admin_modules, allow_manual_price: u.allow_manual_price }
    next()
  } catch {
    res.status(401).json({ error: 'Authentication required' })
  }
}

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}