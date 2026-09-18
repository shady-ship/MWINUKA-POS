import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDb } from './config/db.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import reportRoutes from './routes/reports.js'
import customerRoutes from './routes/customers.js'
import settingsRoutes from './routes/settings.js'
import auditRoutes from './routes/audit.js'
import { queryOne } from './config/db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.use(async (req, res, next) => {
  try {
    const id = req.headers['x-user-id']
    if (id) {
      const u = await queryOne('SELECT id, name, username, role, active FROM users WHERE id = ? AND active = 1', [id])
      req.user = u || null
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

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start()
