import BranchCard from './BranchCard'
import SectionHeader from './SectionHeader'
import { ClassicCarIcon, ModernCarIcon } from './icons/CarIcons'

const branches = [
  {
    variant: 'classic',
    badge: 'Est. 1987',
    title: 'Klasika a veteráni',
    location: 'Vinohrady, Praha',
    description:
      'Naše tradiční dílna. Specializujeme se na vozy vyrobené před rokem 1990 — od předválečných klasiků po oblíbené youngtimery. Ručně laděné motory, dobově správné díly a desítky let zkušeností.',
    services: ['Restaurování veteránů', 'Renovace motorů', 'Dobové díly', 'STK klasik', 'Příprava na Concours'],
    linkLabel: 'Prozkoumat klasickou pobočku',
    linkTo: '/branches/classic',
    icon: <ClassicCarIcon />,
  },
  {
    variant: 'modern',
    badge: 'Est. 2019',
    title: 'Premium a sportovní',
    location: 'Smíchov, Praha',
    description:
      'Naše moderní provozovna. Účelově postavená pro prémiové a sportovní vozy po roce 1990 — supersporty, luxusní GT a výkonné stroje. Diagnostika na úrovni továrny a autorizovaný servis.',
    services: ['Servis supersportů', 'Ladění výkonu', 'Tovární diagnostika', 'Záruční opravy', 'Ochrana laku'],
    linkLabel: 'Prozkoumat prémiovou pobočku',
    linkTo: '/branches/premium',
    icon: <ModernCarIcon />,
  },
]

function Branches() {
  return (
    <section id="branches" className="bg-[color:var(--bg-primary)] px-8 py-28">
      <div className="mx-auto max-w-[1100px]">
        <div className="reveal">
          <SectionHeader
            tag="Naše pobočky"
            title="Dvě pobočky, jeden standard"
            description="Každá pobočka se specializuje na jinou éru automobilové dokonalosti — vyberte tu, která odpovídá historii vašeho vozu."
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {branches.map((branch, index) => (
            <div key={branch.title} className={`reveal ${index === 1 ? 'reveal-delay-1' : ''}`}>
              <BranchCard {...branch} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Branches
