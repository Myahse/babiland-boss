import { useState } from 'react'
import type { PlaceId } from './places'
import { PLACES } from './places'
import { useArcade } from './store'
import { RealMap } from './RealMap'
import { RoundButton } from './HudButton'
import { Icon } from './Icons'
import { Commune3D } from './Commune3D'
import { ATTACK_PRICE, BETRAY_PRICE, canAttack, REAL_MAP, COOLDOWN, CUT, DISTRICTS, DUEL_TARGET, gridOf, ownersOf, RENT, RENT_EVERY, RESPECT_FOR_BETRAYAL, startDuel, useTurf, DEFEND_TARGET, SHIELD, GUARD_MAX, GUARD_PRICE, GUARD_SLOW, hireGuards, keyOf, bossName, rivalOf } from './turf'

const stop = (e: React.PointerEvent) => e.stopPropagation()

// The big map of the place you are in (full screen): its districts as areas coloured by owner, the key zones ⭐
// and their bonus, your maquis. Tap a district to see its boss and betray / attack it.
// The districts are placed roughly where they really are, on a grid (not the exact surveyed borders).

const W = 400
const H = 560
const TOP = 30
const BOTTOM = 470 // the lagoon starts below

/** Corner points of the map grid, nudged a little so the borders don't look like a chessboard. */
function corners(cols: number, rows: number) {
  const pts: [number, number][][] = []
  for (let r = 0; r <= rows; r++) {
    pts.push([])
    for (let c = 0; c <= cols; c++) {
      const edgeX = c === 0 || c === cols
      const edgeY = r === 0 || r === rows
      const jx = edgeX ? 0 : Math.sin(r * 2.3 + c * 1.7) * 22
      const jy = edgeY ? Math.sin(c * 2.1 + r) * 10 : Math.cos(r * 1.9 + c * 2.7) * 20
      pts[r].push([12 + (c / cols) * (W - 24) + jx, TOP + (r / rows) * (BOTTOM - TOP) + jy])
    }
  }
  return pts
}

function BigMap({ place, owners, selected, onPick }: { place: PlaceId; owners: ('me' | 'boss')[]; selected: number; onPick: (i: number) => void }) {
  const [cols, rows] = gridOf(place)
  const P = corners(cols, rows)
  const ds = DISTRICTS[place]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      <rect width={W} height={H} fill="#e9d8a6" />
      {/* the lagoon along the south */}
      <path d={`M0 ${BOTTOM + 25} Q80 ${BOTTOM + 5} 160 ${BOTTOM + 28} T320 ${BOTTOM + 20} T400 ${BOTTOM + 12} L400 ${H} L0 ${H} Z`} fill="#4dabf7" />
      <path d={`M0 ${BOTTOM + 38} Q80 ${BOTTOM + 20} 160 ${BOTTOM + 42} T320 ${BOTTOM + 34} T400 ${BOTTOM + 28}`} fill="none" stroke="#a5d8ff" strokeWidth="3" />
      <text x="300" y={H - 22} fontSize="15" fontWeight="800" fill="#e7f5ff">Lagune Ébrié</text>
      {ds.map((d, i) => {
        const [c, r] = d.cell
        const poly = [P[r][c], P[r][c + 1], P[r + 1][c + 1], P[r + 1][c]]
        const cx = poly.reduce((n, p) => n + p[0], 0) / 4
        const cy = poly.reduce((n, p) => n + p[1], 0) / 4
        const mine = owners[i] === 'me'
        const open = !d.forest && (i === 0 ? !mine : canAttack(place, i, owners))
        const fill = d.forest ? '#2f9e44' : mine ? '#69db7c' : '#ff8787'
        return (
          <g key={d.name} onClick={() => !d.forest && onPick(i)} style={{ cursor: d.forest ? 'default' : 'pointer' }}>
            <path d={`M${poly.map((p) => p.join(' ')).join(' L')} Z`} fill={fill} stroke={selected === i ? '#fff' : '#2b1a12'} strokeWidth={selected === i ? 6 : 3} strokeLinejoin="round" />
            {d.forest &&
              [0, 1, 2, 3, 4].map((k) => <circle key={k} cx={cx - 40 + k * 20} cy={cy + Math.sin(k * 2) * 18} r="13" fill="#2b8a3e" stroke="#1b5e20" strokeWidth="2" />)}
            {d.bonus && (
              <>
                <circle cx={cx} cy={cy - 30} r="17" fill="#ffd43b" stroke="#2b1a12" strokeWidth="2.5" />
                <Icon name={d.bonus.icon} size={22} x={cx - 11} y={cy - 41} />
              </>
            )}
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="15" fontWeight="800" fill={d.forest ? '#fff' : '#2b1a12'} stroke="#fff" strokeWidth={d.forest ? 0 : 3} paintOrder="stroke">
              {d.name}
            </text>
            {!d.forest && (
              <text x={cx} y={cy + 22} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#2b1a12">
                {mine ? 'À toi' : rivalOf(place, i) ? `${bossName(place, i)} (joueur)` : d.boss}
              </text>
            )}
            {open && (
              <text x={cx} y={cy + 40} textAnchor="middle" fontSize="11" fontWeight="800" fill="#c92a2a">
                {i === 0 ? 'à trahir' : 'attaquable'}
              </text>
            )}
          </g>
        )
      })}
      {/* your maquis */}
      {(() => {
        const [c, r] = ds[0].cell
        const x = (P[r][c][0] + P[r][c + 1][0]) / 2 + 30
        const y = (P[r][c][1] + P[r + 1][c][1]) / 2 - 10
        return (
          <g transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }}>
            <path d="M0 0 C-12 -16 -12 -30 0 -30 C12 -30 12 -16 0 0 Z" fill="#e8590c" stroke="#fff" strokeWidth="2.5" />
            <circle cx="0" cy="-20" r="5" fill="#fff" />
          </g>
        )
      })()}
    </svg>
  )
}

/** Full-screen map of the districts, with the card of the district you tapped. */
function TurfPanel({ onClose }: { onClose: () => void }) {
  const place = useArcade((s) => s.current)
  const served = useArcade((s) => s.served)
  const money = useArcade((s) => s.money)
  useTurf((s) => s.owners) // re-render when owners change
  const owners = ownersOf(place)
  const cooldown = useTurf((s) => s.cooldown)
  const duel = useTurf((s) => s.duel)
  const ds = DISTRICTS[place]
  const free = owners[0] === 'me'
  const [sel, setSel] = useState(free ? -1 : 0)
  const [view, setView] = useState<'3d' | 'map'>('3d')
  const d = sel >= 0 ? ds[sel] : null
  const mine = sel >= 0 && owners[sel] === 'me'
  const price = sel === 0 ? BETRAY_PRICE : sel > 0 ? ATTACK_PRICE(place, sel) : 0
  const respectOk = served >= RESPECT_FOR_BETRAYAL
  const canGo = sel === 0 ? !mine && respectOk : sel > 0 && canAttack(place, sel, owners)
  const shield = useTurf((s) => (sel >= 0 ? (s.shields[keyOf(place, sel)] ?? 0) : 0))
  const guards = useTurf((s) => (sel >= 0 ? (s.guards[keyOf(place, sel)] ?? 0) : 0))

  const act = () => {
    if (money < price || !canGo) return
    useArcade.setState({ money: money - price })
    startDuel(place, sel, served, price)
    onClose()
  }
  const keys = ds.filter((x) => x.bonus)
  const ownedKeys = ds.filter((x, i) => x.bonus && owners[i] === 'me').length

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col bg-[#e9d8a6]" onPointerDown={stop}>
      <div className="flex items-center justify-between bg-[var(--color-cream)] px-3 py-2 shadow" style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
        <div>
          <h2 className="text-xl leading-tight font-extrabold"><Icon name="city" size={22} className="mr-1 -mt-1 align-middle" />{PLACES[place].name}</h2>
          <div className="text-xs font-bold">
            {owners.filter((o, i) => o === 'me' && !ds[i].forest).length}/{ds.filter((x) => !x.forest).length} quartiers
            {keys.length > 0 && ` · ${ownedKeys}/${keys.length} zones clés`}
          </div>
        </div>
        {REAL_MAP.includes(place) && (
          <button className="ml-auto mr-2 rounded-xl bg-white px-3 py-2 text-sm font-extrabold shadow" onClick={() => setView(view === '3d' ? 'map' : '3d')}>
            {view === '3d' ? 'Vraie carte' : 'Vue 3D'}
          </button>
        )}
        <button className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xl font-extrabold shadow" onClick={onClose} aria-label="Fermer">
          <Icon name="cross" size={22} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {!REAL_MAP.includes(place) ? (
          <BigMap place={place} owners={owners} selected={sel} onPick={setSel} />
        ) : view === '3d' ? (
          <Commune3D place={place} owners={owners} selected={sel} onPick={setSel} />
        ) : (
          <RealMap place={place} owners={owners} selected={sel} onPick={setSel} />
        )}
      </div>
      <div className="bg-[var(--color-cream)] p-3 shadow-[0_-4px_12px_rgba(0,0,0,.15)]" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {!d ? (
          <p className="text-sm font-bold">
            {free ? 'Touche un quartier voisin des tiens pour l’attaquer. Les zones clés (en jaune) donnent un bonus.' : `Tu travailles pour ${bossName(place, 0)} : il garde ${CUT * 100} % de tes gains. Touche ton quartier pour le trahir.`}
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-lg font-extrabold">
                {sel === 0 && <Icon name="pin" size={20} className="mr-1 -mt-1 align-middle" />}
                {d.name}
              </div>
              <div className="text-sm font-bold">{mine ? 'À toi' : rivalOf(place, sel) ? `${bossName(place, sel)} · un vrai joueur${rivalOf(place, sel)!.online ? ' · en ligne' : ''}` : d.boss}</div>
              {d.bonus && (
                <div className="text-xs font-bold text-[#e8590c]">
                  <Icon name={d.bonus.icon} size={18} className="mr-1 -mt-0.5 align-middle" />{d.bonus.label}
                </div>
              )}
              {mine && sel > 0 && <div className="text-xs font-semibold">Loyer : +{RENT} F toutes les {RENT_EVERY} s</div>}
              {mine && sel > 0 && shield > 0 && <div className="text-xs font-bold text-[#1c7ed6]">Protégé encore {Math.ceil(shield)} s</div>}
              {mine && sel > 0 && <div className="text-xs font-semibold">Gros bras : niveau {guards}/{GUARD_MAX} (attaquants ralentis de {guards * GUARD_SLOW * 100} %)</div>}
              {sel === 0 && !mine && <div className="text-xs font-semibold">Respect : {Math.min(served, RESPECT_FOR_BETRAYAL)}/{RESPECT_FOR_BETRAYAL} clients servis</div>}
              {sel > 0 && !mine && !canGo && <div className="text-xs font-semibold opacity-75">{free ? 'Prends d’abord un quartier voisin' : 'Libère d’abord ton quartier'}</div>}
            </div>
            {mine && sel > 0 && guards < GUARD_MAX && (
              <button
                className="btn btn-green shrink-0 !px-3 !py-2 !text-sm"
                disabled={money < GUARD_PRICE(guards)}
                onClick={() => {
                  const price = hireGuards(place, sel, money)
                  if (price) useArcade.setState({ money: money - price })
                }}
              >
                Gros bras · {GUARD_PRICE(guards)} F
              </button>
            )}
            {!mine && (
              <button className="btn shrink-0 !px-3 !py-2 !text-sm" disabled={!!duel || cooldown > 0 || money < price || !canGo} onClick={act}>
                {cooldown > 0 ? `Attends ${Math.ceil(cooldown)} s` : `${sel === 0 ? 'Trahir' : 'Attaquer'} · ${price} F`}
              </button>
            )}
          </div>
        )}
        {REAL_MAP.includes(place) && <div className="mt-1 text-[10px] opacity-60">Carte et quartiers : © OpenStreetMap (contributeurs){import.meta.env.VITE_MAPBOX_TOKEN ? ' · © Mapbox' : ''}</div>}
        <div className="mt-2 text-[11px] font-semibold opacity-80">
          Duel : sers {DUEL_TARGET} clients avant les gens du boss, en 60 s. Défaite : attends {COOLDOWN} s.
        </div>
      </div>
    </div>
  )
}

/** The race bar during a duel, and the result card after it. */
function DuelHud() {
  const duel = useTurf((s) => s.duel)
  const result = useTurf((s) => s.result)
  const conquering = useTurf((s) => s.conquest)
  const incoming = useTurf((s) => s.incoming)
  if (incoming) {
    const d = DISTRICTS[incoming.place][incoming.idx]
    const boss = DISTRICTS[incoming.place][incoming.attacker].boss
    return (
      <div className="pointer-events-none absolute inset-x-3 top-1/3 z-30 flex justify-center">
        <div className="pop w-full max-w-sm animate-pulse rounded-3xl border-[3px] border-white bg-[#e03131] p-4 text-center text-white shadow-2xl">
          <div className="flex justify-center"><Icon name="warning" size={40} /></div>
          <div className="text-xl leading-tight font-extrabold">
            {boss} attaque {d.name} !
          </div>
          <div className="mt-1 text-sm font-bold">Défends-toi dans {Math.ceil(incoming.warn)} s : sers {DEFEND_TARGET} clients ou tiens jusqu’à la fin.</div>
        </div>
      </div>
    )
  }
  if (duel) {
    const d = DISTRICTS[duel.place][duel.idx]
    const enemy = duel.online?.by ?? (duel.defend ? DISTRICTS[duel.place][duel.attacker ?? 0].boss : bossName(duel.place, duel.idx))
    const bar = (v: number, max: number, color: string, who: string) => (
      <div className="flex items-center gap-2 text-xs font-extrabold">
        <span className="w-20 truncate">{who}</span>
        <div className="h-4 flex-1 overflow-hidden rounded-full border-2 border-[var(--color-ink)] bg-white">
          <div className="h-full transition-all" style={{ width: `${Math.min(1, v / max) * 100}%`, background: color }} />
        </div>
        <span className="w-8 text-right">
          {Math.floor(Math.min(v, max))}/{max}
        </span>
      </div>
    )
    return (
      <div className="absolute inset-x-3 bottom-4 z-30 flex justify-center" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        <div className={`card !p-3 w-full max-w-sm space-y-1.5 ${duel.defend ? '!border-[#e03131]' : ''}`}>
          <div className="flex items-center justify-between text-sm font-extrabold">
            <span>{duel.defend ? `Défends ${d.name}` : `Duel pour ${d.name}`}</span>
            <span className={duel.left < 10 ? 'text-[#e03131]' : ''}>⏱️ {Math.ceil(duel.left)} s</span>
          </div>
          {/* online: the target the server set (more with his gros bras); against a player serving live, serve more than him */}
          {bar(duel.mine, duel.online ? (duel.defend ? Math.max(duel.online.target, Math.ceil(duel.rival) + 1) : duel.online.target) : duel.defend ? DEFEND_TARGET : DUEL_TARGET, 'var(--color-green)', 'Toi')}
          {bar(duel.rival, duel.online?.target ?? DUEL_TARGET, '#e03131', enemy)}
          {duel.online?.live && <div className="text-center text-[11px] font-extrabold text-[#e03131]">En direct contre {enemy} : sers plus que lui !</div>}
        </div>
      </div>
    )
  }
  // after a win, the result card waits for the end of the conquest animation
  if (!result || conquering) return null
  const title = result.defend ? (result.won ? `${result.name} tient bon !` : `${result.name} est perdu…`) : result.won ? `${result.name} est à toi !` : `${result.boss} a gagné`
  const text = result.defend
    ? result.won
      ? `Les gens de ${result.boss} sont repartis. ${result.name} est protégé ${SHIELD / 60} minutes.`
      : `${result.boss} a repris le quartier. Embauche des gros bras pour la prochaine fois, puis reprends-le.`
    : result.won
      ? `${result.boss} est parti. Plus personne ne prend ta part ici.`
      : 'Ses gens ont servi plus vite. Améliore ton maquis et réessaie.'
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onPointerDown={stop} onClick={() => useTurf.setState({ result: null })}>
      <div className="card pop w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center"><Icon name={result.won ? (result.defend ? 'shield' : 'crown') : 'angry'} size={60} /></div>
        <h2 className="mt-1 text-2xl font-extrabold">{title}</h2>
        <p className="mt-1 text-sm font-semibold">{text}</p>
        <button className="btn btn-green mt-3 w-full" onClick={() => useTurf.setState({ result: null })}>
          {result.won ? 'C’est doux !' : 'On va voir !'}
        </button>
      </div>
    </div>
  )
}

/** The button and the boss badge (in the left column of the HUD). */
export function TurfButton() {
  return (
    <>
      <RoundButton icon={<Icon name="city" size={28} />} label="Quartiers" color="#c92a2a" onClick={() => useTurf.setState({ panel: true })} />
    </>
  )
}

/** The panel and the duel display, drawn over the whole screen. */
/** The conquest: the 3D commune, the camera on the district just won, flag, paint wave, confetti. */
function ConquestScreen({ place, idx }: { place: PlaceId; idx: number }) {
  useTurf((s) => s.owners)
  const owners = ownersOf(place)
  const d = DISTRICTS[place][idx]
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 bg-[#bfe6ff]" onPointerDown={stop}>
      <Commune3D place={place} owners={owners} selected={idx} onPick={() => {}} conquer={idx} onConquestDone={() => useTurf.setState({ conquest: null })} />
      <div className="pointer-events-none absolute inset-x-0 top-10 flex justify-center" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        <div className="pop rounded-2xl border-[3px] border-[var(--color-ink)] bg-[#ffd43b] px-4 py-2 text-xl font-extrabold shadow-lg">{d.name} tombe…</div>
      </div>
      <button className="absolute right-3 bottom-4 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-extrabold shadow" onClick={() => useTurf.setState({ conquest: null })}>
        Passer ⏭
      </button>
    </div>
  )
}

export function TurfLayer() {
  const open = useTurf((s) => s.panel)
  const conquest = useTurf((s) => s.conquest)
  return (
    <>
      {conquest && <ConquestScreen place={conquest.place} idx={conquest.idx} />}
      {open && !conquest && <TurfPanel onClose={() => useTurf.setState({ panel: false })} />}
      <DuelHud />
    </>
  )
}
