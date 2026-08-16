import { Link } from 'react-router-dom'
import SectionHeader from './SectionHeader'
import { useProductCategories } from '../hooks/useWordPress'

function CategorySkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)]">
      <div className="h-48 bg-[color:var(--bg-secondary)]" />
      <div className="p-6">
        <div className="h-5 w-3/4 rounded bg-[color:var(--bg-secondary)]" />
        <div className="mt-3 h-4 w-full rounded bg-[color:var(--bg-secondary)]" />
        <div className="mt-4 h-4 w-24 rounded bg-[color:var(--bg-secondary)]" />
      </div>
    </div>
  )
}

function FeaturedCategories() {
  const { data: categories, loading } = useProductCategories()

  // Don't render if no categories and not loading
  if (!loading && (!categories || categories.length === 0)) return null

  return (
    <section id="products" className="bg-[color:var(--bg-secondary)] px-8 py-28">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal">
          <SectionHeader
            tag="Naše produkty"
            title="Prémiová ochrana"
            description="Profesionální fólie a nástroje, kterým důvěřují instalatéři po celé Evropě. Kvalita, která mluví sama za sebe."
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className={`reveal ${i > 0 ? `reveal-delay-${Math.min(i, 3)}` : ''}`}>
                <CategorySkeleton />
              </div>
            ))
          ) : (
            (categories || []).map((cat, index) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className={`reveal ${index > 0 ? `reveal-delay-${Math.min(index, 3)}` : ''} group relative overflow-hidden rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] transition hover:-translate-y-2 hover:border-[color:var(--accent)] hover:shadow-[0_20px_60px_var(--shadow)]`}
              >
                <div className="relative h-48 overflow-hidden">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--accent-dim)] to-transparent opacity-60" />
                      <div className="absolute inset-0 bg-[color:var(--bg-card)] opacity-40 transition group-hover:opacity-20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--accent-dim)] transition group-hover:scale-110">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-[color:var(--accent)]">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M3 9h18M9 21V9" />
                          </svg>
                        </div>
                      </div>
                    </>
                  )}

                  {cat.count > 0 && (
                    <span className="absolute right-3 top-3 rounded-full bg-[color:var(--accent)] px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-[#0e0e0e]">
                      {cat.count} {cat.count === 1 ? 'produkt' : cat.count < 5 ? 'produkty' : 'produktů'}
                    </span>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="font-display text-xl font-semibold text-[color:var(--text-primary)] transition group-hover:text-[color:var(--accent)]">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="mt-2 text-[0.8rem] leading-relaxed text-[color:var(--text-secondary)]">
                      {cat.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-wider text-[color:var(--accent)]">
                    <span>Zobrazit</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 transition group-hover:translate-x-1">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export default FeaturedCategories
