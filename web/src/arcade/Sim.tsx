import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Avatar } from './Avatar'
import type { PersonId } from '../three/RealPerson'
import { moveInput } from './input'
import { BOUNDS, CASH, COUNTER, ENTER, EXIT, PADS, PLATE_PRICE, SLOT0, SLOT_STEP, SOLIDS, START, STATIONS, TABLE, V, type Unlock } from './layout'
import { CashPile, Counter, MaquisTable, Pad, PlateStack, Station } from './Props'
import { maxQueue, popText, priceLeft, useArcade } from './store'

// The whole shop simulation, updated every frame:
//  - stations cook plates by themselves (up to 6 waiting),
//  - Tantie Aya picks plates up when she walks next to a station and drops them on the counter,
//  - customers line up, take plates from the counter, pay; the money piles up on the floor,
//  - walking over the money collects it; standing on a pad spends it to unlock things,
//  - the server (once hired) carries plates from the stations to the counter on his own.

const SPEED = 3.4
const CARRY_MAX = 5
const COOK_TIME = 2.6
const STATION_MAX = 6
const COUNTER_MAX = 14
const TICK = 0.13 // one plate moves every TICK seconds

const player = { pos: START.clone(), rot: 0, moving: false }
// handy for the automatic play tests (move Tantie Aya directly)
if (import.meta.env.DEV) Object.assign(window, { arcadePlayer: player })

type Cust = { id: number; who: PersonId; pos: THREE.Vector3; rot: number; state: 'line' | 'out'; want: number; got: number; moving: boolean }
const WHO: PersonId[] = ['koffi', 'awa', 'yao', 'fatou']

const slot = (k: number) => SLOT0.clone().addScaledVector(SLOT_STEP, k)
const stationFront = (i: number) => STATIONS[i].clone().add(V(0, 0.8))
const COUNTER_BACK = COUNTER.clone().add(V(0, -0.85))

function step(pos: THREE.Vector3, to: THREE.Vector3, speed: number, dt: number) {
  const d = to.clone().sub(pos)
  const l = d.length()
  if (l < 0.03) return { moving: false, dir: 0 }
  pos.addScaledVector(d.normalize(), Math.min(l, speed * dt))
  return { moving: true, dir: Math.atan2(d.x, d.z) }
}
const turn = (from: number, to: number, k: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k

export function Sim({ name }: { name: string }) {
  const s = useArcade()
  const progress = useRef([0, 0])
  const acc = useRef(0)
  const custs = useRef<Cust[]>([])
  const nextId = useRef(0)
  const spawn = useRef(1)
  const [, rerender] = useState(0)
  const bump = () => rerender((n) => n + 1)
  const worker = useRef({ pos: V(-1, -1.8), rot: 0, moving: false, state: 'toStation' as 'toStation' | 'toCounter', carried: 0 })
  const solids = useMemo(() => (s.unlocks.pan2 ? [...SOLIDS, { c: STATIONS[1], hx: 0.55, hz: 0.45 }] : SOLIDS), [s.unlocks.pan2])

  const redraw = useRef(0)
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    // refresh the cooking timers on screen a few times a second
    redraw.current += dt
    if (redraw.current > 0.2) {
      redraw.current = 0
      bump()
    }
    const st = useArcade.getState()
    const set = useArcade.setState
    const stations = st.unlocks.pan2 ? 2 : 1

    // 1. cooking
    const plates = [...st.station]
    let changed = false
    for (let i = 0; i < stations; i++) {
      if (plates[i] >= STATION_MAX) {
        progress.current[i] = 1
        continue
      }
      progress.current[i] += dt / COOK_TIME
      if (progress.current[i] >= 1) {
        progress.current[i] = 0
        plates[i]++
        changed = true
      }
    }

    // 2. moving Tantie Aya (with the joystick / keys), blocked by the counters and the plot's edge
    const inp = moveInput()
    player.moving = Math.hypot(inp.x, inp.z) > 0.05
    if (player.moving) {
      const p = player.pos
      p.x = THREE.MathUtils.clamp(p.x + inp.x * SPEED * dt, BOUNDS.minX, BOUNDS.maxX)
      p.z = THREE.MathUtils.clamp(p.z + inp.z * SPEED * dt, BOUNDS.minZ, BOUNDS.maxZ)
      for (const b of solids) {
        const dx = p.x - b.c.x
        const dz = p.z - b.c.z
        const ox = b.hx + 0.28 - Math.abs(dx)
        const oz = b.hz + 0.28 - Math.abs(dz)
        if (ox > 0 && oz > 0) {
          if (ox < oz) p.x += Math.sign(dx) * ox
          else p.z += Math.sign(dz) * oz
        }
      }
      player.rot = turn(player.rot, Math.atan2(inp.x, inp.z), Math.min(1, dt * 12))
    }

    // 3. picking up / dropping / collecting, one plate at a time
    acc.current += dt
    let carried = st.carried
    let counter = st.counter
    let cash = st.cash
    let money = st.money
    const w = worker.current
    let wCarried = w.carried
    while (acc.current >= TICK) {
      acc.current -= TICK
      for (let i = 0; i < stations; i++) {
        if (carried < CARRY_MAX && plates[i] > 0 && player.pos.distanceTo(STATIONS[i]) < 1.25) {
          plates[i]--
          carried++
          changed = true
        }
      }
      if (carried > 0 && counter < COUNTER_MAX && player.pos.distanceTo(COUNTER) < 1.35) {
        carried--
        counter++
        changed = true
      }
      // the server works the same way
      if (st.unlocks.serveur) {
        for (let i = 0; i < stations; i++)
          if (w.state === 'toStation' && wCarried < 3 && plates[i] > 0 && w.pos.distanceTo(stationFront(i)) < 0.5) {
            plates[i]--
            wCarried++
            changed = true
          }
        if (w.state === 'toCounter' && wCarried > 0 && counter < COUNTER_MAX && w.pos.distanceTo(COUNTER_BACK) < 0.5) {
          wCarried--
          counter++
          changed = true
        }
      }
    }
    if (cash > 0 && player.pos.distanceTo(CASH) < 0.9) {
      money += cash
      popText(`+${cash} FCFA`)
      cash = 0
      changed = true
    }

    // 4. unlock pads: money pours in while you stand on one
    const unlocks = { ...st.unlocks }
    const paid = { ...st.paid }
    for (const u of Object.keys(PADS) as Unlock[]) {
      if (unlocks[u] || money <= 0 || player.pos.distanceTo(PADS[u].pos) > 0.6) continue
      const give = Math.min(money, Math.ceil((PADS[u].price / 1.4) * dt), priceLeft(u))
      money -= give
      paid[u] = (paid[u] ?? 0) + give
      changed = true
      if (paid[u]! >= PADS[u].price) {
        unlocks[u] = true
        popText(`Débloqué : ${PADS[u].label} !`)
      }
    }

    // 5. the server: go to the fullest station, fill up to 3 plates, bring them to the counter
    if (st.unlocks.serveur) {
      if (w.state === 'toStation' && (wCarried >= 3 || (wCarried > 0 && plates.slice(0, stations).every((n) => n === 0)))) w.state = 'toCounter'
      if (w.state === 'toCounter' && wCarried === 0) w.state = 'toStation'
      const best = plates.slice(0, stations).reduce((b, n, i) => (n > plates[b] ? i : b), 0)
      const r = step(w.pos, w.state === 'toStation' ? stationFront(best) : COUNTER_BACK, SPEED * 0.75, dt)
      w.moving = r.moving
      if (r.moving) w.rot = turn(w.rot, r.dir, Math.min(1, dt * 10))
      w.carried = wCarried
    }

    // 6. customers: arrive, line up, take their plates, pay, leave
    spawn.current -= dt
    const line = custs.current.filter((c) => c.state === 'line')
    if (spawn.current <= 0 && line.length < (unlocks.table ? 5 : maxQueue())) {
      spawn.current = 2.5 + Math.random() * 2
      custs.current.push({ id: nextId.current, who: WHO[nextId.current % WHO.length], pos: ENTER.clone(), rot: -Math.PI / 2, state: 'line', want: 1 + Math.floor(Math.random() * (unlocks.table ? 3 : 2)), got: 0, moving: true })
      nextId.current++
      bump()
    }
    let served = st.served
    line.forEach((c, k) => {
      const r = step(c.pos, slot(k), 1.5, dt)
      if (r.moving) c.rot = turn(c.rot, r.dir, Math.min(1, dt * 8))
      else c.rot = turn(c.rot, Math.PI, Math.min(1, dt * 6))
      if (r.moving !== c.moving) {
        c.moving = r.moving
        bump()
      }
      if (k === 0 && !r.moving && counter > 0 && c.got < c.want && acc.current < dt) {
        counter--
        c.got++
        changed = true
        bump()
        if (c.got >= c.want) {
          cash += c.want * PLATE_PRICE
          served++
          c.state = 'out'
          c.moving = true
        }
      }
    })
    custs.current.forEach((c) => {
      if (c.state !== 'out') return
      const r = step(c.pos, EXIT, 1.6, dt)
      if (r.moving) c.rot = turn(c.rot, r.dir, Math.min(1, dt * 8))
      else c.id = -1
    })
    if (custs.current.some((c) => c.id < 0)) {
      custs.current = custs.current.filter((c) => c.id >= 0)
      bump()
    }

    if (changed || carried !== st.carried) set({ station: plates, carried, counter, cash, money, unlocks, paid, served, workerCarried: wCarried })
  })

  return (
    <>
      <Station plates={s.station[0]} progress={progress.current[0]} position={STATIONS[0]} />
      {s.unlocks.pan2 && <Station plates={s.station[1]} progress={progress.current[1]} position={STATIONS[1]} />}
      <Counter plates={s.counter} name={name} position={COUNTER} />
      <CashPile amount={s.cash} position={CASH} />
      {s.unlocks.table && <MaquisTable position={TABLE} />}
      {(Object.keys(PADS) as Unlock[]).map((u) => (!s.unlocks[u] ? <Pad key={u} label={PADS[u].label} price={PADS[u].price} left={PADS[u].price - (s.paid[u] ?? 0)} position={PADS[u].pos} /> : null))}
      <Mover who="aya" obj={player} carried={s.carried} />
      {s.unlocks.serveur && <Mover who="yao" obj={worker.current} carried={s.workerCarried} />}
      {custs.current.map((c, k) => (
        <Mover key={c.id} who={c.who} obj={c}>
          {k === 0 && c.state === 'line' && !c.moving && <Wants want={c.want} got={c.got} />}
        </Mover>
      ))}
      <Follow />
    </>
  )
}

/** A person whose position/rotation is driven by the simulation (player, server or customer). */
function Mover({ who, obj, carried = 0, children }: { who: PersonId; obj: { pos: THREE.Vector3; rot: number; moving: boolean }; carried?: number; children?: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const [moving, setMoving] = useState(obj.moving)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    g.position.copy(obj.pos)
    g.rotation.y = obj.rot
    if (obj.moving !== moving) setMoving(obj.moving)
  })
  return (
    <group ref={ref}>
      <Avatar who={who} moving={moving} carrying={carried > 0} />
      {carried > 0 && <PlateStack count={carried} wobble position={[0, 0.88, 0.42]} />}
      {children}
    </group>
  )
}

/** What the customer at the counter wants: plates, and how many they already got. */
function Wants({ want, got }: { want: number; got: number }) {
  return (
    <Html position={[0, 1.95, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pop flex items-center gap-1 rounded-full border-[3px] border-[var(--color-ink)] bg-white px-3 py-1 text-xl font-extrabold shadow-lg">
        🍛 {got}/{want}
      </div>
    </Html>
  )
}

/** The camera follows Tantie Aya from above, at an angle, like in the shop games. */
function Follow() {
  const { camera, size } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => {
    camera.position.set(player.pos.x, 9, player.pos.z + 7)
  }, [camera])
  useFrame((_, dt) => {
    const far = size.width < size.height ? 1.45 : 1
    const want = new THREE.Vector3(player.pos.x * 0.7, 8.2 * far, player.pos.z * 0.6 + 6.4 * far)
    camera.position.lerp(want, 1 - Math.exp(-dt * 4))
    look.lerp(new THREE.Vector3(player.pos.x * 0.7, 0.4, player.pos.z * 0.6 - 0.2), 1 - Math.exp(-dt * 4))
    camera.lookAt(look)
  })
  return null
}
