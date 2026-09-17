import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, 'pos.db')

const SQL = await initSqlJs()

if (!fs.existsSync(dbPath)) {
  console.log('NO pos.db FOUND at', dbPath)
  process.exit(0)
}

console.log('pos.db size (bytes):', fs.statSync(dbPath).size)

const filebuffer = fs.readFileSync(dbPath)
const db = new SQL.Database(filebuffer)

const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
console.log('\n=== TABLES ===')
console.log(tables[0]?.values.map(r => r[0]).join(', ') || 'none')

const schemas = db.exec("SELECT name, sql FROM sqlite_master WHERE type='table'")
for (const s of schemas[0]?.values || []) {
  console.log('\n=== SCHEMA:', s[0], '===')
  console.log(s[1])
  try {
    const data = db.exec(`SELECT * FROM "${s[0]}"`)
    if (data[0]) {
      console.log('columns:', data[0].columns.join(', '))
      console.log('rows:', data[0].values.length)
      data[0].values.slice(0, 3).forEach(row => console.log('  ', JSON.stringify(row)))
    } else {
      console.log('rows: 0')
    }
  } catch (e) {
    console.log('read error:', e.message)
  }
}

console.log('\n=== COUNTS ===')
const countTables = ['users', 'products', 'customers', 'orders', 'order_items']
for (const t of countTables) {
  try {
    const r = db.exec(`SELECT COUNT(*) FROM "${t}"`)
    console.log(t, '=', r[0]?.values[0][0])
  } catch (e) {
    console.log(t, '= N/A')
  }
}

db.close()
console.log('\nDUMP COMPLETE')