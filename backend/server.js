import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb } from './config/db.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import reportRoutes from './routes/reports.js'
import customerRoutes from './routes/customers.js'
import settingsRoutes from './routes/settings.js'
import auditRoutes from './routes/audit.js'
import { queryOne, execute } from './config/db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'frontend', 'dist')

app.use(cors())
app.use(express.json())

app.use(async (req, res, next) => {
  try {
    const id = req.headers['x-user-id']
    if (id) {
      const u = await queryOne('SELECT id, name, username, role, active FROM users WHERE id = ? AND active = 1', [id])
      const sid = req.headers['x-session-id']
      if (u && sid) {
        const s = await queryOne('SELECT id, user_id, logout_at FROM sessions WHERE id = ? AND user_id = ?', [sid, id])
        if (!s || s.logout_at) {
          return res.status(401).json({ error: 'Session ended. Please log in again.' })
        }
        await execute('UPDATE sessions SET last_seen = NOW() WHERE id = ? AND logout_at IS NULL AND last_seen < NOW() - INTERVAL 1 MINUTE', [sid])
        req.user = u
      } else {
        req.user = u || null
        if (sid && !u) {
          return res.status(401).json({ error: 'Session ended. Please log in again.' })
        }
      }
    }
    next()
  } catch (e) {
    next()
  }
})

async function start() {
  await initDb()

  const { default: seed } = await import('./config/seed.js')
  await seed()

  app.use('/api/auth', authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/reports', reportRoutes)
  app.use('/api/customers', customerRoutes)
  app.use('/api/settings', settingsRoutes)
  app.use('/api/audit', auditRoutes)

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() })
  })

  app.use(express.static(DIST))
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(DIST, 'index.html'))
  })

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start()
