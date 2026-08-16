import { Link } from 'react-router-dom'

function Footer() {
  const footerLinks = [
    {
      title: 'Produkty',
      links: [
        { label: 'Transparentní PPF', href: '/products?category=17' },
        { label: 'Barevné PPF', href: '/products?category=18' },
        { label: 'Okenní fólie', href: '/products?category=19' },
        { label: 'Příslušenství', href: '/products?category=21' },
      ],
    },
    {
      title: 'Firma',
      links: [
        { label: 'O nás', href: '/about' },
        { label: 'Kontakt', href: '/contact' },
        { label: 'Školení', href: '/training' },
        { label: 'Blog', href: '/blog' },
      ],
    },
    {
      title: 'Podpora',
      links: [
        { label: 'Doprava', href: '/shipping' },
        { label: 'Vrácení zboží', href: '/returns' },
        { label: 'Časté dotazy', href: '/faq' },
        { label: 'Sledování zásilky', href: '/track' },
      ],
    },
    {
      title: 'Právní',
      links: [
        { label: 'Ochrana osobních údajů', href: '/privacy' },
        { label: 'Obchodní podmínky', href: '/terms' },
        { label: 'Cookies', href: '/cookies' },
      ],
    },
  ]

  const socialLinks = [
    {
      label: 'Facebook',
      href: 'https://facebook.com',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      ),
    },
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/bohemiadriver.cz/',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      ),
    },
    {
      label: 'YouTube',
      href: 'https://youtube.com',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
        </svg>
      ),
    },
  ]

  return (
    <footer className="bg-[color:var(--bg-secondary)] px-8 pb-8 pt-16">
      <div className="mx-auto max-w-[1200px]">
        {/* Main footer content */}
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand section */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 no-underline">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-[color:var(--accent)] text-[color:var(--accent)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2 L22 8 L22 16 L12 22 L2 16 L2 8 Z" />
                  <path d="M12 6 L12 18 M6 9 L18 15 M18 9 L6 15" />
                </svg>
              </span>
              <span className="font-display text-xl font-bold uppercase tracking-[0.08em] text-[color:var(--text-primary)]">
                Bohemia<span className="text-[color:var(--accent)]">Driver</span>
              </span>
            </Link>
            <p className="mt-4 max-w-[280px] text-[0.8rem] leading-[1.7] text-[color:var(--text-muted)]">
              Prémiové PPF fólie, tónování oken a detailingové produkty. Exkluzivní distributor pro Českou republiku, Slovensko a Polsko.
            </p>

            {/* Payment methods */}
            <div className="mt-6">
              <p className="text-[0.7rem] font-medium uppercase tracking-wider text-[color:var(--text-muted)]">
                Bezpečná platba
              </p>
              <div className="mt-2 flex items-center gap-3">
                {['Visa', 'MC', 'GPay'].map((method) => (
                  <div
                    key={method}
                    className="flex h-8 w-12 items-center justify-center rounded border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] text-[0.6rem] font-medium text-[color:var(--text-muted)]"
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="mb-4 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-[color:var(--text-muted)]">
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-[0.82rem] font-light text-[color:var(--text-secondary)] transition hover:text-[color:var(--accent)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[color:var(--border-subtle)] pt-8 md:flex-row">
          <p className="text-[0.75rem] text-[color:var(--text-muted)]">
            &copy; 2026 Bohemia Driver Shop s.r.o. — Praha, Česká republika
          </p>

          {/* Social links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="text-[color:var(--text-muted)] transition hover:text-[color:var(--accent)]"
              >
                <span className="block h-5 w-5">{social.icon}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
