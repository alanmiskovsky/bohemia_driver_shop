import { useState, useMemo, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useProduct, useProducts } from '../hooks/useWordPress'

function formatPrice(price) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
  }).format(price)
}

/* ─── Skeleton ─── */

function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pt-[72px]">
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2">
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="aspect-square animate-pulse rounded-lg bg-gray-200" />
            <div className="mt-3 flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 w-16 animate-pulse rounded bg-gray-200" />
              ))}
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-20 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Related Product Card (inline, matches ProductsClassic card style) ─── */

function RelatedProductCard({ product }) {
  const { addItem } = useCart()

  const price = parseInt(product.prices?.price || 0, 10) / (10 ** (product.prices?.currency_minor_unit || 0))
  const regularPrice = parseInt(product.prices?.regular_price || 0, 10) / (10 ** (product.prices?.currency_minor_unit || 0))
  const onSale = product.on_sale
  const image = product.images?.[0]?.src
  const name = product.name

  return (
    <div className="group overflow-hidden rounded border border-gray-200 bg-white transition hover:border-[#f6ab00]/40 hover:shadow-[0_4px_24px_rgba(246,171,0,0.12)]">
      <Link to={`/product/${product.id}`} className="block">
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
          {onSale && (
            <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-white">
              Sleva
            </span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-[0.85rem] font-medium leading-tight text-gray-900 transition group-hover:text-[#f6ab00]">
            {name}
          </h3>
        </Link>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-[#d4920a]">{formatPrice(price)}</span>
          {onSale && regularPrice > price && (
            <span className="text-[0.75rem] text-gray-400 line-through">{formatPrice(regularPrice)}</span>
          )}
        </div>
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

/* ─── Main Component ─── */

function ProductDetail() {
  const { id } = useParams()
  const { data: product, loading, error } = useProduct(id)
  const { addItem } = useCart()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState('description')
  const [added, setAdded] = useState(false)

  // Reset state when product changes
  useEffect(() => {
    setSelectedImage(0)
    setQuantity(1)
    setAdded(false)
    setActiveTab('description')
    window.scrollTo(0, 0)
  }, [id])

  // Related products — fetch from same category
  const categoryId = product?.categories?.[0]?.id
  const relatedParams = useMemo(() => {
    if (!categoryId) return null
    return { per_page: 5, category: String(categoryId) }
  }, [categoryId])

  const { data: relatedRaw } = useProducts(relatedParams || {})

  const relatedProducts = useMemo(() => {
    if (!relatedRaw || !product) return []
    return relatedRaw.filter((p) => p.id !== product.id).slice(0, 4)
  }, [relatedRaw, product])

  if (loading) return <ProductDetailSkeleton />

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 pt-[72px]">
        <div className="flex flex-col items-center px-6 py-32 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#f6ab00]/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-[#d4920a]">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Produkt nenalezen</h2>
          <p className="mt-2 text-gray-500">
            {error || 'Tento produkt byl pravděpodobně odstraněn nebo neexistuje.'}
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded bg-[#f6ab00] px-6 py-3 text-[0.75rem] font-semibold uppercase tracking-wider text-black transition hover:bg-[#e09e00]"
          >
            Zpět na produkty
          </Link>
        </div>
      </div>
    )
  }

  const price = parseInt(product.prices?.price || 0, 10) / (10 ** (product.prices?.currency_minor_unit || 0))
  const regularPrice = parseInt(product.prices?.regular_price || 0, 10) / (10 ** (product.prices?.currency_minor_unit || 0))
  const onSale = product.on_sale
  const images = product.images || []
  const categories = product.categories || []
  const attributes = product.attributes || []
  const sku = product.sku || ''

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price,
        image: images[0]?.src,
      })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const hasDescription = !!product.description
  const hasAttributes = attributes.length > 0
  const tabs = []
  if (hasDescription) tabs.push({ key: 'description', label: 'Popis' })
  if (hasAttributes) tabs.push({ key: 'attributes', label: 'Další informace' })

  return (
    <div className="min-h-screen bg-gray-50 pt-[72px]">
      {/* Breadcrumb bar */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 text-[0.8rem] text-gray-500">
          <Link to="/" className="transition hover:text-[#d4920a]">Domů</Link>
          <span>/</span>
          <Link to="/" className="transition hover:text-[#d4920a]">Produkty</Link>
          {categories[0] && (
            <>
              <span>/</span>
              <Link
                to={`/?category=${categories[0].id}`}
                className="transition hover:text-[#d4920a]"
              >
                {categories[0].name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>
      </div>

      {/* Main product section */}
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* ── Left: Image Gallery ── */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-white">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]?.src}
                  alt={images[selectedImage]?.alt || product.name}
                  className="h-full w-full object-contain p-6"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-24 w-24 text-gray-200">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              )}
              {onSale && (
                <span className="absolute left-3 top-3 rounded bg-red-600 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white">
                  Sleva
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={img.id || i}
                    onClick={() => setSelectedImage(i)}
                    className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded border-2 bg-white transition ${
                      selectedImage === i
                        ? 'border-[#f6ab00]'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={img.src} alt={img.alt || ''} className="h-full w-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Product Info ── */}
          <div className="pt-2">
            {/* Categories */}
            {categories.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/?category=${cat.id}`}
                    className="text-[0.7rem] font-medium uppercase tracking-wider text-[#d4920a] transition hover:text-[#b8820a]"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Name */}
            <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-bold leading-tight text-gray-900">
              {product.name}
            </h1>

            {/* SKU */}
            {sku && (
              <p className="mt-1 text-[0.75rem] text-gray-400">SKU: {sku}</p>
            )}

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[#d4920a]">{formatPrice(price)}</span>
              {onSale && regularPrice > price && (
                <span className="text-lg text-gray-400 line-through">{formatPrice(regularPrice)}</span>
              )}
            </div>
            <p className="mt-0.5 text-[0.7rem] text-gray-400">s DPH</p>

            {/* Stock */}
            <div className="mt-3 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[0.8rem] font-medium text-green-600">Skladem</span>
            </div>

            {/* Short description */}
            {product.short_description && (
              <div
                className="mt-5 text-[0.88rem] leading-relaxed text-gray-600 [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: product.short_description }}
              />
            )}

            {/* Divider */}
            <div className="my-6 border-t border-gray-200" />

            {/* Quantity + Add to cart */}
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded border border-gray-200">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-11 w-11 items-center justify-center text-lg text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
                >
                  −
                </button>
                <span className="flex h-11 w-12 items-center justify-center border-x border-gray-200 text-[0.9rem] font-medium text-gray-900">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-11 w-11 items-center justify-center text-lg text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={added}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded text-[0.8rem] font-semibold uppercase tracking-wide transition ${
                  added
                    ? 'bg-green-500 text-white'
                    : 'bg-[#f6ab00] text-black hover:bg-[#e09e00]'
                }`}
              >
                {added ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Přidáno!
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    Do košíku
                  </>
                )}
              </button>
            </div>

            {/* Trust indicators */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1.5 rounded border border-gray-100 bg-gray-50/50 px-2 py-3 text-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-gray-400">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span className="text-[0.65rem] leading-tight text-gray-500">Rychlé doručení</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded border border-gray-100 bg-gray-50/50 px-2 py-3 text-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-gray-400">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-[0.65rem] leading-tight text-gray-500">Bezpečná platba</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded border border-gray-100 bg-gray-50/50 px-2 py-3 text-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-gray-400">
                  <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
                  <path d="M12 8v4l3 3" />
                </svg>
                <span className="text-[0.65rem] leading-tight text-gray-500">14 dní na vrácení</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs Section ── */}
        {tabs.length > 0 && (
          <div className="mt-12">
            {/* Tab headers */}
            <div className="flex gap-0 border-b border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-6 py-3 text-[0.85rem] font-medium transition ${
                    activeTab === tab.key
                      ? 'text-[#d4920a]'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f6ab00]" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="rounded-b-lg border border-t-0 border-gray-200 bg-white p-6 lg:p-8">
              {activeTab === 'description' && hasDescription && (
                <div
                  className="prose prose-sm max-w-none text-gray-600 prose-headings:text-gray-900 prose-a:text-[#d4920a] prose-strong:text-gray-900 [&_p]:mb-3 [&_li]:text-gray-600"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}

              {activeTab === 'attributes' && hasAttributes && (
                <table className="w-full text-[0.88rem]">
                  <tbody>
                    {attributes.map((attr) => (
                      <tr key={attr.id || attr.name} className="border-b border-gray-100 last:border-0">
                        <td className="w-1/3 py-3 pr-4 font-medium text-gray-900">{attr.name}</td>
                        <td className="py-3 text-gray-600">
                          {attr.terms?.map((t) => t.name).join(', ') || attr.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Related Products ── */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Mohlo by se vám líbit</h2>
              {categories[0] && (
                <Link
                  to={`/?category=${categories[0].id}`}
                  className="text-[0.8rem] font-medium text-[#d4920a] transition hover:text-[#b8820a]"
                >
                  Zobrazit vše &rarr;
                </Link>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((p) => (
                <RelatedProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductDetail
