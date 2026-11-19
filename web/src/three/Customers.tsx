import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGame, type Order } from '../store'
import { Person } from './Person'

const SPOT = new THREE.Vector3(1.75, 0, 0.95)
const ENTER = new THREE.Vector3(7, 0, 1.6)
const EXIT = new THREE.Vector3(-8, 0, 1.8)
const FACE_STAND = -0.75

function Walker({ order, from, to, speed = 1.6, onArrive, children }: { order: Order; from: THREE.Vector3; to: THREE.Vector3; speed?: number; onArrive?: () => void; children?: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const pos = useRef(from.clone())
  const [walking, setWalking] = useState(true)
  const arrived = useRef(false)
  const phase = useGame((s) => s.phase)
  const stars = useGame((s) => s.result?.stars ?? 0)

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const d = to.clone().sub(pos.current)
    const len = d.length()
    if (len > 0.02) {
      pos.current.addScaledVector(d.normalize(), Math.min(len, speed * dt))
      g.rotation.y = Math.atan2(d.x, d.z)
    } else if (!arrived.current) {
      arrived.current = true
      setWalking(false)
      onArrive?.()
    } else {
      g.rotation.y += (FACE_STAND - g.rotation.y) * Math.min(1, dt * 6)
    }
    g.position.copy(pos.current)
  })

  const mood = phase === 'result' && !walking ? (stars === 3 ? 'happy' : stars === 2 ? 'neutral' : 'sad') : 'happy'
  return (
    <group ref={ref}>
      <Person look={order.customer.look} walking={walking} mood={mood} />
      {!walking && children}
    </group>
  )
}

function Bubble({ text, name }: { text: string; name: string }) {
  return (
    <Html position={[0, 1.75, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pop w-[190px] -translate-y-1/2 rounded-2xl border-[3px] border-[var(--color-ink)] bg-white px-3 py-2 text-[15px] leading-tight font-bold shadow-lg">
        <div className="text-[11px] font-extrabold tracking-wide text-[var(--color-orange)] uppercase">{name}</div>
        {text}
        <div className="absolute -bottom-[11px] left-6 h-4 w-4 rotate-45 border-r-[3px] border-b-[3px] border-[var(--color-ink)] bg-white" />
      </div>
    </Html>
  )
}

export function Customers() {
  const order = useGame((s) => s.order)
  const phase = useGame((s) => s.phase)
  const result = useGame((s) => s.result)
  const arrived = useGame((s) => s.customerArrived)
  const [leaving, setLeaving] = useState<Order | null>(null)
  const last = useRef<Order | null>(null)

  // When a new customer comes, the one who just ate walks away down the street.
  useEffect(() => {
    if (last.current && last.current !== order) setLeaving(last.current)
    last.current = order
  }, [order])

  if (phase === 'title' || !order) return null
  return (
    <>
      {leaving && <Walker key={`out${leaving.id}`} order={leaving} from={SPOT} to={EXIT} speed={2} />}
      <Walker key={`in${order.id}`} order={order} from={ENTER} to={SPOT} onArrive={() => useGame.getState().phase === 'arriving' && arrived()}>
        {phase === 'order' && <Bubble name={order.customer.name} text={order.line} />}
        {phase === 'result' && result && <Bubble name={order.customer.name} text={result.line} />}
      </Walker>
    </>
  )
}
