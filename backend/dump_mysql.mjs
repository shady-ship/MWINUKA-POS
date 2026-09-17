import { createPool } from 'mysql2/promise'

const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mwinuka_pos',
  port: 3306,
})

const [products] = await pool.query('SELECT id, name, price_wholesale, price_retail, price_optional, stock, min_stock, unit, active FROM products ORDER BY id')
console.log('=== PRODUCTS ===')
products.forEach(p => console.log(p.id, '|', p.name, '| W:', p.price_wholesale, 'R:', p.price_retail, 'O:', p.price_optional, '| stock:', p.stock, 'min:', p.min_stock, '| unit:', p.unit, 'active:', p.active))

const [items] = await pool.query('SELECT id, order_id, product_id, quantity, price_type, unit_price, total FROM order_items')
console.log('\n=== ORDER ITEMS (price_type added) ===')
items.forEach(i => console.log(i.id, '| order:', i.order_id, '| product:', i.product_id, '| qty:', i.quantity, '| type:', i.price_type, '| unit:', i.unit_price, '| total:', i.total))

const [users] = await pool.query('SELECT id, name, username, email, role, active FROM users')
console.log('\n=== USERS ===')
users.forEach(u => console.log(u.id, '|', u.name, '|', u.username, '|', u.email, '|', u.role, '| active:', u.active))

await pool.end()