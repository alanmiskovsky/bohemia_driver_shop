import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as storeApi from '../api/storeApi'
import { minorToMajor } from '../utils/price'

const CartContext = createContext(null)

/* ─── Normalizers (Store API → plain major-unit numbers) ─── */

function normalizeItem(item) {
  const unit = item.prices?.currency_minor_unit ?? item.totals?.currency_minor_unit ?? 2
  const image = item.images?.[0]
  return {
    key: item.key,
    id: item.id,
    productId: item.id,
    type: item.type || 'simple',
    name: item.name,
    sku: item.sku || '',
    image: image?.thumbnail || image?.src || null,
    imageFull: image?.src || null,
    price: minorToMajor(item.prices?.price, unit),
    regularPrice: minorToMajor(item.prices?.regular_price, unit),
    salePrice: minorToMajor(item.prices?.sale_price, unit),
    onSale:
      item.prices?.regular_price !== undefined &&
      item.prices?.price !== undefined &&
      Number(item.prices.regular_price) > Number(item.prices.price),
    quantity: Number(item.quantity) || 0,
    lineSubtotal: minorToMajor(item.totals?.line_subtotal, unit),
    lineTotal: minorToMajor(item.totals?.line_total, unit),
    quantityLimits: {
      min: item.quantity_limits?.minimum ?? 1,
      max: item.quantity_limits?.maximum ?? 9999,
      multipleOf: item.quantity_limits?.multiple_of ?? 1,
      editable: item.quantity_limits?.editable !== false,
    },
    lowStockRemaining: item.low_stock_remaining ?? null,
    soldIndividually: !!item.sold_individually,
    variation: Array.isArray(item.variation)
      ? item.variation.map((v) => ({ attribute: v.attribute, value: v.value }))
      : [],
    itemData: Array.isArray(item.item_data) ? item.item_data : [],
    permalink: item.permalink || null,
  }
}

function normalizeTotals(cart) {
  const t = cart?.totals || {}
  const unit = t.currency_minor_unit ?? 2
  const fees = (cart?.fees || []).map((fee) => ({
    id: fee.id,
    key: fee.key,
    name: fee.name,
    total: minorToMajor(fee.totals?.total_price ?? fee.totals?.total, fee.totals?.currency_minor_unit ?? unit),
  }))
  const shippingKnown = t.total_shipping !== null && t.total_shipping !== undefined
  return {
    subtotal: minorToMajor(t.total_items, unit),
    discount: minorToMajor(t.total_discount, unit),
    shipping: shippingKnown ? minorToMajor(t.total_shipping, unit) : null,
    shippingKnown,
    fees,
    feesTotal: minorToMajor(t.total_fees, unit),
    tax: minorToMajor(t.total_tax, unit),
    total: minorToMajor(t.total_price, unit),
    currency: t.currency_code || 'CZK',
  }
}

function normalizeCoupons(cart) {
  return (cart?.coupons || []).map((c) => ({
    code: c.code,
    discountType: c.discount_type,
    discount: minorToMajor(c.totals?.total_discount, c.totals?.currency_minor_unit ?? 2),
  }))
}

function resolveProductId(productOrId) {
  if (productOrId && typeof productOrId === 'object') {
    return productOrId.id ?? productOrId.product_id ?? productOrId.productId
  }
  return productOrId
}

/* ─── Provider ─── */

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const cartRef = useRef(cart)
  cartRef.current = cart
  const seqRef = useRef(0)
  const pendingRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const applyCart = useCallback((next) => {
    if (!mountedRef.current) return
    if (next && typeof next === 'object' && Array.isArray(next.items)) {
      setCart(next)
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const next = await storeApi.getCart()
      applyCart(next)
      if (mountedRef.current) setError(null)
      return next
    } catch (err) {
      if (err?.cart) applyCart(err.cart)
      if (mountedRef.current) setError(err.message)
      throw err
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [applyCart])

  // Initial load
  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  // Re-sync when the tab becomes visible again (cart may have changed in another tab)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && pendingRef.current === 0) {
        refresh().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  /**
   * Run a cart mutation. `optimistic(prevCart)` may return a patched cart to
   * show immediately; on failure the server state is re-fetched (or taken from
   * the error payload) so the UI never stays out of sync.
   */
  const runMutation = useCallback(
    async (fn, optimistic) => {
      const seq = ++seqRef.current
      pendingRef.current += 1
      setBusy(true)
      if (optimistic && cartRef.current) {
        const patched = optimistic(cartRef.current)
        if (patched) setCart(patched)
      }
      try {
        const result = await fn()
        // only the latest mutation is allowed to write the cart (avoids flicker
        // when several quantity updates are queued)
        if (seq === seqRef.current) applyCart(result)
        if (mountedRef.current) setError(null)
        return result
      } catch (err) {
        if (mountedRef.current) setError(err.message)
        if (seq === seqRef.current) {
          if (err.cart) applyCart(err.cart)
          else await storeApi.getCart().then(applyCart).catch(() => {})
        }
        throw err
      } finally {
        pendingRef.current -= 1
        if (mountedRef.current && pendingRef.current === 0) setBusy(false)
      }
    },
    [applyCart]
  )

  /* ─── Actions ─── */

  const addItem = useCallback(
    (productOrId, quantity = 1, variation = []) => {
      const id = resolveProductId(productOrId)
      if (!id) return Promise.reject(new Error('Chybí ID produktu.'))
      const qty = Number(quantity) > 0 ? Number(quantity) : 1
      return runMutation(() => storeApi.addItem(id, qty, variation))
    },
    [runMutation]
  )

  const updateQuantity = useCallback(
    (key, quantity) => {
      const qty = Math.max(0, Math.round(Number(quantity) || 0))
      if (qty === 0) {
        return runMutation(
          () => storeApi.removeItem(key),
          (prev) => ({ ...prev, items: prev.items.filter((i) => i.key !== key) })
        )
      }
      return runMutation(
        () => storeApi.updateItem(key, qty),
        (prev) => ({
          ...prev,
          items: prev.items.map((i) => {
            if (i.key !== key) return i
            const unitPrice = Number(i.prices?.price || 0)
            const line = String(Math.round(unitPrice * qty))
            return { ...i, quantity: qty, totals: { ...i.totals, line_subtotal: line, line_total: line } }
          }),
        })
      )
    },
    [runMutation]
  )

  const removeItem = useCallback(
    (key) =>
      runMutation(
        () => storeApi.removeItem(key),
        (prev) => ({ ...prev, items: prev.items.filter((i) => i.key !== key) })
      ),
    [runMutation]
  )

  const clearCart = useCallback(async () => {
    const keys = (cartRef.current?.items || []).map((i) => i.key)
    if (keys.length === 0) return cartRef.current
    return runMutation(
      async () => {
        let last = null
        for (const key of keys) {
          last = await storeApi.removeItem(key)
        }
        return last
      },
      (prev) => ({ ...prev, items: [] })
    )
  }, [runMutation])

  const applyCoupon = useCallback((code) => runMutation(() => storeApi.applyCoupon(code)), [runMutation])
  const removeCoupon = useCallback((code) => runMutation(() => storeApi.removeCoupon(code)), [runMutation])
  const updateCustomer = useCallback((addr) => runMutation(() => storeApi.updateCustomer(addr)), [runMutation])
  const selectShippingRate = useCallback(
    (packageId, rateId) => runMutation(() => storeApi.selectShippingRate(packageId, rateId)),
    [runMutation]
  )
  const updateExtensions = useCallback((data) => runMutation(() => storeApi.updateExtensions(data)), [runMutation])

  const checkout = useCallback(
    async (payload) => {
      pendingRef.current += 1
      setBusy(true)
      try {
        const response = await storeApi.checkout(payload)
        if (mountedRef.current) setError(null)
        // The server empties the cart after a successful checkout – re-sync quietly.
        storeApi.getCart().then(applyCart).catch(() => {})
        return response
      } catch (err) {
        if (mountedRef.current) setError(err.message)
        if (err.cart) applyCart(err.cart)
        throw err
      } finally {
        pendingRef.current -= 1
        if (mountedRef.current && pendingRef.current === 0) setBusy(false)
      }
    },
    [applyCart]
  )

  const clearError = useCallback(() => setError(null), [])

  /* ─── Derived state ─── */

  const items = useMemo(() => (cart?.items || []).map(normalizeItem), [cart])
  const totals = useMemo(() => normalizeTotals(cart), [cart])
  const coupons = useMemo(() => normalizeCoupons(cart), [cart])
  const itemCount = useMemo(
    () => (cart?.items_count ?? items.reduce((sum, i) => sum + i.quantity, 0)) || 0,
    [cart, items]
  )
  const shippingRates = useMemo(() => cart?.shipping_rates || [], [cart])
  const paymentMethods = useMemo(() => cart?.payment_methods || [], [cart])
  const extensions = cart?.extensions?.bohemia || null

  const value = useMemo(
    () => ({
      cart,
      items,
      itemCount,
      totals,
      coupons,
      shippingRates,
      paymentMethods,
      extensions,
      needsShipping: cart?.needs_shipping ?? true,
      needsPayment: cart?.needs_payment ?? true,
      billingAddress: cart?.billing_address || null,
      shippingAddress: cart?.shipping_address || null,
      loading,
      busy,
      error,
      clearError,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      applyCoupon,
      removeCoupon,
      updateCustomer,
      selectShippingRate,
      updateExtensions,
      checkout,
      refresh,
    }),
    [
      cart,
      items,
      itemCount,
      totals,
      coupons,
      shippingRates,
      paymentMethods,
      extensions,
      loading,
      busy,
      error,
      clearError,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      applyCoupon,
      removeCoupon,
      updateCustomer,
      selectShippingRate,
      updateExtensions,
      checkout,
      refresh,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
