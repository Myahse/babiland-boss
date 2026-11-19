import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGame, type Order } from '../store'
import { Character } from './Character'

// Customers queue in a line beside the stand, like in the shop games: the first one orders,
// the others wait; when the first is served they leave and everyone steps up one place.

const SPOT = new THREE.Vector3(1.7, 0, 0.8)
const STEP = new THREE.Vector3(0.78, 0, 0.05)
const ENTER = new THREE.Vector3(7.5, 0, 3.0)
const EXIT = new THREE.Vector3(-8, 0, 2.2)
const FACE_STAND = -0.75

/** Place k in the line (0 = at the counter). */
const slot = (k: number) => SPOT.clone().addScaledVector(STEP, k)

function Walker({ order, to, front, leaving = false, onArrive, children }: { order: Order; to: THREE.Vector3; front: boolean; leaving?: boolean; onArrive?: () => void; children?: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const pos = useRef((leaving ? SPOT : ENTER).clone())
  const [walking, setWalking] = useState(true)
  const arrived = useRef(false)
  const phase = useGame((s) => s.phase)
  const stars = useGame((s) => s.result?.stars ?? 0)

  // a new place in the line: walk to it
  useEffect(() => {
    arrived.current = false
    setWalking(true)
  }, [to.x, to.z])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const d = to.clone().sub(pos.current)
    const len = d.length()
    if (len > 0.03) {
      pos.current.addScaledVector(d.normalize(), Math.min(len, 1.15 * dt))
      // turn smoothly toward where they walk, like a real person
      const want = Math.atan2(d.x, d.z)
      g.rotation.y += Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y)) * Math.min(1, dt * 5)
    } else {
      if (!arrived.current) {
        arrived.current = true
        setWalking(false)
        onArrive?.()
      }
      // at the counter: face the cook; in the line: look toward the stand over the next person's shoulder
      const want = front ? FACE_STAND : -Math.PI / 2 + 0.35
      g.rotation.y += Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y)) * Math.min(1, dt * 4)
    }
    g.position.copy(pos.current)
  })

  // walk, talk while ordering, react to the plate (cheer, hand on hip, angry), else wait
  const action =
    walking || leaving ? 'walk' : !front ? 'idle' : phase === 'order' ? 'talk' : phase === 'result' ? (stars === 3 ? 'happy' : stars === 2 ? 'ok' : 'angry') : 'idle'
  return (
    <group ref={ref} rotation={[0, -Math.PI / 2, 0]}>
      <Character who={order.customer.person} action={action} />
      {!walking && children}
    </group>
  )
}

function Bubble({ text, name }: { text: string; name: string }) {
  return (
    <Html position={[0, 2.05, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pop w-[190px] -translate-y-1/2 rounded-2xl border-[3px] border-[var(--color-ink)] bg-white px-3 py-2 text-[15px] leading-tight font-bold shadow-lg">
        <div className="text-[11px] font-extrabold tracking-wide text-[var(--color-orange)] uppercase">{name}</div>
        {text}
        <div className="absolute -bottom-[11px] left-6 h-4 w-4 rotate-45 border-r-[3px] border-b-[3px] border-[var(--color-ink)] bg-white" />
      </div>
    </Html>
  )
}

/** « +700 FCFA » flying up from the customer when they pay. */
function CashPop({ amount }: { amount: number }) {
  return (
    <Html position={[0, 1.2, 0.3]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div className="float-up relative left-1/2 text-3xl font-extrabold whitespace-nowrap text-[#ffe066]" style={{ textShadow: '2px 2px 0 #2b8a3e, -2px -2px 0 #2b1a12, 2px -2px 0 #2b1a12, -2px 2px 0 #2b1a12, 2px 2px 0 #2b1a12', animationDuration: '1.6s' }}>
        💰 +{amount} FCFA
      </div>
    </Html>
  )
}

export function Customers() {
  const order = useGame((s) => s.order)
  const line = useGame((s) => s.line)
  const phase = useGame((s) => s.phase)
  const result = useGame((s) => s.result)
  const arrived = useGame((s) => s.customerArrived)
  const [leaving, setLeaving] = useState<Order[]>([])
  const last = useRef<Order | null>(null)
  const slots = useMemo(() => [0, 1, 2, 3].map(slot), [])

  // when the next customer steps up, the one who just ate walks away down the street
  useEffect(() => {
    const prev = last.current
    if (prev && prev !== order) setLeaving((l) => [...l.slice(-2), prev])
    last.current = order
  }, [order])

  if (phase === 'title' || !order) return null
  // one flat list keyed by customer, so a person keeps walking smoothly when they move up the line
  const people = [
    ...leaving.filter((o) => o !== order && !line.includes(o)).map((o) => ({ o, to: EXIT, front: false, out: true })),
    { o: order, to: slots[0], front: true, out: false },
    ...line.map((o, i) => ({ o, to: slots[i + 1], front: false, out: false })),
  ]
  return (
    <>
      {people.map(({ o, to, front, out }) => (
        <Walker key={o.id} order={o} to={to} front={front} leaving={out} onArrive={front ? () => useGame.getState().phase === 'arriving' && arrived() : undefined}>
          {front && phase === 'order' && <Bubble name={o.customer.name} text={o.line} />}
          {front && phase === 'result' && result && <Bubble name={o.customer.name} text={result.line} />}
          {front && phase === 'result' && result && <CashPop amount={result.pay + result.tip} />}
        </Walker>
      ))}
    </>
  )
}
