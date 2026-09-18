import { useState, useEffect, useCallback } from 'react'
import { AppContext } from './context'
import { useAuth } from './AuthContext'

const API = 'http://localhost:5000/api'
const TYPE_KEY = { Retail: 'retail_price', Wholesale: 'wholesale_price', Optional: 'optional_price' }
let nextLineId = 1

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

export function AppProvider({ children }) {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [ordersList, setOrdersList] = useState([])
  const [customersList, setCustomersList] = useState([])
  const [usersList, setUsersList] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [auditLogs, setAuditLogs] = useState([])

  const fetchProducts = useCallback(async () => {
    try {
      const includeInactive = user?.role === 'admin' ? '?includeInactive=true' : ''
      const res = await fetch(`${API}/products${includeInactive}`)
      const data = await res.json()
      if (Array.isArray(data)) setProducts(data)
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }, [user])

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/orders`)
      const data = await res.json()
      if (Array.isArray(data)) setOrdersList(data)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/customers`)
      const data = await res.json()
      if (Array.isArray(data)) setCustomersList(data)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/auth/users`)
      const data = await res.json()
      if (Array.isArray(data)) setUsersList(data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/settings`)
      const data = await res.json()
      if (data && typeof data === 'object') setSettings(data)
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }, [])

  const updateSettings = async (entries) => {
    try {
      const res = await fetch(`${API}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update settings')
      setSettings(data)
      return data
    } catch (err) {
      console.error('Failed to update settings:', err)
      throw err
    }
  }

  const fetchAudit = useCallback(async (filters = {}) => {
    try {
      const params = new URLSearchParams()
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.userId) params.set('userId', filters.userId)
      if (filters.search) params.set('search', filters.search)
      const qs = params.toString()
      const res = await fetch(`${API}/audit${qs ? `?${qs}` : ''}`)
      const data = await res.json()
      if (Array.isArray(data)) setAuditLogs(data)
    } catch (err) {
      console.error('Failed to fetch audit:', err)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchOrders()
    fetchCustomers()
    fetchUsers()
    fetchSettings()
  }, [fetchProducts, fetchOrders, fetchCustomers, fetchUsers, fetchSettings])

  const getUnitPrice = (product, unit, type, manualPrice) => {
    const prices = product.prices || []
    const row = prices.find(p => p.unit === unit)
    if (!row) return null
    const col = TYPE_KEY[type] || 'retail_price'
    if (type === 'Optional' && manualPrice) {
      return { unit, price: Number(manualPrice), price_type: type }
    }
    const val = row[col]
    if (val == null) return null
    return { unit, price: Number(val), price_type: type }
  }

  const getAvailableTypes = (prices, unit) => {
    const row = (prices || []).find(p => p.unit === unit)
    if (!row) return []
    return ['Retail', 'Wholesale', 'Optional'].filter(t => row[TYPE_KEY[t]] != null && Number(row[TYPE_KEY[t]]) > 0)
  }

  const getDefaultType = (prices, unit) => {
    const types = getAvailableTypes(prices, unit)
    if (types.includes('Retail')) return 'Retail'
    if (types.includes('Wholesale')) return 'Wholesale'
    return types[0] || 'Retail'
  }

  const getFirstAvailableUnit = (prices) => {
    const row = (prices || []).find(p => p.unit === 'Piece') || (prices || [])[0]
    return row?.unit || null
  }

  const priceOf = (prices, unit, type) => {
    const row = (prices || []).find(p => p.unit === unit)
    if (!row) return 0
    return Number(row[TYPE_KEY[type]]) || 0
  }

  const addProduct = async (product) => {
    try {
      const res = await fetch(`${API}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add product')
      setProducts(prev => [...prev, data])
      await fetchProducts()
      return data
    } catch (err) {
      console.error('Failed to add product:', err)
      throw err
    }
  }

  const updateProduct = async (id, data) => {
    try {
      const res = await fetch(`${API}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated.error || 'Failed to update product')
      setProducts(prev => prev.map(p => p.id === id ? updated : p))
      await fetchProducts()
      return updated
    } catch (err) {
      console.error('Failed to update product:', err)
      throw err
    }
  }

  const deleteProduct = async (id) => {
    try {
      await fetch(`${API}/products/${id}`, { method: 'DELETE' })
      setProducts(prev => prev.filter(p => p.id !== id))
      setCart(prev => prev.filter(item => item.product_id !== id))
      await fetchProducts()
    } catch (err) {
      console.error('Failed to delete product:', err)
    }
  }

  const toggleProductActive = async (id, active) => {
    try {
      await fetch(`${API}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      await fetchProducts()
    } catch (err) {
      console.error('Failed to toggle product:', err)
    }
  }

  const addToCart = (product) => {
    const unit = getFirstAvailableUnit(product.prices)
    if (!unit) return
    const type = getDefaultType(product.prices, unit)
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id && item.selectedUnit === unit && item.selectedPriceType === type)
      if (existing) {
        return prev.map(item => item.lineId === existing.lineId ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, {
        lineId: `L${nextLineId++}`,
        ...product,
        product_id: product.id,
        quantity: 1,
        selectedUnit: unit,
        selectedPriceType: type,
        selectedPrice: priceOf(product.prices, unit, type),
        manualOverride: null,
      }]
    })
  }

  const addPackSplit = (product, cartons, looseQty, looseUnit, priceType) => {
    if (!product || (cartons < 1 && looseQty < 1)) return
    setCart(prev => {
      const lines = []
      if (cartons > 0) {
        const cp = priceOf(product.prices, 'Carton', priceType)
        if (cp > 0) {
          lines.push({
            lineId: `L${nextLineId++}`,
            ...product,
            product_id: product.id,
            quantity: cartons,
            selectedUnit: 'Carton',
            selectedPriceType: priceType,
            selectedPrice: cp,
            manualOverride: null,
          })
        }
      }
      if (looseQty > 0 && looseUnit) {
        const lp = priceOf(product.prices, looseUnit, priceType)
        if (lp > 0) {
          lines.push({
            lineId: `L${nextLineId++}`,
            ...product,
            product_id: product.id,
            quantity: looseQty,
            selectedUnit: looseUnit,
            selectedPriceType: priceType,
            selectedPrice: lp,
            manualOverride: null,
          })
        }
      }
      return [...prev, ...lines]
    })
  }

  const updateCartItemUnit = (lineId, unit) => {
    setCart(prev => prev.map(item => {
      if (item.lineId !== lineId) return item
      const availableTypes = getAvailableTypes(item.prices, unit)
      let type = item.selectedPriceType
      if (!availableTypes.includes(type)) type = getDefaultType(item.prices, unit)
      const price = priceOf(item.prices, unit, type)
      return { ...item, selectedUnit: unit, selectedPriceType: type, selectedPrice: price, manualOverride: null }
    }))
  }

  const updateCartPriceType = (lineId, type) => {
    setCart(prev => prev.map(item => {
      if (item.lineId !== lineId) return item
      const price = priceOf(item.prices, item.selectedUnit, type)
      return { ...item, selectedPriceType: type, selectedPrice: price, manualOverride: null }
    }))
  }

  const updateCartPrice = (lineId, value) => {
    setCart(prev => prev.map(item => {
      if (item.lineId !== lineId) return item
      const num = Number(value) || 0
      const basePrice = priceOf(item.prices, item.selectedUnit, item.selectedPriceType)
      return {
        ...item,
        manualOverride: num > 0 ? num : null,
        selectedPrice: num > 0 ? num : basePrice,
      }
    }))
  }

  const updateCartQuantity = (lineId, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.lineId !== lineId))
    } else {
      setCart(prev =>
        prev.map(item =>
          item.lineId === lineId ? { ...item, quantity } : item
        )
      )
    }
  }

  const removeFromCart = (lineId) => {
    setCart(prev => prev.filter(item => item.lineId !== lineId))
  }

  const clearCart = () => setCart([])

  const placeOrder = async (customerName, salesmanId, paymentMethod, notes) => {
    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit: item.selectedUnit || 'Piece',
        price_type: item.selectedPriceType || 'Retail',
        price: item.selectedPrice || 0,
      }))

      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          salesman_id: salesmanId || user?.id || 1,
          items,
          payment_method: paymentMethod,
          notes,
        }),
      })
      const newOrder = await res.json()
      setCart([])
      await fetchOrders()
      await fetchProducts()
      return newOrder
    } catch (err) {
      console.error('Failed to place order:', err)
    }
  }

  const clearOrders = async () => {
    try {
      await fetch(`${API}/reports/reset-orders`, { method: 'DELETE' })
      setOrdersList([])
    } catch (err) {
      console.error('Failed to clear orders:', err)
    }
  }

  const clearAllData = async () => {
    try {
      await fetch(`${API}/reports/reset-all`, { method: 'DELETE' })
      setProducts([])
      setOrdersList([])
      setCart([])
    } catch (err) {
      console.error('Failed to clear data:', err)
    }
  }

const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await fetch(`${API}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { console.error('Status update failed:', res.status); return false }
      await fetchOrders()
      return true
    } catch (err) {
      console.error('Failed to update order:', err)
      return false
    }
  }

  const markItemsPaid = async (orderId, itemIds) => {
    try {
      const res = await fetch(`${API}/orders/${orderId}/pay-items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: itemIds }),
      })
      if (!res.ok) { console.error('Pay-items failed:', res.status); return false }
      await fetchOrders()
      return true
    } catch (err) {
      console.error('Failed to mark items paid:', err)
      return false
    }
  }

  const deleteOrder = async (orderId) => {
    try {
      await fetch(`${API}/orders/${orderId}`, { method: 'DELETE' })
      await fetchOrders()
    } catch (err) {
      console.error('Failed to delete order:', err)
    }
  }

  const addCustomer = async (customer) => {
    try {
      const res = await fetch(`${API}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      })
      const newC = await res.json()
      setCustomersList(prev => [...prev, newC])
      return newC
    } catch (err) {
      console.error('Failed to add customer:', err)
    }
  }

  const updateCustomer = async (id, data) => {
    try {
      const res = await fetch(`${API}/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const updated = await res.json()
      setCustomersList(prev => prev.map(c => c.id === id ? updated : c))
    } catch (err) {
      console.error('Failed to update customer:', err)
    }
  }

  const deleteCustomer = async (id) => {
    try {
      await fetch(`${API}/customers/${id}`, { method: 'DELETE' })
      setCustomersList(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Failed to delete customer:', err)
    }
  }

  const addUser = async (userData) => {
    try {
      const res = await fetch(`${API}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const data = await res.json()
      if (!res.ok) {
        const err = new Error(data.error || 'Failed to add user')
        err.status = res.status
        throw err
      }
      await fetchUsers()
      return data
    } catch (err) {
      console.error('Failed to add user:', err)
      throw err
    }
  }

  const updateUser = async (id, data) => {
    try {
      const res = await fetch(`${API}/auth/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const resData = await res.json().catch(() => null)
      if (!res.ok) {
        const err = new Error(resData?.error || 'Failed to update user')
        err.status = res.status
        throw err
      }
      await fetchUsers()
      return resData
    } catch (err) {
      console.error('Failed to update user:', err)
      throw err
    }
  }

  const deleteUser = async (id) => {
    try {
      await fetch(`${API}/auth/users/${id}`, { method: 'DELETE' })
      await fetchUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + ((item.selectedPrice || 0) * (Number(item.quantity) || 0)), 0)

  return (
    <AppContext.Provider value={{
      products, addProduct, updateProduct, deleteProduct, toggleProductActive,
      cart, addToCart, addPackSplit, updateCartQuantity, updateCartItemUnit, updateCartPriceType, updateCartPrice, removeFromCart, clearCart, cartTotal,
      placeOrder, ordersList, updateOrderStatus, markItemsPaid, deleteOrder, clearOrders, clearAllData, fetchProducts, fetchOrders,
      customersList, addCustomer, updateCustomer, deleteCustomer, fetchCustomers,
      usersList, addUser, updateUser, deleteUser, fetchUsers,
      settings, updateSettings, fetchSettings,
      auditLogs, fetchAudit,
      getUnitPrice, getAvailableTypes,
    }}>
      {children}
    </AppContext.Provider>
  )
}