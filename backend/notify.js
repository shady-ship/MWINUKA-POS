import nodemailer from 'nodemailer'
import { queryOne } from './config/db.js'

let transporter = null
let transporterFor = null

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null
  if (transporter && transporterFor === `${host}|${user}`) return transporter
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    service: process.env.SMTP_SERVICE || undefined,
    auth: { user, pass },
  })
  transporterFor = `${host}|${user}`
  return transporter
}

async function readSetting(key, fallback = '') {
  try {
    const row = await queryOne('SELECT setting_value FROM settings WHERE setting_key = ?', [key])
    return row?.setting_value ?? fallback
  } catch {
    return fallback
  }
}

const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

export function smtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
}

export async function sendTestAlert() {
  const to = (await readSetting('login_alert_email', '')).trim() || (process.env.ALERT_EMAIL || '').trim()
  if (!isEmail(to)) return { sent: false, reason: 'no recipient email set' }
  const transport = getTransporter()
  if (!transport) return { sent: false, reason: 'smtp not configured' }
  const biz = await readSetting('business_name', 'Mwinuka POS')
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || `"${biz}" <${process.env.SMTP_USER}>`,
      to,
      subject: `🔔 ${biz} — test notification`,
      text: `This is a test notification from your ${biz} POS.\n\nLogin alerts are working. You will get one of these every time a user signs in.`,
    })
    return { sent: true, to }
  } catch (err) {
    console.error('[notify] test alert failed:', err.message)
    return { sent: false, reason: err.message }
  }
}

/**
 * Sends a login notification email. Never throws; returns { sent, reason }.
 */
export async function notifyLogin({ user, device, ip }) {
  try {
    const enabled = String(await readSetting('login_alert_enabled', '1')) !== '0'
    if (!enabled) return { sent: false, reason: 'disabled' }

    const to = (await readSetting('login_alert_email', '')).trim() || (process.env.ALERT_EMAIL || '').trim()
    if (!isEmail(to)) return { sent: false, reason: 'no recipient' }

    const transport = getTransporter()
    if (!transport) return { sent: false, reason: 'smtp not configured' }

    const biz = await readSetting('business_name', 'Mwinuka POS')
    const when = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' })
    const roleLabel = user.role === 'admin' ? 'Administrator' : 'Sales Staff'

    await transport.sendMail({
      from: process.env.SMTP_FROM || `"${biz}" <${process.env.SMTP_USER}>`,
      to,
      subject: `🔔 Login alert: ${user.name} signed in`,
      text: [
        `${biz} — LOGIN ALERT`,
        '',
        `User:      ${user.name} (${user.email || user.username})`,
        `Role:      ${roleLabel}`,
        `Device:    ${device?.label || 'Unknown device'}`,
        `Browser:   ${device?.browser || 'Unknown'}`,
        `OS:        ${device?.os || 'Unknown'}`,
        `IP address: ${ip || 'unknown'}`,
        `Time:      ${when} (Dar es Salaam)`,
        '',
        'If you do not recognise this login, sign the user out from',
        'Admin → Devices, and change their password.',
      ].join('\n'),
    })

    return { sent: true }
  } catch (err) {
    console.error('[notify] login email failed:', err.message)
    return { sent: false, reason: err.message }
  }
}