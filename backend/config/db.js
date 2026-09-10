import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

let pool = null

export async function initDb() {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mwinuka_pos',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })

  const conn = await pool.getConnection()
  console.log('Connected to MySQL database')
  conn.release()
  return pool
}

export function getPool() {
  if (!pool) throw new Error('Database not initialized')
  return pool
}

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params)
  return rows
}

export async function execute(sql, params = []) {
  const [result] = await pool.query(sql, params)
  return result
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}
