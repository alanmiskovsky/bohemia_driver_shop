import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useProducts, useProductCategories } from '../hooks/useWordPress'
import useScrollReveal from '../hooks/useScrollReveal'

/**
 * VARIANT B — "Modern" layout
 * Clean, airy, lots of whitespace, large images, minimal UI, editorial feel
 */

function formatPrice(price) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
  }).format(price)
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] rounded-2xl bg-[color:var(--bg-secondary)]" />
      <div className="mt-4 space-y-2 px-1">
        <div className="h-3 w-16 rounded bg-[color:var(--bg-secondary)]" />
        <div className="h-5 w-3/4 rounded bg-[color:var(--bg-secondary)]" />
        <div className="h-5 w-1/3 rounded bg-[color:var(--bg-secondary)]" />
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
  const category = product.categories?.[0]?.name

  return (
    <div className="group">
      <Link to={`/product/${product.id}`} className="block">
        {/* Image — tall 3:4 ratio, borderless, rounded */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[color:var(--bg-secondary)]">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[color:var(--bg-secondary)] to-[color:var(--bg-card)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="h-20 w-20 text-[color:var(--border)]">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          )}

          {/* Badges */}
          {onSale && (
            <span className="absolute left-4 top-4 rounded-full bg-black/80 px-3 py-1 text-[0.65rem] font-medium tracking-wide text-white backdrop-blur-sm">
              Sleva
            </span>
          )}

          {/* Quick add — appears on hover */}
          <div className="absolute inset-x-4 bottom-4 translate-y-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.preventDefault()
                addItem({ id: product.id, name, price, image })
              }}
              className="w-full rounded-xl bg-white/90 py-3 text-[0.75rem] font-semibold text-black backdrop-blur-md transition hover:bg-white"
            >
              Přidat do košíku
            </button>
          </div>
        </div>
      </Link>

      {/* Info — clean, minimal */}
      <div className="mt-4 px-1">
        {category && (
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            {category}
          </p>
        )}
        <Link to={`/product/${product.id}`}>
          <h3 className="mt-1 text-[0.95rem] font-semibold leading-snug text-[color:var(--text-primary)] transition group-hover:text-[color:var(--accent)]">
            {name}
          </h3>
        </Link>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[0.95rem] font-bold text-[color:var(--text-primary)]">{formatPrice(price)}</span>
          {onSale && regularPrice > price && (
            <span className="text-[0.8rem] text-[color:var(--text-muted)] line-through">{formatPrice(regularPrice)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ProductsModern() {
  useScrollReveal()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || ''
  const [sortBy, setSortBy] = useState('featured')

  const orderMapping = useMemo(() => {
    switch (sortBy) {
      case 'price-low': return { orderby: 'price', order: 'asc' }
      case 'price-high': return { orderby: 'price', order: 'desc' }
      case 'newest': return { orderby: 'date', order: 'desc' }
      default: return {}
    }
  }, [sortBy])

  const productParams = useMemo(() => ({
    per_page: 40,
    ...(activeCategory ? { category: activeCategory } : {}),
    ...orderMapping,
  }), [activeCategory, orderMapping])

  const { data: products, loading: productsLoading } = useProducts(productParams)
  const { data: categories, loading: categoriesLoading } = useProductCategories()

  const activeCategoryName = (categories || []).find((c) => String(c.id) === activeCategory)?.name

  return (
    <div className="min-h-screen bg-[color:var(--bg-primary)] pb-24 pt-[72px]">
      {/* Hero header */}
      <div className="reveal relative overflow-hidden bg-[color:var(--bg-secondary)] px-8 py-16 text-center md:py-24">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-[color:var(--accent)]">
            {activeCategoryName ? 'Kategorie' : 'Kolekce'}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-[1.1] text-[color:var(--text-primary)]">
            {activeCategoryName || 'Všechny produkty'}
          </h1>
          {!productsLoading && (
            <p className="mt-3 text-[0.85rem] text-[color:var(--text-muted)]">
              {(products || []).length} {(products || []).length === 1 ? 'produkt' : (products || []).length < 5 ? 'produkty' : 'produktů'}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1320px] px-8">
        {/* Filter bar */}
        <div className="reveal sticky top-[72px] z-30 -mx-8 border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-primary)]/80 px-8 py-4 backdrop-blur-lg">
          <div className="flex items-center justify-between gap-4">
            {/* Category pills */}
            <div className="scrollbar-none flex gap-2 overflow-x-auto">
              {categoriesLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="h-9 w-20 flex-shrink-0 animate-pulse rounded-full bg-[color:var(--bg-secondary)]" />
                ))
              ) : (
                <>
                  <button
                    onClick={() => setSearchParams({})}
                    className={`flex-shrink-0 rounded-full px-5 py-2 text-[0.78rem] font-medium transition ${
                      !activeCategory
                        ? 'bg-[color:var(--text-primary)] text-[color:var(--bg-primary)]'
                        : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]'
                    }`}
                  >
                    Vše
                  </button>
                  {(categories || []).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSearchParams({ category: String(cat.id) })}
                      className={`flex-shrink-0 rounded-full px-5 py-2 text-[0.78rem] font-medium transition ${
                        activeCategory === String(cat.id)
                          ? 'bg-[color:var(--text-primary)] text-[color:var(--bg-primary)]'
                          : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-secondary)]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-shrink-0 rounded-full border-0 bg-[color:var(--bg-secondary)] px-4 py-2 text-[0.78rem] font-medium text-[color:var(--text-primary)] outline-none"
            >
              <option value="featured">Doporučené</option>
              <option value="price-low">Cena: od nejnižší</option>
              <option value="price-high">Cena: od nejvyšší</option>
              <option value="newest">Nejnovější</option>
            </select>
          </div>
        </div>

        {/* Products grid — 3 columns, generous spacing */}
        <div className="mt-10">
          {productsLoading ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (products || []).length > 0 ? (
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {(products || []).map((product, index) => (
                <div key={product.id} className={`reveal ${index > 0 ? `reveal-delay-${Math.min(index % 3, 2)}` : ''}`}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-24 text-center">
              <div className="mb-6 h-px w-12 bg-[color:var(--border)]" />
              <h3 className="font-display text-2xl font-bold text-[color:var(--text-primary)]">Zatím žádné produkty</h3>
              <p className="mt-2 max-w-[320px] text-[0.85rem] text-[color:var(--text-muted)]">
                Produkty se zde zobrazí, jakmile budou přidány do obchodu.
              </p>
              <Link
                to="/"
                className="mt-6 rounded-full bg-[color:var(--text-primary)] px-6 py-3 text-[0.78rem] font-medium text-[color:var(--bg-primary)] transition hover:opacity-90"
              >
                Zpět na úvod
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductsModern
