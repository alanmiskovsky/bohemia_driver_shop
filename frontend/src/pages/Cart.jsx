import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

function formatPrice(price) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
  }).format(price)
}

function Cart() {
  const { items, total, itemCount, updateQuantity, removeItem, clearCart } = useCart()

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg-primary)] px-8 pt-[72px]">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[color:var(--accent-dim)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12 text-[color:var(--accent)]">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-[color:var(--text-primary)]">Váš košík je prázdný</h1>
          <p className="mt-2 text-[color:var(--text-secondary)]">Vypadá to, že jste zatím nic nepřidali.</p>
          <Link
            to="/products"
            className="mt-6 inline-block rounded-lg bg-[color:var(--accent)] px-8 py-3 text-[0.8rem] font-semibold uppercase tracking-wider text-[#0e0e0e] transition hover:opacity-90"
          >
            Procházet produkty
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg-primary)] px-8 pb-20 pt-32">
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.5rem)] font-bold text-[color:var(--text-primary)]">
            Nákupní košík
          </h1>
          <button
            onClick={clearCart}
            className="text-[0.8rem] text-[color:var(--text-muted)] transition hover:text-red-400"
          >
            Vyprázdnit košík
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] p-4"
                >
                  {/* Image placeholder */}
                  <div className="h-24 w-24 flex-shrink-0 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#0e0e0e]">
                    <div className="flex h-full items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-[color:var(--accent-dim)] opacity-30" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-[color:var(--text-primary)]">{item.name}</h3>
                      <p className="text-lg font-bold text-[color:var(--accent)]">{formatPrice(item.price)}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="flex h-8 w-8 items-center justify-center rounded border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-[color:var(--text-primary)]">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                        >
                          +
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[0.75rem] text-[color:var(--text-muted)] transition hover:text-red-400"
                      >
                        Odebrat
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] p-6">
              <h2 className="font-display text-xl font-bold text-[color:var(--text-primary)]">Shrnutí objednávky</h2>

              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-[color:var(--text-secondary)]">
                  <span>Mezisoučet ({itemCount} položek)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[color:var(--text-secondary)]">
                  <span>Doprava</span>
                  <span className="text-[color:var(--accent)]">Vypočítáno při platbě</span>
                </div>
              </div>

              <div className="mt-6 border-t border-[color:var(--border-subtle)] pt-6">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-[color:var(--text-primary)]">Celkem</span>
                  <span className="text-[color:var(--accent)]">{formatPrice(subtotal)}</span>
                </div>
              </div>

              <Link
                to="/checkout"
                className="mt-6 block w-full rounded-lg bg-[color:var(--accent)] py-4 text-center text-[0.8rem] font-semibold uppercase tracking-wider text-[#0e0e0e] transition hover:opacity-90"
              >
                Pokračovat k platbě
              </Link>

              <Link
                to="/products"
                className="mt-3 block w-full text-center text-[0.8rem] text-[color:var(--text-secondary)] transition hover:text-[color:var(--accent)]"
              >
                Pokračovat v nákupu
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart
