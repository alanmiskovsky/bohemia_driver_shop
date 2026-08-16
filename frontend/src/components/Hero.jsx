import { Link } from 'react-router-dom'

function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden px-8 py-32">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0e0e0e] via-[#141414] to-[#1a1512]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(201,169,110,0.15)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(201,169,110,0.08)_0%,transparent_40%)]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(201,169,110,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(201,169,110,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Floating elements */}
      <div className="absolute right-[10%] top-[20%] h-64 w-64 rounded-full bg-[color:var(--accent)] opacity-[0.03] blur-3xl" />
      <div className="absolute bottom-[20%] left-[5%] h-48 w-48 rounded-full bg-[color:var(--accent)] opacity-[0.05] blur-2xl" />

      <div className="relative z-10 mx-auto max-w-[1200px] w-full">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Text content */}
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--accent-dim)] px-4 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--accent)]" />
              <span className="text-[0.7rem] font-medium uppercase tracking-[0.15em] text-[color:var(--accent)]">
                Prémiové ochranné fólie
              </span>
            </div>

            <h1 className="font-display text-[clamp(2.8rem,6vw,4.5rem)] font-bold leading-[1.05] text-[color:var(--text-primary)]">
              Chraňte to,
              <br />
              <span className="text-[color:var(--accent)]">na čem záleží</span>
            </h1>

            <p className="mt-6 max-w-[480px] text-[1rem] font-light leading-[1.8] text-[color:var(--text-secondary)]">
              Profesionální PPF fólie, tónování oken a detailingové produkty.
              Důvěřují nám instalatéři v Česku, na Slovensku i v Polsku.
            </p>

            {/* Stats */}
            <div className="mt-10 flex flex-wrap gap-8">
              {[
                { value: '10+', label: 'Let zkušeností' },
                { value: '500+', label: 'Produktů' },
                { value: '24h', label: 'Rychlé doručení' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-display text-3xl font-bold text-[color:var(--accent)]">{stat.value}</div>
                  <div className="mt-1 text-[0.7rem] uppercase tracking-wider text-[color:var(--text-muted)]">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/products"
                className="group relative overflow-hidden rounded-lg bg-[color:var(--accent)] px-8 py-4 text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-[#0e0e0e] transition hover:-translate-y-0.5"
              >
                <span className="relative z-10">Nakupovat</span>
                <div className="absolute inset-0 -translate-x-full bg-white/20 transition duration-300 group-hover:translate-x-0" />
              </Link>
              <Link
                to="/about"
                className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-8 py-4 text-[0.8rem] font-medium uppercase tracking-[0.12em] text-[color:var(--text-primary)] transition hover:-translate-y-0.5 hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                </svg>
                Přehrát video
              </Link>
            </div>
          </div>

          {/* Visual element - Product showcase */}
          <div className="relative hidden lg:block">
            <div className="relative">
              {/* Main product card */}
              <div className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
                <div className="aspect-square rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0e0e0e] p-8">
                  <div className="flex h-full items-center justify-center">
                    <div className="h-40 w-40 rounded-full bg-[color:var(--accent-dim)] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="h-20 w-20 text-[color:var(--accent)]">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[color:var(--accent)]">Doporučujeme</span>
                  <h3 className="mt-1 font-display text-2xl font-bold text-[color:var(--text-primary)]">Prémiová TPU fólie</h3>
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Samohojící, křišťálově čistá ochrana</p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[color:var(--accent)]">2 490 Kč</span>
                    <span className="text-sm text-[color:var(--text-muted)] line-through">2 990 Kč</span>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -right-4 -top-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-green-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[0.65rem] text-[color:var(--text-muted)]">Skladem</div>
                    <div className="text-sm font-semibold text-[color:var(--text-primary)]">Připraveno k odeslání</div>
                  </div>
                </div>
              </div>

              {/* Floating reviews */}
              <div className="absolute -bottom-6 -left-6 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-card)] px-5 py-4 shadow-xl">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-[color:var(--accent)]">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
                <div className="mt-1 text-sm font-semibold text-[color:var(--text-primary)]">500+ hodnocení</div>
                <div className="text-[0.65rem] text-[color:var(--text-muted)]">Důvěřují nám profesionálové</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
