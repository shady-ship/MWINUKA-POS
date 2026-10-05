import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb } from './config/db.js'
import { auth } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import reportRoutes from './routes/reports.js'
import customerRoutes from './routes/customers.js'
import settingsRoutes from './routes/settings.js'
import auditRoutes from './routes/audit.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'frontend', 'dist')

app.use(cors())
app.use(express.json())

const PUBLIC_ROUTES = [
  ['POST', '/auth/login'],
  ['GET', '/health'],
]

app.use('/api', (req, res, next) => {
  const isPublic = PUBLIC_ROUTES.some(([method, path]) => method === req.method && (req.path === path || req.path.startsWith(`${path}/`)))
  if (isPublic) return next()
  return auth(req, res, next)
})

async function start() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing. Set it in backend/.env before starting the server.')
  }

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`)
  })
}

start()
