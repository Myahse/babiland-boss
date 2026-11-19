import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useGame } from '../store'
import { Title } from '../ui/Hud'
import { ArcadeWorld } from './ArcadeWorld'
import { Sim } from './Sim'
import { Building, Streets } from './Shop'
import { stick } from './input'
import { buy, goTo, totalServed, useArcade } from './store'
import { DishCtx, levelOf, PER_LEVEL, PLACE_IDS, PLACES, type PlaceId } from './places'
import { isMuted, setMuted } from './sfx'


/** Drag anywhere to move: the stick appears where the finger lands. */
function Joystick() {
  const [view, setView] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null)
  const down = (e: React.PointerEvent) => {
    stick.active = true
    stick.ox = e.clientX
    stick.oy = e.clientY
    stick.x = stick.y = 0
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setView({ ox: e.clientX, oy: e.clientY, x: 0, y: 0 })
  }
  const move = (e: React.PointerEvent) => {
    if (!stick.active) return
    let dx = e.clientX - stick.ox
    let dy = e.clientY - stick.oy
    const l = Math.hypot(dx, dy)
    const R = 55
    if (l > R) {
      dx = (dx / l) * R
      dy = (dy / l) * R
    }
    stick.x = dx / R
    stick.y = dy / R
    setView({ ox: stick.ox, oy: stick.oy, x: dx, y: dy })
  }
  const up = () => {
    stick.active = false
    stick.x = stick.y = 0
    setView(null)
  }
  return (
    <div className="absolute inset-0 touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {view && (
        <div className="pointer-events-none absolute h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/70 bg-black/15" style={{ left: view.ox, top: view.oy }}>
          <div className="absolute top-1/2 left-1/2 h-12 w-12 rounded-full bg-white shadow-lg" style={{ transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))` }} />
        </div>
      )}
    </div>
  )
}

// Side businesses still to come (see docs/VISION.md).
const SIDE = [
  { name: 'Vendeuse de thé', level: 2, icon: '🍵' },
  { name: 'Stand de choukouya du soir', level: 4, icon: '🍖' },
  { name: 'Vendeuse de bissap', level: 6, icon: '🥤' },
]

/** One place on the map: where you are, go there, buy it, or the level it needs. */
function PlaceRow({ id, level, onDone }: { id: PlaceId; level: number; onDone: () => void }) {
  const p = PLACES[id]
  const current = useArcade((s) => s.current)
  const owned = useArcade((s) => s.owned.includes(id))
  const money = useArcade((s) => s.money)
  const here = current === id
  return (
    <div className={`flex items-center gap-2 rounded-xl border-2 px-2.5 py-1.5 ${here ? 'border-[var(--color-ink)] bg-[#ffe8cc]' : owned ? 'border-[var(--color-ink)] bg-white' : 'border-dashed border-[#c9b79c]'}`}>
      <span className="h-7 w-7 shrink-0 rounded-lg border-2 border-white shadow" style={{ background: p.wall }} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-sm font-extrabold">{p.name}</div>
        <div className="text-xs font-semibold">
          {p.dishLabel} · {p.plate} F le plat
        </div>
      </div>
      {here ? (
        <span className="text-xs font-extrabold text-[var(--color-green)]">📍 Tu es ici</span>
      ) : owned ? (
        <button className="btn btn-green !px-3 !py-1.5 !text-sm" onClick={() => (goTo(id), onDone())}>
          Y aller
        </button>
      ) : level < p.level ? (
        <span className="text-xs font-extrabold opacity-70">🔒 niveau {p.level}</span>
      ) : (
        <button className="btn !px-3 !py-1.5 !text-sm" disabled={money < p.price} onClick={() => (buy(id), onDone())}>
          Acheter {p.price.toLocaleString('fr-FR')} F
        </button>
      )}
    </div>
  )
}

function MapPanel({ level, onClose }: { level: number; onClose: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-end justify-center bg-black/45 p-3 sm:items-center" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
      <div className="card pop max-h-[85%] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">🗺️ Deviens le boss de Babi</h2>
          <button className="text-2xl font-extrabold" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm font-semibold">Monte de niveau (clients servis dans tous tes maquis), achète un maquis dans une autre commune, puis dans d’autres villes. Chaque maquis garde son matériel et son équipe.</p>
        {[false, true].map((city) => (
          <div key={String(city)}>
            <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">{city ? 'Autres villes' : 'Communes d’Abidjan'}</div>
            <div className="mt-1 space-y-1.5">
              {PLACE_IDS.filter((id) => PLACES[id].city === city).map((id) => (
                <PlaceRow key={id} id={id} level={level} onDone={onClose} />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">Petits business</div>
        <div className="mt-1 space-y-1">
          {SIDE.map((b) => (
            <div key={b.name} className="flex items-center justify-between rounded-xl border-2 border-dashed border-[#c9b79c] px-2.5 py-1.5 text-sm font-bold">
              <span>
                {b.icon} {b.name}
              </span>
              <span className="text-xs">{level >= b.level ? 'bientôt' : `niveau ${b.level}`}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-[#2b1a12] p-3 text-sm font-bold text-white">
          ⚔️ Clash des boss — bientôt en ligne : prends un quartier au boss d’à côté et défends le tien.
        </div>
      </div>
    </div>
  )
}

function Hud() {
  const money = useArcade((s) => s.money)
  const carried = useArcade((s) => s.carried.length)
  const served = useArcade((s) => totalServed(s))
  const place = useArcade((s) => PLACES[s.current])
  const pop = useArcade((s) => s.pop)
  const goal = PER_LEVEL
  const [sound, setSound] = useState(!isMuted())
  const [map, setMap] = useState(false)
  const level = levelOf(served)
  const [hint, setHint] = useState(true)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    t.current = setTimeout(() => setHint(false), 9000)
    return () => clearTimeout(t.current)
  }, [])
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        {/* settings */}
        <button
          className="pointer-events-auto grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-[0_4px_0_rgba(0,0,0,.2)] active:translate-y-0.5"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            setMuted(!isMuted())
            setSound(!isMuted())
          }}
          aria-label={sound ? 'Couper le son' : 'Remettre le son'}
        >
          {sound ? '🔊' : '🔇'}
        </button>
        {/* level gauge: customers served toward the next level */}
        <div className="relative flex min-w-0 flex-1 items-center">
          <div className="z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-4 border-white bg-[#e8432e] text-xl font-extrabold text-[#ffd43b] shadow-md">G</div>
          <div className="-ml-3 h-8 flex-1 overflow-hidden rounded-r-full border-4 border-white bg-[#5c6670] shadow-md">
            <div className="h-full bg-gradient-to-b from-[#ff6b4a] to-[#e8432e] transition-all" style={{ width: `${((served % goal) / goal) * 100}%` }} />
          </div>
          <div className="absolute inset-0 grid place-items-center pl-8 text-lg font-extrabold text-white" style={{ textShadow: '1px 1px 0 #7a1a10' }}>
            {served % goal} / {goal}
          </div>
          <div className="z-10 -ml-3 grid h-11 w-11 shrink-0 place-items-center rounded-full border-4 border-white bg-[#f3e3c3] text-xl shadow-md">🍛</div>
        </div>
        {/* money */}
        <div key={money} className="pop flex shrink-0 items-center gap-1.5 rounded-xl bg-white py-1 pr-3 pl-1 shadow-[0_4px_0_rgba(0,0,0,.2)]">
          <span className="grid h-9 w-12 place-items-center rounded-md bg-[#69db3c] text-lg">💵</span>
          <span className="text-2xl font-extrabold text-[#343a40]">{money >= 10000 ? `${(money / 1000).toFixed(1)}K` : money}</span>
        </div>
      </div>
      <div className="absolute top-20 left-3 flex flex-col items-start gap-2" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold shadow">{place.name} · Niveau {level}</div>
        <button
          className="pointer-events-auto flex items-center gap-1 rounded-2xl border-[3px] border-white bg-[#1c7ed6] px-3 py-1.5 text-sm font-extrabold text-white shadow-[0_4px_0_rgba(0,0,0,.2)] active:translate-y-0.5"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setMap(true)}
        >
          🗺️ Carte
        </button>
      </div>
      {map && <MapPanel level={level} onClose={() => setMap(false)} />}
      {carried > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-sm font-extrabold shadow">
          🍛 {carried}
        </div>
      )}
      {pop && (
        <div key={pop.id} className="float-up absolute top-[30%] left-1/2 text-3xl font-extrabold whitespace-nowrap text-[#ffe066]" style={{ textShadow: '2px 2px 0 #2b8a3e, -2px -2px 0 #2b1a12, 2px -2px 0 #2b1a12, -2px 2px 0 #2b1a12, 2px 2px 0 #2b1a12', animationDuration: '1.4s' }}>
          {pop.text}
        </div>
      )}
      {hint && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div className="card pop max-w-md !p-3 text-center text-base font-bold">
            Glisse ton doigt pour bouger. Prends les plats de {place.dishLabel.toLowerCase()} sur le plateau rouge, pose-les au comptoir, ramasse l’argent, puis marche sur les carrés pour débloquer.
          </div>
        </div>
      )}
    </div>
  )
}

export default function ArcadeApp() {
  const phase = useGame((s) => s.phase)
  const name = useGame((s) => s.name)
  const current = useArcade((s) => s.current)
  return (
    <div className="relative h-full w-full">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 34, near: 0.1, far: 140, position: [6, 10, 6] }}>
        <Suspense fallback={null}>
          <DishCtx.Provider value={PLACES[current].dish}>
            <ArcadeWorld />
            <Building name={name || 'Boss'} place={PLACES[current]} />
            <Streets />
            {phase !== 'title' && <Sim key={current} name={name} />}
          </DishCtx.Provider>
          <EffectComposer multisampling={0}>
            <ToneMapping mode={ToneMappingMode.NEUTRAL} />
            <SMAA />
          </EffectComposer>
        </Suspense>
      </Canvas>
      {phase === 'title' ? (
        <Title />
      ) : (
        <>
          <Joystick />
          <Hud />
        </>
      )}
    </div>
  )
}
