import { Link } from 'react-router-dom'

function BranchCard({ variant, badge, title, location, description, services, linkLabel, linkTo, icon }) {
  const isClassic = variant === 'classic'
  const accentColor = isClassic ? 'var(--branch-classic)' : 'var(--branch-modern)'
  const badgeStyles = isClassic
    ? 'bg-[rgba(184,149,106,0.2)] text-[color:var(--branch-classic)]'
    : 'bg-[rgba(122,156,189,0.2)] text-[color:var(--branch-modern)]'
  const chipStyles = isClassic
    ? 'bg-[rgba(184,149,106,0.08)] border-[rgba(184,149,106,0.15)]'
    : 'bg-[rgba(122,156,189,0.08)] border-[rgba(122,156,189,0.15)]'

  return (
    <div className="group overflow-hidden rounded-[10px] border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] transition hover:-translate-y-1 hover:border-[color:var(--border)] hover:shadow-[0_20px_60px_var(--shadow)]">
      <div className={`branch-visual ${variant} relative flex h-[220px] items-center justify-center overflow-hidden`}>
        <span
          className={`absolute left-4 top-4 rounded-full px-4 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] ${badgeStyles}`}
        >
          {badge}
        </span>
        <div
          className="flex h-[100px] w-[100px] items-center justify-center rounded-full opacity-[0.18] transition group-hover:opacity-[0.28]"
          style={{ backgroundColor: accentColor }}
        >
          <div className="h-[52px] w-[52px] text-white">{icon}</div>
        </div>
      </div>
      <div className="p-7">
        <h3 className="font-display text-2xl font-bold text-[color:var(--text-primary)]">{title}</h3>
        <div className="mt-1 flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-3 w-3 text-[color:var(--accent)]"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {location}
        </div>
        <p className="mt-4 text-[0.82rem] leading-[1.75] text-[color:var(--text-secondary)]">{description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {services.map((service) => (
            <span
              key={service}
              className={`rounded border px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[color:var(--text-secondary)] ${chipStyles}`}
            >
              {service}
            </span>
          ))}
        </div>
        <Link
          to={linkTo || '#'}
          className="mt-6 inline-flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] transition hover:gap-3"
          style={{ color: accentColor }}
        >
          {linkLabel}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

export default BranchCard
