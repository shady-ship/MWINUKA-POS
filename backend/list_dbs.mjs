import { createPool } from 'mysql2/promise'

const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  port: 3306,
  connectionLimit: 3,
})

const [dbs] = await pool.query('SHOW DATABASES')
console.log('DATABASES:', dbs.map(d => Object.values(d)[0]).join(', '))

for (const db of dbs) {
  const name = Object.values(db)[0]
  if (['information_schema', 'performance_schema', 'mysql', 'sys'].includes(name)) continue
  try {
    const [tables] = await pool.query(`SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`, [name])
    console.log(`\n=== DB: ${name} ===`)
    console.log('tables:', tables.length)
    for (const t of tables) {
      console.log(' ', t.TABLE_NAME, '~rows:', t.TABLE_ROWS)
    }
  } catch (e) {
    console.log(name, 'error', e.message)
  }
}

await pool.end()