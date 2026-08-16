import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useProducts, useProductCategories } from '../hooks/useWordPress'
import useScrollReveal from '../hooks/useScrollReveal'

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
      <div className="px-5 pb-5">
        <div className="h-10 w-full rounded-lg bg-[color:var(--bg-secondary)]" />
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

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] transition hover:border-[color:var(--border)] hover:shadow-[0_20px_60px_var(--shadow)]">
      <Link to={`/product/${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[color:var(--bg-secondary)] to-[color:var(--bg-card)]">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-24 rounded-full bg-[color:var(--accent-dim)] opacity-30" />
            </div>
          )}
          {onSale && (
            <span className="absolute left-3 top-3 rounded-full bg-red-500 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-white">
              Sleva
            </span>
          )}
        </div>

        <div className="p-5">
          <h3 className="font-display text-lg font-semibold text-[color:var(--text-primary)] transition group-hover:text-[color:var(--accent)]">
            {name}
          </h3>
          {product.short_description && (
            <p
              className="mt-1 line-clamp-2 text-[0.75rem] text-[color:var(--text-muted)]"
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

      <div className="px-5 pb-5">
        <button
          onClick={() => addItem({ id: product.id, name, price, image })}
          className="w-full rounded-lg border border-[color:var(--accent)] bg-transparent py-2.5 text-[0.75rem] font-semibold uppercase tracking-wider text-[color:var(--accent)] transition hover:bg-[color:var(--accent)] hover:text-[#0e0e0e]"
        >
          Přidat do košíku
        </button>
      </div>
    </div>
  )
}

function Products() {
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

  return (
    <div className="min-h-screen bg-[color:var(--bg-primary)] px-8 pb-20 pt-32">
      <div className="mx-auto max-w-[1200px]">
        {/* Header */}
        <div className="reveal mb-12">
          <h1 className="font-display text-[clamp(2rem,4vw,3rem)] font-bold text-[color:var(--text-primary)]">
            Naše produkty
          </h1>
          <p className="mt-2 text-[color:var(--text-secondary)]">
            Profesionální PPF fólie, tónování oken a detailingové produkty
          </p>
        </div>

        {/* Filters */}
        <div className="reveal mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categoriesLoading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-[color:var(--bg-secondary)]" />
                ))}
              </>
            ) : (
              <>
                <button
                  onClick={() => { setSearchParams({}); }}
                  className={`rounded-full px-4 py-2 text-[0.75rem] font-medium transition ${
                    !activeCategory
                      ? 'bg-[color:var(--accent)] text-[#0e0e0e]'
                      : 'border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]'
                  }`}
                >
                  Všechny produkty
                </button>
                {(categories || []).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSearchParams({ category: String(cat.id) })}
                    className={`rounded-full px-4 py-2 text-[0.75rem] font-medium transition ${
                      activeCategory === String(cat.id)
                        ? 'bg-[color:var(--accent)] text-[#0e0e0e]'
                        : 'border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]'
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
            className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] px-4 py-2 text-[0.8rem] text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent)]"
          >
            <option value="featured">Doporučené</option>
            <option value="price-low">Cena: od nejnižší</option>
            <option value="price-high">Cena: od nejvyšší</option>
            <option value="newest">Nejnovější</option>
          </select>
        </div>

        {/* Products grid */}
        {productsLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (products || []).length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(products || []).map((product, index) => (
              <div key={product.id} className={`reveal ${index > 0 ? `reveal-delay-${Math.min(index % 4, 3)}` : ''}`}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--accent-dim)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-[color:var(--accent)]">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-[color:var(--text-primary)]">Zatím žádné produkty</h3>
            <p className="mt-2 text-[color:var(--text-muted)]">
              Produkty se zde zobrazí, jakmile budou přidány do obchodu.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Products
