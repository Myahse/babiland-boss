import { Icon, type IconName } from './Icons'
import type { Spot } from './Quartier'
import { sfx } from './sfx'
import { popText, useArcade } from './store'
import { useTurf } from './turf'

// In the street, in front of a place: what it is, and what you can do there.
const MARKET_PRICE = 400
const ICON: Record<Spot['id'], IconName> = { maquis: 'door', rival0: 'boss', rival1: 'boss', market: 'basket', gare: 'moto' }

export function SpotCard({ spot }: { spot: Spot }) {
  const money = useArcade((s) => s.money)
  const marketOn = useArcade((s) => s.marketUntil > Date.now())
  const act = () => {
    if (spot.id === 'maquis') useArcade.setState({ view: 'maquis' })
    else if (spot.id === 'rival0' || spot.id === 'rival1') useTurf.setState({ panel: true })
    else if (spot.id === 'gare') useArcade.setState({ mapOpen: true })
    else if (spot.id === 'market') {
      const s = useArcade.getState()
      if (s.money < MARKET_PRICE) return
      useArcade.setState({ money: s.money - MARKET_PRICE, marketUntil: Date.now() + 5 * 60 * 1000 })
      sfx.unlock()
      popText('Produits frais : tes réchauds cuisent plus vite pendant 5 minutes')
    }
  }
  const label = spot.id === 'maquis' ? 'Entrer' : spot.id === 'gare' ? 'Prendre un gbaka' : spot.id === 'market' ? (marketOn ? 'Déjà fait' : `Acheter · ${MARKET_PRICE} F`) : 'Voir les quartiers'
  const disabled = spot.id === 'market' && (marketOn || money < MARKET_PRICE)
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[5.2rem] z-20 flex justify-center px-4" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="pop pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border-[3px] border-[var(--color-ink)] bg-[var(--color-cream)] p-2.5 shadow-lg" onPointerDown={(e) => e.stopPropagation()}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white">
          <Icon name={ICON[spot.id]} size={30} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-extrabold">{spot.title}</div>
          <div className="text-[11px] font-semibold opacity-75">{spot.text}</div>
        </div>
        <button className="btn btn-green shrink-0 !px-3 !py-2 !text-sm" disabled={disabled} onClick={act}>
          {label}
        </button>
      </div>
    </div>
  )
}
