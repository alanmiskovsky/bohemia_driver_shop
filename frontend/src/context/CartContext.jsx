import { createContext, useContext, useReducer, useEffect } from 'react'

const CartContext = createContext(null)

const CART_STORAGE_KEY = 'bohemia_cart'

const initialState = {
  items: [],
  shipping: null,
  total: 0,
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex((item) => item.id === action.payload.id)
      let newItems

      if (existingIndex >= 0) {
        newItems = state.items.map((item, index) =>
          index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        )
      } else {
        newItems = [...state.items, { ...action.payload, quantity: 1 }]
      }

      return {
        ...state,
        items: newItems,
        total: calculateTotal(newItems, state.shipping),
      }
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter((item) => item.id !== action.payload)
      return {
        ...state,
        items: newItems,
        total: calculateTotal(newItems, state.shipping),
      }
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map((item) =>
        item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item
      )
      return {
        ...state,
        items: newItems,
        total: calculateTotal(newItems, state.shipping),
      }
    }

    case 'SET_SHIPPING': {
      return {
        ...state,
        shipping: action.payload,
        total: calculateTotal(state.items, action.payload),
      }
    }

    case 'CLEAR_CART': {
      return initialState
    }

    case 'LOAD_CART': {
      return action.payload
    }

    default:
      return state
  }
}

function calculateTotal(items, shipping) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingCost = shipping?.price || 0
  return subtotal + shippingCost
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        dispatch({ type: 'LOAD_CART', payload: parsed })
      } catch (e) {
        console.error('Failed to load cart:', e)
      }
    }
  }, [])

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const addItem = (item) => dispatch({ type: 'ADD_ITEM', payload: item })
  const removeItem = (id) => dispatch({ type: 'REMOVE_ITEM', payload: id })
  const updateQuantity = (id, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } })
  const setShipping = (shipping) => dispatch({ type: 'SET_SHIPPING', payload: shipping })
  const clearCart = () => dispatch({ type: 'CLEAR_CART' })

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        ...state,
        itemCount,
        addItem,
        removeItem,
        updateQuantity,
        setShipping,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
