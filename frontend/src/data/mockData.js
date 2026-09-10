export const products = [
  { id: 1, name: 'Maize Flour 2kg', category: 'Food & Beverages', price: 2000, stock: 350, unit: 'Pieces' },
  { id: 2, name: 'Cooking Oil 1L', category: 'Food & Beverages', price: 3000, stock: 280, unit: 'Pieces' },
  { id: 3, name: 'Sugar 1kg', category: 'Food & Beverages', price: 2200, stock: 250, unit: 'Pieces' },
  { id: 4, name: 'Detergent 1kg', category: 'Household', price: 2500, stock: 200, unit: 'Pieces' },
  { id: 5, name: 'Tea Leaves 250g', category: 'Food & Beverages', price: 1500, stock: 150, unit: 'Pieces' },
  { id: 6, name: 'Rice 5kg', category: 'Food & Beverages', price: 5500, stock: 180, unit: 'Pieces' },
  { id: 7, name: 'Soap Bar 3-pack', category: 'Household', price: 1800, stock: 320, unit: 'Pieces' },
  { id: 8, name: 'Bread Loaf', category: 'Food & Beverages', price: 1200, stock: 45, unit: 'Pieces' },
  { id: 9, name: 'Milk 1L', category: 'Food & Beverages', price: 1800, stock: 90, unit: 'Pieces' },
  { id: 10, name: 'Notebooks 3-pack', category: 'Stationery', price: 2000, stock: 160, unit: 'Pieces' },
  { id: 11, name: 'Ballpoint Pens 5-pack', category: 'Stationery', price: 1500, stock: 200, unit: 'Pieces' },
  { id: 12, name: 'T-Shirt (Plain)', category: 'Clothing', price: 8000, stock: 75, unit: 'Pieces' },
  { id: 13, name: 'USB Cable', category: 'Electronics', price: 3500, stock: 5, unit: 'Pieces' },
  { id: 14, name: 'Batteries AA 4-pack', category: 'Electronics', price: 2500, stock: 120, unit: 'Pieces' },
  { id: 15, name: 'Toothpaste 100ml', category: 'Household', price: 2000, stock: 180, unit: 'Pieces' },
  { id: 16, name: 'Coffee 200g', category: 'Food & Beverages', price: 3500, stock: 8, unit: 'Pieces' },
]

export const categories = [
  { id: 1, name: 'Food & Beverages', icon: '🛒', count: 8 },
  { id: 2, name: 'Household', icon: '🏠', count: 3 },
  { id: 3, name: 'Electronics', icon: '⚡', count: 2 },
  { id: 4, name: 'Clothing', icon: '👕', count: 1 },
  { id: 5, name: 'Stationery', icon: '📝', count: 2 },
  { id: 6, name: 'Others', icon: '📦', count: 0 },
]

export const orders = [
  { id: 'ORD00128', customer: 'Amina Juma', salesman: 'John Mwinuka', date: '01 Jun 2025', total: 16100, status: 'Completed' },
  { id: 'ORD00127', customer: 'Ali Khetibu', salesman: 'John Mwinuka', date: '01 Jun 2025', total: 24500, status: 'Completed' },
  { id: 'ORD00126', customer: 'Fatma Said', salesman: 'John Mwinuka', date: '01 Jun 2025', total: 8600, status: 'Completed' },
  { id: 'ORD00125', customer: 'John Peter', salesman: 'John Mwinuka', date: '01 Jun 2025', total: 13200, status: 'Completed' },
  { id: 'ORD00124', customer: 'Mary Martia', salesman: 'John Mwinuka', date: '01 Jun 2025', total: 9400, status: 'Completed' },
]

export const salesData = [
  { date: '26 May', sales: 180000 },
  { date: '27 May', sales: 220000 },
  { date: '28 May', sales: 195000 },
  { date: '29 May', sales: 300000 },
  { date: '30 May', sales: 280000 },
  { date: '31 May', sales: 350000 },
  { date: '01 Jun', sales: 210500 },
]

export const dashboardStats = {
  totalProducts: 120,
  totalStock: 860,
  todaySales: 210500,
  totalRevenue: 3450000,
}

export const currentUser = {
  name: 'John Mwinuka',
  role: 'sales_staff',
}
