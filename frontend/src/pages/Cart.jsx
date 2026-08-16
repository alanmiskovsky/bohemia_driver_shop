import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/price'
import CouponForm from '../components/CouponForm'

/* ─── Small pieces ─── */

function Breadcrumb() {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 text-[0.8rem] text-gray-500">
        <Link to="/" className="transition hover:text-[#d4920a]">Domů</Link>
        <span>/</span>
        <span className="text-gray-900">Košík</span>
      </div>
    </div>
  )
}

function CartIcon({ className = 'h-12 w-12' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
    </svg>
  )
}

function ErrorBanner({ message, onClose }) {
  if (!message) return null
  return (
    <div className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[0.88rem] text-red-600">
      <span>{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="text-red-400 transition hover:text-red-600" aria-label="Zavřít">
          ✕
        </button>
      )}
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3" aria-busy="true">
      <div className="space-y-4 lg:col-span-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex animate-pulse gap-4 rounded-lg border border-gray-200 bg-white p-4">
            <div className="h-24 w-24 rounded bg-gray-100" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-4 w-2/3 rounded bg-gray-100" />
              <div className="h-3 w-1/4 rounded bg-gray-100" />
              <div className="h-8 w-32 rounded bg-gray-100" />
            </div>
            <div className="h-5 w-20 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-4 h-5 w-1/2 rounded bg-gray-100" />
        <div className="space-y-3">
          <div className="h-3 rounded bg-gray-100" />
          <div className="h-3 rounded bg-gray-100" />
          <div className="h-3 w-2/3 rounded bg-gray-100" />
        </div>
        <div className="mt-6 h-11 rounded bg-gray-100" />
      </div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="mx-auto max-w-[520px] py-16 text-center">
      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#f6ab00]/10 text-[#d4920a]">
        <CartIcon />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Váš košík je prázdný</h1>
      <p className="mt-2 text-gray-500">Vypadá to, že jste zatím nic nepřidali.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded bg-[#f6ab00] px-8 py-3 text-[0.8rem] font-semibold uppercase tracking-wide text-black transition hover:bg-[#e09e00]"
      >
        Procházet produkty
      </Link>
    </div>
  )
}

/* ─── Quantity control ─── */

function QuantityInput({ item, disabled, onChange }) {
  const { min, max, editable, multipleOf } = item.quantityLimits
  const step = multipleOf || 1
  const [draft, setDraft] = useState(null)
  const value = draft ?? String(item.quantity)

  if (!editable || item.soldIndividually) {
    return <span className="text-[0.85rem] text-gray-600">{item.quantity} ks</span>
  }

  const commit = (raw) => {
    setDraft(null)
    let next = parseInt(raw, 10)
    if (!Number.isFinite(next)) return
    next = Math.max(min, Math.min(max, next))
    if (step > 1) next = Math.max(min, Math.round(next / step) * step)
    if (next !== item.quantity) onChange(next)
  }

  const canDecrease = item.quantity - step >= min
  const canIncrease = item.quantity + step <= max

  return (
    <div className="inline-flex items-center rounded border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => onChange(item.quantity - step)}
        disabled={disabled || !canDecrease}
        className="flex h-9 w-9 items-center justify-center text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Snížit množství"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
        disabled={disabled}
        className="h-9 w-14 border-x border-gray-200 bg-white text-center text-[0.88rem] font-medium text-gray-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Množství"
      />
      <button
        type="button"
        onClick={() => onChange(item.quantity + step)}
        disabled={disabled || !canIncrease}
        className="flex h-9 w-9 items-center justify-center text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Zvýšit množství"
      >
        +
      </button>
    </div>
  )
}

/* ─── Cart line ─── */

function CartLine({ item, busy, onQuantity, onRemove }) {
  const { max } = item.quantityLimits
  const showMax = max < 9999 && item.quantity >= max
  return (
    <div className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <Link
        to={`/product/${item.productId}`}
        className="h-24 w-24 flex-shrink-0 overflow-hidden rounded border border-gray-100 bg-gray-50"
      >
        {item.image ? (
          <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <CartIcon className="h-8 w-8" />
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              to={`/product/${item.productId}`}
              className="block truncate text-[0.95rem] font-semibold text-gray-900 transition hover:text-[#d4920a]"
            >
              {item.name}
            </Link>
            {item.variation.length > 0 && (
              <p className="mt-0.5 text-[0.78rem] text-gray-500">
                {item.variation.map((v) => `${v.attribute}: ${v.value}`).join(', ')}
              </p>
            )}
            {item.sku && <p className="mt-0.5 text-[0.72rem] text-gray-400">Kód: {item.sku}</p>}
            <p className="mt-1 text-[0.82rem] text-gray-500">
              {formatPrice(item.price)} / ks
              {item.onSale && (
                <span className="ml-2 text-[0.75rem] text-gray-400 line-through">{formatPrice(item.regularPrice)}</span>
              )}
            </p>
          </div>
          <span className="flex-shrink-0 text-[1rem] font-bold text-gray-900">{formatPrice(item.lineTotal)}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <QuantityInput item={item} disabled={busy} onChange={(qty) => onQuantity(item.key, qty)} />
            {showMax && <p className="mt-1 text-[0.72rem] text-amber-600">Maximální dostupné množství: {max} ks</p>}
            {item.lowStockRemaining !== null && item.lowStockRemaining > 0 && !showMax && (
              <p className="mt-1 text-[0.72rem] text-amber-600">Skladem posledních {item.lowStockRemaining} ks</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.key)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-[0.8rem] text-gray-500 transition hover:text-red-500 disabled:opacity-50"
          >
            <TrashIcon />
            Odebrat
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ─── */

function Cart() {
  const {
    items,
    itemCount,
    totals,
    coupons,
    loading,
    busy,
    error,
    clearError,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    refresh,
  } = useCart()

  const swallow = (p) => p.catch(() => {})

  return (
    <div className="min-h-screen bg-gray-50 pt-[72px]">
      <Breadcrumb />

      <div className="mx-auto max-w-[1200px] px-6 py-8">
        {loading ? (
          <>
            <h1 className="mb-6 text-2xl font-bold text-gray-900">Košík</h1>
            <CartSkeleton />
          </>
        ) : items.length === 0 ? (
          <>
            <ErrorBanner message={error} onClose={clearError} />
            {error && (
              <div className="mb-6 text-center">
                <button
                  type="button"
                  onClick={() => swallow(refresh())}
                  className="text-[0.85rem] font-medium text-[#d4920a] underline-offset-2 hover:underline"
                >
                  Zkusit načíst znovu
                </button>
              </div>
            )}
            <EmptyCart />
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                Košík <span className="ml-1 text-[1rem] font-normal text-gray-500">({itemCount} {itemCount === 1 ? 'položka' : itemCount < 5 ? 'položky' : 'položek'})</span>
              </h1>
              <Link to="/" className="text-[0.85rem] text-gray-500 transition hover:text-[#d4920a]">
                ← Pokračovat v nákupu
              </Link>
            </div>

            <ErrorBanner message={error} onClose={clearError} />

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Items */}
              <div className={`space-y-4 lg:col-span-2 ${busy ? 'opacity-80 transition' : ''}`}>
                {items.map((item) => (
                  <CartLine
                    key={item.key}
                    item={item}
                    busy={busy}
                    onQuantity={(key, qty) => swallow(updateQuantity(key, qty))}
                    onRemove={(key) => swallow(removeItem(key))}
                  />
                ))}
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <div className="sticky top-[88px] rounded-lg border border-gray-200 bg-white p-5">
                  <h2 className="mb-4 text-[1rem] font-bold text-gray-900">Shrnutí objednávky</h2>

                  <div className="mb-4 border-b border-gray-100 pb-4">
                    <CouponForm coupons={coupons} busy={busy} onApply={applyCoupon} onRemove={removeCoupon} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[0.85rem]">
                      <span className="text-gray-500">Mezisoučet</span>
                      <span className="text-gray-900">{formatPrice(totals.subtotal)}</span>
                    </div>
                    {totals.discount > 0 && (
                      <div className="flex justify-between text-[0.85rem]">
                        <span className="text-gray-500">Sleva</span>
                        <span className="text-green-600">−{formatPrice(totals.discount)}</span>
                      </div>
                    )}
                    {totals.fees.map((fee) => (
                      <div key={fee.key || fee.id || fee.name} className="flex justify-between text-[0.85rem]">
                        <span className="text-gray-500">{fee.name}</span>
                        <span className="text-gray-900">{formatPrice(fee.total)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-[0.85rem]">
                      <span className="text-gray-500">Doprava</span>
                      {totals.shippingKnown ? (
                        <span className={totals.shipping === 0 ? 'text-green-600' : 'text-gray-900'}>
                          {totals.shipping === 0 ? 'Zdarma' : formatPrice(totals.shipping)}
                        </span>
                      ) : (
                        <span className="text-[0.78rem] text-gray-400">spočítá se v pokladně</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between border-t border-gray-200 pt-4">
                    <span className="text-[1rem] font-bold text-gray-900">Celkem</span>
                    <span className="text-[1.25rem] font-bold text-[#d4920a]">{formatPrice(totals.total)}</span>
                  </div>
                  <p className="mt-1 text-right text-[0.72rem] text-gray-400">včetně DPH</p>

                  <Link
                    to="/checkout"
                    aria-disabled={busy}
                    onClick={(e) => busy && e.preventDefault()}
                    className={`mt-5 block w-full rounded bg-[#f6ab00] py-3.5 text-center text-[0.85rem] font-bold uppercase tracking-wide text-black transition hover:bg-[#e09e00] ${
                      busy ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    Pokračovat k pokladně
                  </Link>

                  <Link
                    to="/"
                    className="mt-3 block text-center text-[0.8rem] text-gray-500 transition hover:text-[#d4920a]"
                  >
                    Pokračovat v nákupu
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Cart
