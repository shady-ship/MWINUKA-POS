import { execute } from './db.js'

export async function logAudit(req, action, details = '') {
  try {
    await execute(
      'INSERT INTO audit_logs (user_id, username, role, action, details) VALUES (?, ?, ?, ?, ?)',
      [req.user?.id || null, req.user?.name || 'System', req.user?.role || 'system', action, String(details || '').slice(0, 2000)]
    )
  } catch (e) {
    console.error('audit log failed:', e.message)
  }
}

export function parseModules(value) {
  if (!value) return []
  const list = Array.isArray(value) ? value : String(value).split(',')
  return [...new Set(list.map(v => String(v).trim()).filter(Boolean))]
}