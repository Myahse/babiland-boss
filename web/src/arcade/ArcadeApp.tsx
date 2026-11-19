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

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`

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
  const [hint, setHint] = useState(true)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    t.current = setTimeout(() => setHint(false), 9000)
    return () => clearTimeout(t.current)
  }, [])
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="rounded-2xl border-[3px] border-[var(--color-ink)] bg-[var(--color-cream)] px-3 py-1.5 text-sm font-extrabold shadow-md">
          Yopougon · {served} clients servis
        </div>
        <div key={money} className="pop rounded-2xl border-[3px] border-[var(--color-ink)] bg-[#ffd43b] px-3 py-1.5 text-xl font-extrabold shadow-md">
          💰 {fcfa(money)}
        </div>
      </div>
      {carried > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-sm font-extrabold shadow">
          🍛 {carried}/5 {carried >= 5 && '· MAX'}
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
            Glisse ton doigt pour bouger. Prends les plats de garba, pose-les sur le comptoir, ramasse l’argent, puis marche sur les ronds bleus pour débloquer.
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
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 38, near: 0.1, far: 120, position: [0, 9, 7] }}>
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
