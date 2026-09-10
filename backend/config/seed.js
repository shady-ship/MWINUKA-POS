import { getPool } from './db.js'
import bcrypt from 'bcryptjs'

const seed = async () => {
  const pool = getPool()

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'sales_staff',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      price DECIMAL(12,2) DEFAULT NULL,
      price_dozen DECIMAL(12,2) DEFAULT NULL,
      price_carton DECIMAL(12,2) DEFAULT NULL,
      stock INT DEFAULT 0,
      unit VARCHAR(50) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_no VARCHAR(50) UNIQUE NOT NULL,
      customer_id INT,
      salesman_id INT,
      total DECIMAL(12,2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      notes TEXT,
      status VARCHAR(50) DEFAULT 'Completed',
      order_date DATE DEFAULT (CURRENT_DATE),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT,
      product_id INT,
      quantity INT NOT NULL,
      unit VARCHAR(50) DEFAULT 'Piece',
      unit_price DECIMAL(12,2) NOT NULL,
      total DECIMAL(12,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `)

  const [users] = await pool.execute('SELECT COUNT(*) as count FROM users')
  if (users[0].count === 0) {
    const adminPass = bcrypt.hashSync('admin123', 10)
    const staffPass = bcrypt.hashSync('staff123', 10)
    await pool.execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Administrator', 'admin@mwinuka.co.tz', adminPass, 'admin'])
    await pool.execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['John Mwinuka', 'john@mwinuka.co.tz', staffPass, 'sales_staff'])
  }

  console.log('Database seeded successfully!')
}

export default seed
