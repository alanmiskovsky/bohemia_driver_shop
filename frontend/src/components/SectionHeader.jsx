function SectionHeader({ tag, title, description, centered = true }) {
  return (
    <div className={`mb-16 ${centered ? 'text-center' : ''}`}>
      <div className={`inline-flex items-center gap-2.5 ${centered ? 'justify-center' : ''}`}>
        <span className="h-px w-6 bg-[color:var(--accent)]" />
        <span className="text-[0.68rem] font-medium tracking-[0.22em] uppercase text-[color:var(--accent)]">
          {tag}
        </span>
      </div>
      <h2 className="mt-3 font-display text-[clamp(1.9rem,3.5vw,2.7rem)] font-bold text-[color:var(--text-primary)]">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-4 max-w-[540px] text-[0.9rem] font-light leading-[1.8] text-[color:var(--text-secondary)]">
          {description}
        </p>
      ) : null}
    </div>
  )
}

export default SectionHeader
