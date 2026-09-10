import { useState, useEffect, useCallback } from 'react'
import { AppContext } from './context'

const API = 'http://localhost:5000/api'

export function AppProvider({ children }) {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [ordersList, setOrdersList] = useState([])
  const [customersList, setCustomersList] = useState([])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/products`)
      const data = await res.json()
      if (Array.isArray(data)) setProducts(data)
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }, [])

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

  useEffect(() => {
    fetchProducts()
    fetchOrders()
    fetchCustomers()
  }, [fetchProducts, fetchOrders, fetchCustomers])

  const addProduct = async (product) => {
    try {
      const res = await fetch(`${API}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      })
      const newP = await res.json()
      setProducts(prev => [...prev, newP])
      return newP
    } catch (err) {
      console.error('Failed to add product:', err)
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
      setProducts(prev => prev.map(p => p.id === id ? updated : p))
    } catch (err) {
      console.error('Failed to update product:', err)
    }
  }

  const deleteProduct = async (id) => {
    try {
      await fetch(`${API}/products/${id}`, { method: 'DELETE' })
      setProducts(prev => prev.filter(p => p.id !== id))
      setCart(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      console.error('Failed to delete product:', err)
    }
  }

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      let selectedUnit = 'Piece'
      let selectedPrice = product.price
      if (!selectedPrice && product.price_dozen) {
        selectedUnit = 'Dozen'
        selectedPrice = product.price_dozen
      } else if (!selectedPrice && product.price_carton) {
        selectedUnit = 'Carton'
        selectedPrice = product.price_carton
      }
      return [...prev, {
        ...product,
        quantity: 1,
        selectedUnit,
        selectedPrice,
        product_id: product.id,
      }]
    })
  }

  const updateCartItemUnit = (productId, selectedUnit) => {
    setCart(prev => prev.map(item => {
      if (item.id !== productId) return item
      let selectedPrice = item.price
      if (selectedUnit === 'Dozen' && item.price_dozen) selectedPrice = item.price_dozen
      else if (selectedUnit === 'Carton' && item.price_carton) selectedPrice = item.price_carton
      else selectedPrice = item.price
      return { ...item, selectedUnit, selectedPrice }
    }))
  }

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== productId))
    } else {
      setCart(prev =>
        prev.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const clearCart = () => setCart([])

  const placeOrder = async (customerName, salesmanName, paymentMethod, notes) => {
    try {
      const items = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit: item.selectedUnit || 'Piece',
        price: item.selectedPrice || item.price,
      }))

      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          salesman_id: 1,
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
      await fetch(`${API}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await fetchOrders()
    } catch (err) {
      console.error('Failed to update order:', err)
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

  const cartTotal = cart.reduce((sum, item) => sum + (item.selectedPrice || item.price) * item.quantity, 0)

  return (
    <AppContext.Provider value={{
      products, addProduct, updateProduct, deleteProduct,
      cart, addToCart, updateCartQuantity, updateCartItemUnit, removeFromCart, clearCart, cartTotal,
      placeOrder, ordersList, updateOrderStatus, deleteOrder, clearOrders, clearAllData, fetchProducts, fetchOrders,
      customersList, addCustomer, updateCustomer, deleteCustomer, fetchCustomers,
    }}>
      {children}
    </AppContext.Provider>
  )
}
