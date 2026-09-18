import { Router } from 'express'
import { query } from '../config/db.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { dateFrom, dateTo, userId, search } = req.query
    let sql = `
      SELECT id, user_id, username, role, action, details,
             DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM audit_logs WHERE 1=1
    `
    const params = []
    if (dateFrom) { sql += ' AND DATE(created_at) >= ?'; params.push(dateFrom) }
    if (dateTo) { sql += ' AND DATE(created_at) <= ?'; params.push(dateTo) }
    if (userId) { sql += ' AND user_id = ?'; params.push(userId) }
    if (search) { sql += ' AND (action LIKE ? OR username LIKE ? OR details LIKE ?)'; const s = `%${search}%`; params.push(s, s, s) }
    sql += ' ORDER BY created_at DESC LIMIT 1000'
    const rows = await query(sql, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router