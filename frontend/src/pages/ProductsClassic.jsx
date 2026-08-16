import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useProducts, useProductCategories } from '../hooks/useWordPress'

/**
 * VARIANT A — "Classic" layout inspired by shop.jemppf.cz
 * Light themed, sidebar categories, compact product cards, professional/industrial feel
 */

function formatPrice(price) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
  }).format(price)
}

function SidebarSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-gray-200" />
      ))}
    </div>
  )
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded border border-gray-200 bg-white">
      <div className="aspect-[4/3] bg-gray-100" />
      <div className="p-4">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="mt-2 h-3 w-1/3 rounded bg-gray-200" />
        <div className="mt-3 h-5 w-1/2 rounded bg-gray-200" />
        <div className="mt-3 h-9 w-full rounded bg-gray-200" />
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
    <div className="group overflow-hidden rounded border border-gray-200 bg-white transition hover:border-[#f6ab00]/40 hover:shadow-[0_4px_24px_rgba(246,171,0,0.12)]">
      <Link to={`/product/${product.id}`} className="block">
        {/* Image — 4:3 aspect like jemppf */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-16 w-16 text-gray-300">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {onSale && (
              <span className="rounded bg-red-600 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-white">
                Sleva
              </span>
            )}
            {product.is_new && (
              <span className="rounded bg-[#f6ab00] px-2 py-0.5 text-[0.6rem] font-bold uppercase text-black">
                Novinka
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-[0.85rem] font-medium leading-tight text-gray-900 transition group-hover:text-[#f6ab00]">
            {name}
          </h3>
        </Link>

        {/* Stock status */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-[0.7rem] text-green-600">Skladem</span>
        </div>

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-[#d4920a]">{formatPrice(price)}</span>
          {onSale && regularPrice > price && (
            <span className="text-[0.75rem] text-gray-400 line-through">{formatPrice(regularPrice)}</span>
          )}
        </div>
        <p className="text-[0.65rem] text-gray-400">s DPH</p>

        {/* Add to cart */}
        <button
          onClick={() => addItem({ id: product.id, name, price, image })}
          className="mt-3 w-full rounded bg-[#f6ab00] py-2 text-[0.75rem] font-semibold uppercase tracking-wide text-black transition hover:bg-[#e09e00]"
        >
          Do košíku
        </button>
      </div>
    </div>
  )
}

function ProductsClassic() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || ''
  const [sortBy, setSortBy] = useState('featured')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024)

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
    <div className="min-h-screen bg-gray-50 pt-[72px]">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 text-[0.8rem] text-gray-500">
          <Link to="/" className="transition hover:text-[#d4920a]">Domů</Link>
          <span>/</span>
          <Link to="/" className="transition hover:text-[#d4920a]">Produkty</Link>
          {activeCategoryName && (
            <>
              <span>/</span>
              <span className="text-gray-900">{activeCategoryName}</span>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-72px-45px)] max-w-[1400px] gap-0">
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar — overlay on mobile, inline on desktop */}
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'} fixed left-0 top-[72px] z-40 h-[calc(100vh-72px)] w-[260px] border-r border-gray-200 bg-white transition-all duration-300 lg:static lg:z-auto lg:h-auto ${sidebarOpen ? 'lg:w-[260px]' : ''} flex-shrink-0`}>
          <div className="w-[260px] px-5 py-3">
            <h2 className="mb-3 flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-[#d4920a]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              Kategorie
            </h2>

            {categoriesLoading ? (
              <SidebarSkeleton />
            ) : (
              <nav className="space-y-0.5">
                <button
                  onClick={() => { setSearchParams({}); if (window.innerWidth < 1024) setSidebarOpen(false) }}
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-[0.82rem] transition ${
                    !activeCategory
                      ? 'bg-[#f6ab00]/10 font-semibold text-[#d4920a]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span>Všechny produkty</span>
                  {!activeCategory && (
                    <span className="text-[0.65rem] text-[#d4920a]/60">{(products || []).length}</span>
                  )}
                </button>
                {(categories || []).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setSearchParams({ category: String(cat.id) }); if (window.innerWidth < 1024) setSidebarOpen(false) }}
                    className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-[0.82rem] transition ${
                      activeCategory === String(cat.id)
                        ? 'bg-[#f6ab00]/10 font-semibold text-[#d4920a]'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat.count > 0 && (
                      <span className="text-[0.65rem] text-gray-400">{cat.count}</span>
                    )}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {/* Toolbar */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex h-9 w-9 items-center justify-center rounded border border-gray-200 text-gray-500 transition hover:border-[#f6ab00] hover:text-[#d4920a]"
                title="Přepnout kategorie"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                {activeCategoryName || 'Všechny produkty'}
              </h1>
              {!productsLoading && (
                <span className="text-[0.8rem] text-gray-400">
                  ({(products || []).length} {(products || []).length === 1 ? 'produkt' : (products || []).length < 5 ? 'produkty' : 'produktů'})
                </span>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded border border-gray-200 bg-white px-3 py-2 text-[0.8rem] text-gray-600 outline-none focus:border-[#f6ab00]"
            >
              <option value="featured">Doporučené</option>
              <option value="price-low">Cena: od nejnižší</option>
              <option value="price-high">Cena: od nejvyšší</option>
              <option value="newest">Nejnovější</option>
            </select>
          </div>

          {/* Products grid */}
          {productsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (products || []).length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(products || []).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 h-16 w-16 text-gray-300">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Zatím žádné produkty</h3>
              <p className="mt-1 text-[0.85rem] text-gray-500">
                Produkty se zde zobrazí, jakmile budou přidány do obchodu.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default ProductsClassic
