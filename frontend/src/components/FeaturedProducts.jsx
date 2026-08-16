import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useProducts } from '../hooks/useWordPress'

function formatPrice(price) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
  }).format(price)
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)]">
      <div className="aspect-square bg-[color:var(--bg-secondary)]" />
      <div className="p-5">
        <div className="mb-2 h-3 w-20 rounded bg-[color:var(--bg-secondary)]" />
        <div className="h-5 w-3/4 rounded bg-[color:var(--bg-secondary)]" />
        <div className="mt-3 h-6 w-24 rounded bg-[color:var(--bg-secondary)]" />
      </div>
    </div>
  )
}

function ProductCard({ product }) {
  const { addItem } = useCart()

  const price = parseInt(product.prices?.price || 0, 10) / (10 ** (product.prices?.currency_minor_unit || 0))
  const regularPrice = parseInt(product.prices?.regular_price || 0, 10) / (10 ** (product.prices?.currency_minor_unit || 0))
  const onSale = product.on_sale
  const image = product.images?.[0]?.src
  const name = product.name

  const handleAddToCart = (e) => {
    e.preventDefault()
    addItem({ id: product.id, name, price, image })
  }

  return (
    <div className="group relative">
      <Link
        to={`/product/${product.id}`}
        className="block overflow-hidden rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] transition hover:border-[color:var(--border)] hover:shadow-[0_20px_60px_var(--shadow)]"
      >
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[color:var(--bg-secondary)] to-[color:var(--bg-card)]">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-32 rounded-full bg-[color:var(--accent-dim)] opacity-30" />
            </div>
          )}

          {onSale && (
            <span className="absolute left-3 top-3 rounded-full bg-red-500 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-white">
              Sleva
            </span>
          )}

          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/90 to-transparent p-4 transition duration-300 group-hover:translate-y-0">
            <button
              onClick={handleAddToCart}
              className="w-full rounded-lg bg-[color:var(--accent)] py-3 text-[0.75rem] font-semibold uppercase tracking-wider text-[#0e0e0e] transition hover:opacity-90"
            >
              Přidat do košíku
            </button>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-display text-lg font-semibold text-[color:var(--text-primary)] transition group-hover:text-[color:var(--accent)]">
            {name}
          </h3>
          {product.short_description && (
            <p
              className="mt-0.5 line-clamp-1 text-[0.75rem] text-[color:var(--text-muted)]"
              dangerouslySetInnerHTML={{ __html: product.short_description }}
            />
          )}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[color:var(--accent)]">{formatPrice(price)}</span>
            {onSale && regularPrice > price && (
              <span className="text-sm text-[color:var(--text-muted)] line-through">
                {formatPrice(regularPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}

function FeaturedProducts() {
  const { data: products, loading } = useProducts({ per_page: 4 })

  // Don't render the section at all if there are no products and not loading
  if (!loading && (!products || products.length === 0)) return null

  return (
    <section className="bg-[color:var(--bg-primary)] px-8 py-28">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <div className="inline-flex items-center gap-2.5">
              <span className="h-px w-6 bg-[color:var(--accent)]" />
              <span className="text-[0.68rem] font-medium uppercase tracking-[0.22em] text-[color:var(--accent)]">
                Doporučujeme
              </span>
            </div>
            <h2 className="mt-3 font-display text-[clamp(1.9rem,3.5vw,2.7rem)] font-bold text-[color:var(--text-primary)]">
              Nejprodávanější
            </h2>
          </div>
          <Link
            to="/products"
            className="group flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-wider text-[color:var(--accent)] transition hover:gap-3"
          >
            Zobrazit vše
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className={`reveal ${i > 0 ? `reveal-delay-${Math.min(i, 3)}` : ''}`}>
                <ProductCardSkeleton />
              </div>
            ))
          ) : (
            (products || []).map((product, index) => (
              <div key={product.id} className={`reveal ${index > 0 ? `reveal-delay-${Math.min(index, 3)}` : ''}`}>
                <ProductCard product={product} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export default FeaturedProducts
