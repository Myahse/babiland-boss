import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useGame } from '../store'
import { ArcadeWorld } from './ArcadeWorld'
import { Sim } from './Sim'
import { Building, GrandDecor, Streets } from './Shop'
import { StreetDecor } from './StreetDecor'
import { StreetLife } from './StreetLife'
import { GameClock } from './daynight'
import { stick } from './input'
import { buy, goTo, popText, totalServed, useArcade } from './store'
import { DishCtx, levelOf, PER_LEVEL, PLACE_IDS, PLACES, type PlaceId } from './places'
import { isMuted, setMuted } from './sfx'
import { TurfButton, TurfLayer } from './TurfUI'
import { SIDE, SIDE_MAX } from './side'
import { VipLayer } from './VipCook'
import { OfflinePanel } from './Offline'
import { AmenagerButton, BulkBanner, FameChip, MissionsButton, NewsLayer } from './HudExtras'
import { DiamondButton, LiveFeed, OnlineButton, OnlineRuntime } from './OnlineUI'
import { Intro, StoryLayer } from './Story'
import { Quartier, walker, type Spot } from './Quartier'
import { SpotCard } from './SpotCard'
import { RoundButton } from './HudButton'
import { Icon } from './Icons'


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
        <span className="text-xs font-extrabold text-[var(--color-green)]">Tu es ici</span>
      ) : owned ? (
        <button className="btn btn-green !px-3 !py-1.5 !text-sm" onClick={() => (goTo(id), onDone())}>
          Y aller
        </button>
      ) : level < p.level ? (
        <span className="text-xs font-extrabold opacity-70">niveau {p.level}</span>
      ) : (
        <button className="btn !px-3 !py-1.5 !text-sm" disabled={money < p.price} onClick={() => (buy(id), onDone())}>
          Acheter {p.price.toLocaleString('fr-FR')} F
        </button>
      )}
    </div>
  )
}

/** A small business: where it is in each of your maquis (the stands are opened on the pavement, on their pad). */
function SideRow({ i, level }: { i: number; level: number }) {
  const b = SIDE[i]
  const lv = useArcade((s) => s.side[i])
  return (
    <div className={`flex items-center justify-between rounded-xl border-2 px-2.5 py-1.5 text-sm font-bold ${lv ? 'border-[var(--color-ink)] bg-white' : 'border-dashed border-[#c9b79c]'}`}>
      <span className="flex items-center gap-1">
        <Icon name={b.art} size={20} /> {b.name}
      </span>
      <span className="text-xs">{lv ? `niveau ${lv}${lv < SIDE_MAX ? ' · améliore-le sur son carré' : ' · MAX'}` : level >= b.level ? `${b.price} F · son carré est devant la terrasse` : `niveau ${b.level}`}</span>
    </div>
  )
}

function MapPanel({ level, onClose }: { level: number; onClose: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-end justify-center bg-black/45 p-3 sm:items-center" onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>
      <div className="card pop max-h-[85%] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold"><Icon name="map" size={26} className="mr-1.5 align-[-4px]" />Deviens le boss de Babi</h2>
          <button className="text-2xl font-extrabold" onClick={onClose} aria-label="Fermer">
            <Icon name="cross" size={22} />
          </button>
        </div>
        <p className="mt-1 text-sm font-semibold">Monte de niveau (clients servis partout), ouvre un petit coin dans une autre commune, puis dans d’autres villes. Chaque coin commence petit et grandit quand les gens te connaissent : maquis, restaurant, grand restaurant. Chacun garde son matériel et son équipe.</p>
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
          {SIDE.map((b, i) => (
            <SideRow key={b.name} i={i} level={level} />
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-[#2b1a12] p-3 text-sm font-bold text-white">
          Clash des boss — bientôt en ligne : prends un quartier au boss d’à côté et défends le tien.
        </div>
      </div>
    </div>
  )
}

function Hud({ street }: { street: boolean }) {
  const money = useArcade((s) => s.money)
  const carried = useArcade((s) => s.carried.length)
  const served = useArcade((s) => totalServed(s))
  const pop = useArcade((s) => s.pop)
  const goal = PER_LEVEL
  const [sound, setSound] = useState(!isMuted())
  const map = useArcade((s) => s.mapOpen)
  const setMap = (v: boolean) => useArcade.setState({ mapOpen: v })
  const level = levelOf(served)
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
          <Icon name={sound ? 'soundOn' : 'soundOff'} size={28} />
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
          <div className="z-10 -ml-3 grid h-11 w-11 shrink-0 place-items-center rounded-full border-4 border-white bg-[#f3e3c3] text-xl shadow-md"><Icon name="plate" size={26} /></div>
        </div>
        <DiamondButton />
        {/* money */}
        <div key={money} className="pop flex shrink-0 items-center gap-1.5 rounded-xl bg-white py-1 pr-3 pl-1 shadow-[0_4px_0_rgba(0,0,0,.2)]">
          <span className="grid h-9 w-11 place-items-center"><Icon name="bill" size={32} /></span>
          <span className="text-2xl font-extrabold text-[#343a40]">{money >= 10000 ? `${(money / 1000).toFixed(1)}K` : money}</span>
        </div>
      </div>
      <div className="absolute top-[72px] left-3 flex flex-col items-start gap-1.5" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        <FameChip level={level} />
        {!street && (
          <RoundButton
            icon={<Icon name="door" size={28} />}
            label="Rue"
            color="#495057"
            onClick={() => {
              // out of the maquis, on the pavement in front of its door
              walker.pos.set(-0.9, 0, -4.6)
              useArcade.setState({ view: 'quartier' })
            }}
          />
        )}
        <RoundButton icon={<Icon name="map" size={28} />} label="Carte" color="#1c7ed6" onClick={() => setMap(true)} />
        <TurfButton />
        <AmenagerButton />
        <MissionsButton />
        <OnlineButton />
      </div>
      <div className="pointer-events-none absolute top-[4.4rem] right-3 flex flex-col items-end gap-1.5" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        <GameClock />
        {!street && <CamSwitch />}
      </div>
      <BulkBanner />
      <StoryLayer />
      <LiveFeed />
      <NewsLayer />
      <VipLayer />
      <OfflinePanel />
      <TurfLayer />
      {map && <MapPanel level={level} onClose={() => setMap(false)} />}
      {carried > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-sm font-extrabold shadow">
          <Icon name="plate" size={16} className="inline align-[-3px]" /> {carried}
        </div>
      )}
      {pop && (
        <div key={pop.id} className="float-up absolute top-[30%] left-1/2 text-3xl font-extrabold whitespace-nowrap text-[#ffe066]" style={{ textShadow: '2px 2px 0 #2b8a3e, -2px -2px 0 #2b1a12, 2px -2px 0 #2b1a12, -2px 2px 0 #2b1a12, 2px 2px 0 #2b1a12', animationDuration: '1.4s' }}>
          {pop.text}
        </div>
      )}
    </div>
  )
}

// Screen sharpness: on a phone (high pixel density) the 3D and its effects at full density need a lot of graphics
// memory; 1.5 looks the same on a small screen and uses about half.
const PHONE_DPR: [number, number] = [1, typeof window !== 'undefined' && window.devicePixelRatio > 2 && 'ontouchstart' in window ? 1.5 : 2]

export default function ArcadeApp() {
  const phase = useGame((s) => s.phase)
  const name = useGame((s) => s.name)
  const current = useArcade((s) => s.current)
  const stage = useArcade((s) => s.stage)
  const style = useArcade((s) => s.style)
  const view = useArcade((s) => s.view)
  // the place you are standing in front of, in the street
  const [spot, setSpot] = useState<Spot | null>(null)
  const street = phase !== 'title' && view === 'quartier'
  const [lost, setLost] = useState(false)
  return (
    <div className="relative h-full w-full">
      {lost && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#fff4e0] p-8 text-center text-[#2b1a12]">
          <p className="text-lg font-extrabold">Ton téléphone a manqué de mémoire pour la 3D.</p>
          <p className="text-sm">Ta partie est sauvegardée.</p>
          <button className="rounded-2xl bg-[#2f9e44] px-6 py-3 font-extrabold text-white shadow" onClick={() => location.reload()}>
            Relancer le jeu
          </button>
        </div>
      )}
      <Canvas
        shadows
        dpr={PHONE_DPR}
        camera={{ fov: 34, near: 0.1, far: 140, position: [6, 10, 6] }}
        onCreated={({ gl }) => {
          // if the phone runs out of graphics memory anyway, say so and offer to restart, instead of a blank screen
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            setLost(true)
          })
          gl.domElement.addEventListener('webglcontextrestored', () => setLost(false))
        }}
      >
        <Suspense fallback={null}>
          <DishCtx.Provider value={PLACES[current].dish}>
            {street ? (
              <Quartier key={`q-${current}`} onSpot={setSpot} />
            ) : (
              <>
                <ArcadeWorld stage={stage} room={style.room} />
                <Building name={name || 'Boss'} place={PLACES[current]} stage={stage} look={style.facade} />
                {stage >= 3 && <GrandDecor />}
                <Streets />
                <StreetDecor />
                <StreetLife />
                {phase !== 'title' && <Sim key={current} name={name} />}
              </>
            )}
          </DishCtx.Provider>
          {/* the look: lights that glow (bulbs, signs), colours a little warmer and livelier, the edges a little darker */}
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.55} radius={0.6} />
            <HueSaturation saturation={0.12} />
            <BrightnessContrast contrast={0.06} />
            <ToneMapping mode={ToneMappingMode.NEUTRAL} />
            <Vignette offset={0.32} darkness={0.42} />
            <SMAA />
          </EffectComposer>
        </Suspense>
      </Canvas>
      {phase === 'title' ? (
        <Intro />
      ) : (
        <>
          <Joystick />
          <Hud street={street} />
          {street && spot && <SpotCard spot={spot} />}
          <OnlineRuntime />
        </>
      )}
    </div>
  )
}

/** Inside, outside, the upstairs terrace: three ways to look at the maquis. */
function CamSwitch() {
  const cam = useArcade((s) => s.cam)
  const stage = useArcade((s) => s.stage)
  const opts: { id: 'dedans' | 'dehors' | 'terrasse'; label: string }[] = [
    { id: 'dedans', label: 'Dedans' },
    { id: 'dehors', label: 'Dehors' },
    { id: 'terrasse', label: 'Terrasse' },
  ]
  return (
    <div className="pointer-events-auto flex rounded-full bg-white/85 p-0.5 text-[11px] font-extrabold shadow">
      {opts.map((o) => (
        <button
          key={o.id}
          className={`rounded-full px-2 py-0.5 ${cam === o.id ? 'bg-[#2b1a12] text-white' : 'text-[#2b1a12]'}`}
          onClick={() => {
            if (o.id === 'terrasse' && stage < 2) return popText('La terrasse du haut s’ouvre quand ton maquis devient un restaurant')
            useArcade.setState({ cam: o.id })
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
