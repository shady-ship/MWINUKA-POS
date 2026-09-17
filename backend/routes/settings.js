import { Router } from 'express'
import { query, execute } from '../config/db.js'

const router = Router()

const DEFAULT_SETTINGS = {
  business_name: 'Mwinuka Enterprises Co Ltd',
  tagline: 'Quality Products, Better Life',
  address: 'Mbeya, Tanzania',
  phone: '0712 345 678',
  email: 'info@mwinuka.co.tz',
  receipt_thankyou: 'Asante sana na karibu tena!',
  receipt_thankyou_en: 'Thank you very much and welcome again!',
  currency: 'TSh',
}

async function getSettings() {
  const rows = await query('SELECT setting_key, setting_value FROM settings')
  const stored = {}
  rows.forEach(r => { stored[r.setting_key] = r.setting_value })
  return { ...DEFAULT_SETTINGS, ...stored }
}

router.get('/', async (req, res) => {
  try {
    res.json(await getSettings())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/', async (req, res) => {
  try {
    const allowed = new Set(Object.keys(DEFAULT_SETTINGS))
    for (const [key, value] of Object.entries(req.body || {})) {
      if (!allowed.has(key)) continue
      const v = String(value ?? '').trim()
      await execute(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
        [key, v]
      )
    }
    res.json(await getSettings())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router