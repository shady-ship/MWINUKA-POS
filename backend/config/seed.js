import { getPool, initDb } from './db.js'
import bcrypt from 'bcryptjs'
import { pathToFileURL } from 'url'

async function ensureColumn(pool, table, column, definition) {
  const [cols] = await pool.execute(
    `SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )
  if (cols[0].count === 0) {
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    console.log(`  + added ${table}.${column}`)
  }
}

const seed = async () => {
  let pool
  try {
    pool = getPool()
  } catch (e) {
    await initDb()
    pool = getPool()
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(100) UNIQUE,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'sales_staff',
      active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      price_wholesale DECIMAL(12,2) DEFAULT NULL,
      price_retail DECIMAL(12,2) DEFAULT NULL,
      price_optional DECIMAL(12,2) DEFAULT NULL,
      stock INT DEFAULT 0,
      min_stock INT DEFAULT 20,
      unit VARCHAR(50) DEFAULT NULL,
      active TINYINT(1) DEFAULT 1,
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
      price_type VARCHAR(50) DEFAULT 'Retail',
      unit_price DECIMAL(12,2) NOT NULL,
      total DECIMAL(12,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS product_prices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      unit VARCHAR(20) NOT NULL,
      retail_price DECIMAL(12,2) DEFAULT NULL,
      wholesale_price DECIMAL(12,2) DEFAULT NULL,
      optional_price DECIMAL(12,2) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE KEY uq_product_unit (product_id, unit)
    )
  `)

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT
    )
  `)

  const soldOut = await pool.execute(`SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'price'`)
  const hasOldPrice = soldOut[0][0].count > 0
  if (hasOldPrice) {
    await pool.execute(`ALTER TABLE products CHANGE COLUMN price price_retail DECIMAL(12,2) NULL DEFAULT NULL`)
    await pool.execute(`ALTER TABLE products CHANGE COLUMN price_dozen price_wholesale DECIMAL(12,2) NULL DEFAULT NULL`)
    try {
      await pool.execute(`ALTER TABLE products CHANGE COLUMN price_carton price_optional DECIMAL(12,2) NULL DEFAULT NULL`)
    } catch (e) { }
    console.log('  + migrated old price columns to wholesale/retail/optional')
  }

  await ensureColumn(pool, 'products', 'price_wholesale', 'DECIMAL(12,2) DEFAULT NULL')
  await ensureColumn(pool, 'products', 'price_retail', 'DECIMAL(12,2) DEFAULT NULL')
  await ensureColumn(pool, 'products', 'price_optional', 'DECIMAL(12,2) DEFAULT NULL')
  await ensureColumn(pool, 'products', 'min_stock', 'INT DEFAULT 20')
  await ensureColumn(pool, 'products', 'active', "TINYINT(1) DEFAULT 1")
  await ensureColumn(pool, 'products', 'buy_price', 'DECIMAL(12,2) DEFAULT 0')
  await ensureColumn(pool, 'products', 'pieces_per_carton', 'INT NULL')
  await ensureColumn(pool, 'products', 'dozens_per_carton', 'INT NULL')
  await ensureColumn(pool, 'users', 'username', 'VARCHAR(100) UNIQUE')
  await ensureColumn(pool, 'users', 'active', 'TINYINT(1) DEFAULT 1')
  await ensureColumn(pool, 'order_items', 'price_type', "VARCHAR(50) DEFAULT 'Retail'")

  await pool.execute("UPDATE products SET name = CONCAT('Product ', id) WHERE name IS NULL OR name = ''")
  await pool.execute('UPDATE products SET stock = 0 WHERE stock IS NULL')
  await pool.execute('UPDATE products SET buy_price = 0 WHERE buy_price IS NULL')

  // Migrate product_prices from old single-price schema to matrix (retail/wholesale/optional per unit)
  const [priceColCheck] = await pool.execute(
    `SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='product_prices' AND COLUMN_NAME='price'`
  )
  if (priceColCheck[0].count > 0) {
    // Old schema: (product_id, unit, price, price_type) — read before dropping
    const [oldRows] = await pool.execute('SELECT product_id, unit, price, price_type FROM product_prices')
    await pool.execute('DROP TABLE product_prices')
    await pool.execute(`
      CREATE TABLE product_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        unit VARCHAR(20) NOT NULL,
        retail_price DECIMAL(12,2) DEFAULT NULL,
        wholesale_price DECIMAL(12,2) DEFAULT NULL,
        optional_price DECIMAL(12,2) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY uq_product_unit (product_id, unit)
      )
    `)
    // Merge old single-price rows into matrix rows
    const merged = {}
    for (const r of oldRows) {
      const key = `${r.product_id}|${r.unit}`
      if (!merged[key]) merged[key] = { product_id: r.product_id, unit: r.unit, retail_price: null, wholesale_price: null, optional_price: null }
      const col = r.price_type === 'Retail' ? 'retail_price' : r.price_type === 'Wholesale' ? 'wholesale_price' : 'optional_price'
      merged[key][col] = r.price
    }
    for (const row of Object.values(merged)) {
      await pool.execute(
        'INSERT INTO product_prices (product_id, unit, retail_price, wholesale_price, optional_price) VALUES (?, ?, ?, ?, ?)',
        [row.product_id, row.unit, row.retail_price, row.wholesale_price, row.optional_price]
      )
    }
    console.log(`  + migrated ${oldRows.length} old price rows → ${Object.keys(merged).length} matrix rows`)
  }

  // For fresh installs: populate product_prices from legacy products columns (price_retail/wholesale/optional)
  const [priceCount] = await pool.execute('SELECT COUNT(*) as count FROM product_prices')
  if (priceCount[0].count === 0) {
    await pool.execute(`
      INSERT INTO product_prices (product_id, unit, retail_price, wholesale_price, optional_price)
      SELECT p.id,
             COALESCE(NULLIF(p.unit, ''), 'Piece'),
             p.price_retail,
             p.price_wholesale,
             p.price_optional
      FROM products p
      WHERE (p.price_retail IS NOT NULL AND p.price_retail > 0)
         OR (p.price_wholesale IS NOT NULL AND p.price_wholesale > 0)
         OR (p.price_optional IS NOT NULL AND p.price_optional > 0)
    `)
    console.log('  + migrated legacy products columns → product_prices matrix')
  }

  const [users] = await pool.execute('SELECT COUNT(*) as count FROM users')
  if (users[0].count === 0) {
    const adminPass = bcrypt.hashSync('admin123', 10)
    const staffPass = bcrypt.hashSync('staff123', 10)
    await pool.execute('INSERT INTO users (name, username, email, password, role, active) VALUES (?, ?, ?, ?, ?, 1)', ['Administrator', 'admin', 'admin@mwinuka.co.tz', adminPass, 'admin'])
    await pool.execute('INSERT INTO users (name, username, email, password, role, active) VALUES (?, ?, ?, ?, ?, 1)', ['John Mwinuka', 'john', 'john@mwinuka.co.tz', staffPass, 'sales_staff'])
  }

  console.log('Database seeded successfully!')
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  seed()
    .then(() => { process.exit(0) })
    .catch((e) => { console.error(e); process.exit(1) })
}

export default seed