import { PLACES } from './places'
import { useArcade } from './store'
import { ATTACK_PRICE, BETRAY_PRICE, COOLDOWN, CUT, DISTRICTS, DUEL_TARGET, RENT, RENT_EVERY, RESPECT_FOR_BETRAYAL, startDuel, useTurf } from './turf'

const stop = (e: React.PointerEvent) => e.stopPropagation()

/** The small district view of the place you are in: who owns what, betray / attack. */
function TurfPanel({ onClose }: { onClose: () => void }) {
  const place = useArcade((s) => s.current)
  const served = useArcade((s) => s.served)
  const money = useArcade((s) => s.money)
  const owners = useTurf((s) => s.owners[place]) ?? DISTRICTS[place].map(() => 'boss')
  const cooldown = useTurf((s) => s.cooldown)
  const duel = useTurf((s) => s.duel)
  const ds = DISTRICTS[place]
  const free = owners[0] === 'me'

  const act = (i: number) => {
    const price = i === 0 ? BETRAY_PRICE : ATTACK_PRICE(i)
    if (money < price) return
    useArcade.setState({ money: money - price })
    startDuel(place, i, served)
    onClose()
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center bg-black/45 p-3 sm:items-center" onPointerDown={stop} onClick={onClose}>
      <div className="card pop max-h-[88%] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">🏙️ Quartiers de {PLACES[place].name}</h2>
          <button className="text-2xl font-extrabold" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm font-semibold">
          {free
            ? 'Tu es ton propre boss ici. Prends les autres quartiers : chacun te paie un loyer.'
            : `Tu travailles pour ${ds[0].boss} : il garde ${CUT * 100} % de ce que tu gagnes. Gagne du respect, puis trahis-le.`}
        </p>
        {/* the 4 districts as a little 2 x 2 block plan */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ds.map((d, i) => {
            const mine = owners[i] === 'me'
            const canBetray = i === 0 && !mine
            const canAttack = i > 0 && !mine && free
            const price = i === 0 ? BETRAY_PRICE : ATTACK_PRICE(i)
            const respectOk = served >= RESPECT_FOR_BETRAYAL
            return (
              <div key={d.name} className={`rounded-2xl border-[3px] p-2.5 leading-tight ${mine ? 'border-[var(--color-green)] bg-[#d3f9d8]' : 'border-[#c92a2a] bg-[#fff5f5]'}`}>
                <div className="text-sm font-extrabold">
                  {i === 0 && '📍 '}
                  {d.name}
                </div>
                <div className="text-xs font-bold">{mine ? '👑 À toi' : `😎 ${d.boss}`}</div>
                {mine && i > 0 && <div className="text-[11px] font-semibold">+{RENT} F toutes les {RENT_EVERY} s</div>}
                {(canBetray || canAttack) && (
                  <>
                    {canBetray && <div className="mt-1 text-[11px] font-semibold">Respect : {Math.min(served, RESPECT_FOR_BETRAYAL)}/{RESPECT_FOR_BETRAYAL} clients</div>}
                    <button
                      className="btn mt-1.5 w-full !px-2 !py-1 !text-xs"
                      disabled={!!duel || cooldown > 0 || money < price || (canBetray && !respectOk)}
                      onClick={() => act(i)}
                    >
                      {cooldown > 0 ? `Attends ${Math.ceil(cooldown)} s` : `${canBetray ? '🗡️ Trahir' : '⚔️ Attaquer'} · ${price} F`}
                    </button>
                  </>
                )}
                {i > 0 && !mine && !free && <div className="mt-1 text-[11px] font-semibold opacity-70">🔒 Libère d’abord ton quartier</div>}
              </div>
            )
          })}
        </div>
        <div className="mt-3 rounded-xl bg-[#fff3bf] p-2.5 text-xs font-semibold">
          ⚔️ Le duel : sers {DUEL_TARGET} clients avant que les gens du boss en servent autant, en 60 secondes. Si tu perds, tu dois attendre {COOLDOWN} s.
          Bientôt en ligne : les boss seront de vrais joueurs.
        </div>
      </div>
    </div>
  )
}

/** The race bar during a duel, and the result card after it. */
function DuelHud() {
  const duel = useTurf((s) => s.duel)
  const result = useTurf((s) => s.result)
  if (duel) {
    const d = DISTRICTS[duel.place][duel.idx]
    const bar = (v: number, color: string, who: string) => (
      <div className="flex items-center gap-2 text-xs font-extrabold">
        <span className="w-20 truncate">{who}</span>
        <div className="h-4 flex-1 overflow-hidden rounded-full border-2 border-[var(--color-ink)] bg-white">
          <div className="h-full transition-all" style={{ width: `${Math.min(1, v / DUEL_TARGET) * 100}%`, background: color }} />
        </div>
        <span className="w-8 text-right">
          {Math.floor(Math.min(v, DUEL_TARGET))}/{DUEL_TARGET}
        </span>
      </div>
    )
    return (
      <div className="absolute inset-x-3 bottom-4 z-30 flex justify-center" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="card !p-3 w-full max-w-sm space-y-1.5">
          <div className="flex items-center justify-between text-sm font-extrabold">
            <span>⚔️ Duel pour {d.name}</span>
            <span className={duel.left < 10 ? 'text-[#e03131]' : ''}>⏱️ {Math.ceil(duel.left)} s</span>
          </div>
          {bar(duel.mine, 'var(--color-green)', 'Toi')}
          {bar(duel.rival, '#e03131', d.boss)}
        </div>
      </div>
    )
  }
  if (!result) return null
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onPointerDown={stop} onClick={() => useTurf.setState({ result: null })}>
      <div className="card pop w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl">{result.won ? '👑' : '😤'}</div>
        <h2 className="mt-1 text-2xl font-extrabold">{result.won ? `${result.name} est à toi !` : `${result.boss} a gagné`}</h2>
        <p className="mt-1 text-sm font-semibold">
          {result.won ? `${result.boss} est parti. Plus personne ne prend ta part ici.` : 'Ses gens ont servi plus vite. Améliore ton maquis et réessaie.'}
        </p>
        <button className="btn btn-green mt-3 w-full" onClick={() => useTurf.setState({ result: null })}>
          {result.won ? 'C’est doux !' : 'On va voir !'}
        </button>
      </div>
    </div>
  )
}

/** The button and the boss badge (in the left column of the HUD). */
export function TurfButton() {
  const place = useArcade((s) => s.current)
  const owners = useTurf((s) => s.owners[place])
  const boss = owners?.[0] !== 'me' ? DISTRICTS[place][0].boss : null
  return (
    <>
      <button
        className="pointer-events-auto flex items-center gap-1 rounded-2xl border-[3px] border-white bg-[#c92a2a] px-3 py-1.5 text-sm font-extrabold text-white shadow-[0_4px_0_rgba(0,0,0,.2)] active:translate-y-0.5"
        onPointerDown={stop}
        onClick={() => useTurf.setState({ panel: true })}
      >
        🏙️ Quartiers
      </button>
      {boss && <div className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-extrabold text-white">😎 {boss} prend {CUT * 100} %</div>}
    </>
  )
}

/** The panel and the duel display, drawn over the whole screen. */
export function TurfLayer() {
  const open = useTurf((s) => s.panel)
  return (
    <>
      {open && <TurfPanel onClose={() => useTurf.setState({ panel: false })} />}
      <DuelHud />
    </>
  )
}
