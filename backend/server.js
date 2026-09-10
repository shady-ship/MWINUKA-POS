import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDb } from './config/db.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import reportRoutes from './routes/reports.js'
import customerRoutes from './routes/customers.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

async function start() {
  await initDb()

  const { default: seed } = await import('./config/seed.js')
  await seed()

  app.use('/api/auth', authRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/orders', orderRoutes)
  app.use('/api/reports', reportRoutes)
  app.use('/api/customers', customerRoutes)

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() })
  })

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start()
