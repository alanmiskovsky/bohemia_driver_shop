/**
 * WooCommerce Store API client (wc/store/v1) – cart & checkout.
 *
 * Manages the `Nonce` (taken from the `Nonce` response header) and the guest
 * `Cart-Token` (persisted in localStorage) and sends both on every request.
 * All cart functions resolve with the full cart object; `checkout()` resolves
 * with the checkout response. Errors are thrown as `Error` instances with
 * `.code`, `.status` and `.data` copied from the WP REST error JSON.
 */

const API_ROOT = import.meta.env.VITE_WP_API_URL || '/wp-json'
export const STORE_API_BASE = `${API_ROOT.replace(/\/$/, '')}/wc/store/v1`

const CART_TOKEN_STORAGE_KEY = 'bohemia_cart_token'

const NONCE_ERROR_CODES = new Set([
  'woocommerce_rest_missing_nonce',
  'woocommerce_rest_invalid_nonce',
  'woocommerce_rest_cookie_invalid_nonce',
  'rest_cookie_invalid_nonce',
])

const TOKEN_ERROR_CODES = new Set([
  'woocommerce_rest_cart_token_invalid',
  'woocommerce_rest_invalid_cart_token',
  'woocommerce_rest_cart_token_expired',
])

let nonce = null
let cartToken = readStoredToken()
let queue = Promise.resolve()

function readStoredToken() {
  try {
    return window.localStorage.getItem(CART_TOKEN_STORAGE_KEY) || null
  } catch {
    return null
  }
}

function persistToken(token) {
  cartToken = token || null
  try {
    if (token) window.localStorage.setItem(CART_TOKEN_STORAGE_KEY, token)
    else window.localStorage.removeItem(CART_TOKEN_STORAGE_KEY)
  } catch {
    // storage unavailable (private mode) – keep the token in memory only
  }
}

const BASIC_ENTITIES = { '&quot;': '"', '&#039;': "'", '&#39;': "'", '&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' }

function decodeEntities(text) {
  if (typeof text !== 'string' || !text.includes('&')) return text
  if (typeof document !== 'undefined') {
    const el = document.createElement('textarea')
    el.innerHTML = text
    return el.value
  }
  return text.replace(/&(quot|#0?39|amp|lt|gt|nbsp);/g, (m) => BASIC_ENTITIES[m] ?? m)
}

/**
 * Build an Error from a WP REST error payload.
 */
export function createStoreError(payload, status) {
  const message = decodeEntities(payload?.message) || 'Požadavek se nezdařil. Zkuste to prosím znovu.'
  const error = new Error(message)
  error.name = 'StoreApiError'
  error.code = payload?.code || (status ? `http_${status}` : 'unknown_error')
  error.status = payload?.data?.status || status || 0
  error.data = payload?.data || null
  // The Store API returns the current cart with some errors (e.g. 409 conflicts)
  if (payload?.data?.cart) error.cart = payload.data.cart
  return error
}

export function isStoreError(err) {
  return err instanceof Error && err.name === 'StoreApiError'
}

function buildHeaders(extra = {}) {
  const headers = { Accept: 'application/json', ...extra }
  if (nonce) headers['Nonce'] = nonce
  if (cartToken) headers['Cart-Token'] = cartToken
  return headers
}

function absorbHeaders(response) {
  const newNonce = response.headers.get('Nonce') || response.headers.get('nonce')
  if (newNonce) nonce = newNonce
  const newToken = response.headers.get('Cart-Token') || response.headers.get('cart-token')
  if (newToken && newToken !== cartToken) persistToken(newToken)
}

async function parseBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { code: 'invalid_json', message: 'Server vrátil neplatnou odpověď.', data: { status: response.status } }
  }
}

async function rawRequest(path, { method = 'GET', body } = {}) {
  const init = {
    method,
    credentials: 'same-origin',
    headers: buildHeaders(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
  }
  if (body !== undefined) init.body = JSON.stringify(body)

  let response
  try {
    response = await fetch(`${STORE_API_BASE}${path}`, init)
  } catch {
    throw createStoreError(
      { code: 'network_error', message: 'Nepodařilo se spojit se serverem. Zkontrolujte připojení k internetu.' },
      0
    )
  }

  absorbHeaders(response)
  const payload = await parseBody(response)

  if (!response.ok) {
    throw createStoreError(payload, response.status)
  }
  return payload
}

/**
 * Fetch the cart directly (also refreshes nonce & cart token).
 */
async function fetchCart() {
  return rawRequest('/cart')
}

/**
 * Make sure we have a nonce before the first mutation.
 */
async function ensureSession() {
  if (!nonce) {
    await fetchCart()
  }
}

function isSessionError(err) {
  if (!isStoreError(err)) return false
  if (NONCE_ERROR_CODES.has(err.code) || TOKEN_ERROR_CODES.has(err.code)) return true
  return (err.status === 401 || err.status === 403) && /nonce|token/i.test(err.code || '')
}

function isTokenError(err) {
  return isStoreError(err) && (TOKEN_ERROR_CODES.has(err.code) || /cart_token/i.test(err.code || ''))
}

/**
 * Perform a request with session bootstrap and a single retry on nonce/token errors.
 */
async function request(path, options = {}) {
  const isMutation = options.method && options.method !== 'GET'
  if (isMutation) await ensureSession()

  try {
    return await rawRequest(path, options)
  } catch (err) {
    if (!isSessionError(err)) throw err
    if (isTokenError(err)) persistToken(null)
    nonce = null
    await fetchCart()
    return rawRequest(path, options)
  }
}

/**
 * Serialize mutations so rapid successive calls (e.g. add-to-cart loops)
 * don't race each other on the server-side session.
 */
function enqueue(task) {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}

function post(path, body) {
  return enqueue(() => request(path, { method: 'POST', body }))
}

/* ─── Public API ─── */

export function getCart() {
  return enqueue(() => request('/cart'))
}

export function addItem(id, quantity = 1, variation = []) {
  const body = { id: Number(id), quantity: Number(quantity) || 1 }
  if (Array.isArray(variation) && variation.length > 0) body.variation = variation
  return post('/cart/add-item', body)
}

export function updateItem(key, quantity) {
  return post('/cart/update-item', { key, quantity: Number(quantity) })
}

export function removeItem(key) {
  return post('/cart/remove-item', { key })
}

export function applyCoupon(code) {
  return post('/cart/apply-coupon', { code: String(code || '').trim() })
}

export function removeCoupon(code) {
  return post('/cart/remove-coupon', { code })
}

export function updateCustomer({ billing_address, shipping_address } = {}) {
  const body = {}
  if (billing_address) body.billing_address = billing_address
  if (shipping_address) body.shipping_address = shipping_address
  return post('/cart/update-customer', body)
}

export function selectShippingRate(packageId, rateId) {
  return post('/cart/select-shipping-rate', { package_id: Number(packageId) || 0, rate_id: rateId })
}

export function updateExtensions(data, namespace = 'bohemia') {
  return post('/cart/extensions', { namespace, data })
}

export function checkout(payload) {
  return post('/checkout', payload)
}

/**
 * Forget the persisted cart token (e.g. after an order is completed and the
 * server responds with a fresh token, or on unrecoverable token errors).
 */
export function resetCartToken() {
  persistToken(null)
  nonce = null
}

export function getCartToken() {
  return cartToken
}

const storeApi = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  applyCoupon,
  removeCoupon,
  updateCustomer,
  selectShippingRate,
  updateExtensions,
  checkout,
  resetCartToken,
  getCartToken,
  isStoreError,
}

export default storeApi
