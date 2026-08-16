import SectionHeader from './SectionHeader'
import { DiagnosticsIcon, RestorationIcon, MaintenanceIcon, StorageIcon } from './icons/ServiceIcons'

const services = [
  {
    title: 'Kompletní diagnostika',
    description:
      'Pokročilá elektronická a mechanická diagnostika přizpůsobená pro klasické a prémiové vozy. Rozumíme řeči vašeho auta.',
    icon: <DiagnosticsIcon />,
  },
  {
    title: 'Restaurování',
    description:
      'Od mechanické renovace po kosmetickou dokonalost. Vdechujeme nový život veteránům s autentickou pozorností k detailům.',
    icon: <RestorationIcon />,
  },
  {
    title: 'Pravidelný servis',
    description:
      'Servisní plány navržené speciálně podle stáří, nájezdu a jedinečných požadavků vašeho vozu.',
    icon: <MaintenanceIcon />,
  },
  {
    title: 'Uskladnění a ochrana',
    description:
      'Klimatizované, zabezpečené garážování pro vaše cenné vozy během sezónního odstavení nebo delších období.',
    icon: <StorageIcon />,
  },
]

function Services() {
  return (
    <section id="services" className="bg-[color:var(--bg-secondary)] px-8 py-28">
      <div className="mx-auto max-w-[1100px]">
        <div className="reveal">
          <SectionHeader
            tag="Co nabízíme"
            title="Vytvořeno pro výjimečné"
            description="Každý vůz vypráví příběh. Naši specialisté zajistí, že tento příběh pokračuje s přesností, péčí a skutečnou odborností."
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <div
              key={service.title}
              className={`reveal ${index === 1 ? 'reveal-delay-1' : ''} ${index === 2 ? 'reveal-delay-2' : ''} ${
                index === 3 ? 'reveal-delay-3' : ''
              } relative overflow-hidden rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-card)] p-9 transition before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-[color:var(--accent)] before:opacity-0 before:transition before:content-[''] hover:-translate-y-1 hover:border-[color:var(--border)] hover:bg-[color:var(--bg-card-hover)] hover:shadow-[0_12px_40px_var(--shadow)] hover:before:opacity-100`}
            >
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-[color:var(--accent-dim)] text-[color:var(--accent)]">
                {service.icon}
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-[color:var(--text-primary)]">
                {service.title}
              </h3>
              <p className="text-[0.82rem] leading-[1.7] text-[color:var(--text-secondary)]">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services
