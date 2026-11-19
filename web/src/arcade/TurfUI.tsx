import { PLACES } from './places'
import { useArcade } from './store'
import { ATTACK_PRICE, BETRAY_PRICE, COOLDOWN, CUT, DISTRICTS, DUEL_TARGET, RENT, RENT_EVERY, RESPECT_FOR_BETRAYAL, startDuel, useTurf } from './turf'

const stop = (e: React.PointerEvent) => e.stopPropagation()

// A small drawn map of the commune: the 4 districts as areas, the lagoon along the south, roads between them.
// The layout is stylised (the same shapes for every place), not the exact surveyed borders.
const AREAS = [
  { d: 'M70 70 L150 55 L165 120 L95 140 L60 115 Z', label: [110, 95] }, // 0: your home district, in the middle
  { d: 'M10 60 L70 70 L60 115 L95 140 L80 175 L20 165 L5 110 Z', label: [40, 130] }, // 1: west
  { d: 'M150 55 L230 40 L245 100 L200 130 L165 120 Z', label: [200, 85] }, // 2: north-east
  { d: 'M165 120 L200 130 L245 100 L290 120 L280 170 L190 180 L95 140 Z', label: [215, 150] }, // 3: east, by the lagoon
]

function DistrictMap({ names, bosses, owners }: { names: string[]; bosses: string[]; owners: ('me' | 'boss')[] }) {
  return (
    <svg viewBox="0 0 300 215" className="mt-3 w-full rounded-2xl border-[3px] border-[var(--color-ink)] bg-[#e9d8a6]">
      {/* lagoon along the south */}
      <path d="M0 185 Q60 170 120 188 T240 182 T300 178 L300 215 L0 215 Z" fill="#4dabf7" />
      <path d="M0 192 Q60 180 120 196 T240 190 T300 187" fill="none" stroke="#a5d8ff" strokeWidth="2" />
      <text x="250" y="206" fontSize="9" fontWeight="800" fill="#e7f5ff">Lagune</text>
      {AREAS.map((a, i) => {
        const mine = owners[i] === 'me'
        return (
          <g key={i}>
            <path d={a.d} fill={mine ? '#69db7c' : '#ff8787'} stroke="#2b1a12" strokeWidth="2.5" strokeLinejoin="round" />
            <text x={a.label[0]} y={a.label[1]} textAnchor="middle" fontSize="11" fontWeight="800" fill="#2b1a12">
              {names[i]}
            </text>
            <text x={a.label[0]} y={a.label[1] + 12} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#2b1a12">
              {mine ? '👑 À toi' : `😎 ${bosses[i]}`}
            </text>
          </g>
        )
      })}
      {/* main roads */}
      <path d="M0 55 L300 30" stroke="#868e96" strokeWidth="5" strokeLinecap="round" />
      <path d="M0 55 L300 30" stroke="#fff" strokeWidth="1" strokeDasharray="6 5" />
      {/* your maquis */}
      <g transform="translate(110 62)">
        <path d="M0 0 C-9 -12 -9 -22 0 -22 C9 -22 9 -12 0 0 Z" fill="#e8590c" stroke="#fff" strokeWidth="2" />
        <circle cx="0" cy="-15" r="3.5" fill="#fff" />
      </g>
    </svg>
  )
}

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
        <DistrictMap names={ds.map((d) => d.name)} bosses={ds.map((d) => d.boss)} owners={owners} />
        {/* the 4 districts with their actions */}
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
