import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useCart } from '../context/CartContext'
import useScrolled from '../hooks/useScrolled'

function Navbar() {
  const { theme, toggleTheme, isDark } = useTheme()
  const { itemCount } = useCart()
  const scrolled = useScrolled(40)

  const navBg = isDark ? 'bg-[rgba(14,14,14,0.72)]' : 'bg-[rgba(245,242,236,0.78)]'

  const navLinks = [
    { label: 'Produkty', href: '/' },
    { label: 'Kontakt', href: '/contact' },
  ]

  return (
    <nav
      className={`fixed left-0 top-0 z-50 h-[72px] w-full border-b border-[color:var(--border-subtle)] px-6 transition ${
        scrolled ? 'shadow-[0_2px_24px_rgba(0,0,0,0.25)]' : 'shadow-none'
      } ${navBg} backdrop-blur-[18px] backdrop-saturate-[140%]`}
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between">
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

        <ul className="hidden items-center gap-8 text-[0.78rem] font-medium uppercase tracking-[0.12em] text-[color:var(--text-secondary)] md:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                to={link.href}
                className="relative pb-1 transition hover:text-[color:var(--accent)] after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-[color:var(--accent)] after:transition-all after:duration-300 after:content-[''] hover:after:w-full"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-5">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title="Přepnout motiv"
            className="relative h-[26px] w-12 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)]"
          >
            <span
              className={`absolute left-[2px] top-[2px] flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--accent)] shadow-[0_1px_4px_var(--shadow)] transition ${
                isDark ? '' : 'translate-x-[22px]'
              }`}
            >
              {isDark ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#0e0e0e" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#0e0e0e" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </span>
          </button>

          {/* Cart button */}
          <Link
            to="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] text-[color:var(--text-secondary)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--accent)] text-[0.65rem] font-bold text-[#0e0e0e]">
                {itemCount}
              </span>
            )}
          </Link>

          {/* CTA Button */}
          <Link
            to="/booking"
            className="hidden rounded bg-[color:var(--accent)] px-5 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#0e0e0e] transition hover:-translate-y-0.5 hover:opacity-90 sm:block"
          >
            Objednat servis
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
