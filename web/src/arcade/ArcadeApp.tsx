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
import { useArcade } from './store'
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

function Hud() {
  const money = useArcade((s) => s.money)
  const carried = useArcade((s) => s.carried)
  const served = useArcade((s) => s.served)
  const pop = useArcade((s) => s.pop)
  const goal = 20
  const [sound, setSound] = useState(!isMuted())
  const level = 1 + Math.floor(served / goal)
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
      <div className="absolute top-20 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold shadow" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        Yopougon · Niveau {level}
      </div>
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
            Glisse ton doigt pour bouger. Prends les plats de garba sur le plateau rouge, pose-les au comptoir, ramasse l’argent, puis marche sur les carrés pour débloquer.
          </div>
        </div>
      )}
    </div>
  )
}

export default function ArcadeApp() {
  const phase = useGame((s) => s.phase)
  const name = useGame((s) => s.name)
  return (
    <div className="relative h-full w-full">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 34, near: 0.1, far: 140, position: [6, 10, 6] }}>
        <Suspense fallback={null}>
          <ArcadeWorld />
          <Building name={name || 'Boss'} />
          <Streets />
          {phase !== 'title' && <Sim name={name} />}
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
