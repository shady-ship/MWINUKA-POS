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

/**
 * Runs `fn` inside a real database transaction.
 *
 * Every statement outside a transaction is auto-committed the moment it runs, so a
 * failure halfway through a multi-statement operation (creating an order, editing its
 * items) would leave the data half-applied. This helper gives `fn` the same
 * query/execute/queryOne API bound to ONE connection, commits when it resolves and
 * rolls back when it throws - so a POS sale either lands completely or not at all.
 *
 *   await withTransaction(async (tx) => {
 *     await tx.execute('INSERT INTO orders ...')
 *     await tx.execute('UPDATE products SET stock = ... WHERE id = ? FOR UPDATE')
 *   })
 */
export async function withTransaction(fn) {
  const conn = await pool.getConnection()
  const tx = {
    query: async (sql, params = []) => {
      const [rows] = await conn.query(sql, params)
      return rows
    },
    execute: async (sql, params = []) => {
      const [result] = await conn.query(sql, params)
      return result
    },
    queryOne: async (sql, params = []) => {
      const [rows] = await conn.query(sql, params)
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    },
  }

  try {
    await conn.beginTransaction()
    const result = await fn(tx)
    await conn.commit()
    return result
  } catch (err) {
    try { await conn.rollback() } catch { /* connection already gone - nothing to undo */ }
    throw err
  } finally {
    conn.release()
  }
}

/**
 * Throws an error that the route layer should answer with `status` (default 400)
 * instead of 500. Lets a business rule fail cleanly from inside a transaction:
 * the rollback still happens, but the client gets "Not enough stock" rather than
 * a server error.
 */
export function badRequest(message, status = 400) {
  const err = new Error(message)
  err.status = status
  return err
}
