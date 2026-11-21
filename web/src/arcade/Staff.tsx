import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { signTexture } from '../three/textures'
import { fly } from './fx'
import { has, type ItemId } from './items'
import { CASH, P, STATIONS, TABLES, V } from './layout'
import { DISHES, placeDishes, PLACES } from './places'
import { others } from './profile'
import { Flat } from './Props'
import { sfx } from './sfx'
import { COUNTER_BACK, COUNTER_TOP, hands, Mover, stationFront, step, TRAY, turn } from './Sim'
import { popText, useArcade } from './store'
import { useStory } from './story'
import { useVip } from './vip'
import { night } from './daynight'

// The assistants bought in « Aménager » (items.ts) at work, and the things in the room: the cook going from
// stove to stove, the second server carrying plates to the counter, the commis picking up the money, the extra
// chairs, the TV with the match, the fans, the speakers and the lights, the drinks fridge.

const SPEED = 2.1
const TICK = 0.15
const STATION_SLOT = [0, 0, 1, 2]
const TV = P(3.2, -2.36)
const SPEAKERS = [P(-1.75, -2.1), P(1.0, -2.15)]
const FANS = [P(-5.4, 0.6), P(0.55, 3.75)]
const FRIDGE = P(-5.45, -1.85)
const IDLE = P(3.2, 0.9)

type Walker = { pos: THREE.Vector3; rot: number; moving: boolean }

export function Staff() {
  const place = useArcade((s) => s.current)
  const items = useArcade((s) => s.items)
  const unlocks = useArcade((s) => s.unlocks)
  const team = useArcade((s) => s.style.team)
  // (redrawn when you move the tables in « Construire »)
  useArcade((s) => s.layout)
  const h = (id: ItemId) => items.includes(id)
  const cook = useRef<Walker & { at: number; wait: number }>({ pos: P(-3.5, -0.75), rot: Math.PI, moving: false, at: 0, wait: 0 })
  const server = useRef<Walker & { state: 'toStation' | 'toCounter'; carried: number[]; acc: number }>({ pos: P(0.5, -0.3), rot: 0, moving: false, state: 'toStation', carried: [], acc: 0 })
  const commis = useRef<Walker>({ pos: IDLE.clone(), rot: 0, moving: false })
  const [carried, setCarried] = useState<number[]>([])

  useFrame((_, raw) => {
    if (useVip.getState().open || useStory.getState().talking) return
    const dt = Math.min(raw, 0.1)
    const st = useArcade.getState()
    const active = [0, ...(st.unlocks.pan2 ? [1] : []), ...(st.unlocks.plat1 ? [2] : []), ...(st.unlocks.plat2 ? [3] : [])]
    // the cook: a few seconds at each stove that works, stirring
    if (has(st.current, 'cuisiniere')) {
      const c = cook.current
      const to = STATIONS[active[c.at % active.length]].clone().add(V(0, 0.8))
      const r = step(c.pos, to, 1.4, dt)
      c.moving = r.moving
      if (r.fast) c.rot = turn(c.rot, r.dir, Math.min(1, dt * 8))
      else c.rot = turn(c.rot, Math.PI, Math.min(1, dt * 6))
      if (!r.moving && (c.wait += dt) > 2.5) {
        c.wait = 0
        c.at++
      }
    }
    // the second server: from the fullest stove to the counter, like the first
    if (has(st.current, 'serveur2') && st.unlocks.serveur) {
      const w = server.current
      const station = [...st.station]
      const counter = [...st.counter]
      const max = st.unlocks.rapide ? 10 : 5
      let changed = false
      w.acc += dt
      while (w.acc >= TICK) {
        w.acc -= TICK
        // he takes the second fullest stove, so the two servers don't go to the same one
        const order = [...active].sort((a, b) => station[b] - station[a])
        const i = order[Math.min(1, order.length - 1)]
        if (w.state === 'toStation' && w.carried.length < max && station[i] > 0 && w.pos.distanceTo(stationFront(i)) < 0.6) {
          station[i]--
          w.carried.push(STATION_SLOT[i])
          fly('plate', TRAY(i), hands(w, () => w.carried.length))
          changed = true
        }
        if (w.state === 'toCounter' && w.carried.length && w.pos.distanceTo(COUNTER_BACK) < 0.5) {
          const k = w.carried.pop()!
          if (counter[k] < 8) {
            counter[k]++
            fly('plate', hands(w, () => w.carried.length)(), COUNTER_TOP(k))
            changed = true
          }
        }
      }
      if (w.state === 'toStation' && (w.carried.length >= max || (w.carried.length > 0 && active.every((i) => station[i] === 0)))) w.state = 'toCounter'
      if (w.state === 'toCounter' && !w.carried.length) w.state = 'toStation'
      const order = [...active].sort((a, b) => station[b] - station[a])
      const target = w.state === 'toStation' ? stationFront(order[Math.min(1, order.length - 1)]).add(V(0.3, 0.25)) : COUNTER_BACK.clone().add(V(-0.45, 0))
      const r = step(w.pos, target, SPEED * (st.unlocks.rapide ? 1.1 : 0.8), dt)
      w.moving = r.moving
      if (r.fast) w.rot = turn(w.rot, r.dir, Math.min(1, dt * 10))
      if (changed) useArcade.setState({ station, counter })
      if (w.carried.length !== carried.length) setCarried([...w.carried])
    }
    // the commis: picks up the money on the floor and the tips on the tables
    if (has(st.current, 'ramasseur')) {
      const c = commis.current
      // (only the tables downstairs: the commis doesn't climb)
      const tip = st.tableCash.slice(0, TABLES.length).findIndex((v) => v > 0)
      const to = st.cash > 0 ? CASH : tip >= 0 ? TABLES[tip].clone().add(V(0, -0.75)) : IDLE
      const r = step(c.pos, to, SPEED, dt)
      c.moving = r.moving
      if (r.fast) c.rot = turn(c.rot, r.dir, Math.min(1, dt * 10))
      if (st.cash > 0 && c.pos.distanceTo(CASH) < 0.7) {
        for (let k = 0; k < Math.min(8, Math.ceil(st.cash / 200)); k++) fly('cash', CASH.clone().setY(0.3), c.pos.clone().setY(1), k * 0.04, 0.3)
        popText(`Le commis ramasse : +${st.cash} FCFA`)
        sfx.cash()
        useArcade.setState({ money: st.money + st.cash, cash: 0 })
      } else if (tip >= 0 && c.pos.distanceTo(TABLES[tip].clone().add(V(0, -0.75))) < 0.6) {
        const tableCash = [...st.tableCash]
        const v = tableCash[tip]
        tableCash[tip] = 0
        fly('cash', TABLES[tip].clone().setY(0.9), c.pos.clone().setY(1), 0, 0.3)
        sfx.cash()
        useArcade.setState({ money: st.money + v, tableCash })
      }
    }
  })

  const dishes = placeDishes(PLACES[place])
  return (
    <>
      {h('cuisiniere') && <Mover who={others(['awa'])[0]} obj={cook.current} outfit={team} outfitKind="cook" />}
      {h('serveur2') && unlocks.serveur && <Mover who={others(['koffi'])[0]} obj={server.current} carried={carried.map((k) => dishes[k])} outfit={team} />}
      {h('ramasseur') && <Mover who={others(['yao'])[0]} obj={commis.current} outfit={team} />}
      {h('chaises') && unlocks.table && <ExtraChairs />}
      {h('tele') && <Tele />}
      {h('ventilo') && FANS.map((p, i) => <Fan key={i} position={p} />)}
      {h('musique') && <Music />}
      {h('frigo') && <Fridge />}
    </>
  )
}

/** Red plastic chairs, two more at each table (the front side). */
function ExtraChairs() {
  return (
    <>
      {TABLES.map((t, i) =>
        [-0.28, 0.28].map((dx) => (
          <group key={`${i}${dx}`} position={[t.x + dx, 0, t.z + 0.62]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0.42, 0]} castShadow>
              <boxGeometry args={[0.38, 0.05, 0.38]} />
              <Flat color="#e03131" />
            </mesh>
            <mesh position={[0, 0.7, -0.18]} castShadow>
              <boxGeometry args={[0.38, 0.5, 0.05]} />
              <Flat color="#e03131" />
            </mesh>
            {[
              [-0.16, -0.16],
              [0.16, -0.16],
              [-0.16, 0.16],
              [0.16, 0.16],
            ].map(([x, z], k) => (
              <mesh key={k} position={[x, 0.2, z]}>
                <cylinderGeometry args={[0.018, 0.018, 0.4, 5]} />
                <Flat color="#c92a2a" />
              </mesh>
            ))}
          </group>
        )),
      )}
    </>
  )
}

/** The TV on the wall, showing the match (the pitch and the players blinking). */
function Tele() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 144
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return { c, t }
  }, [])
  useEffect(() => () => tex.t.dispose(), [tex])
  const last = useRef(0)
  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    if (now - last.current < 0.25) return
    last.current = now
    const g = tex.c.getContext('2d')!
    g.fillStyle = '#2f9e44'
    g.fillRect(0, 0, 256, 144)
    g.strokeStyle = '#ffffff'
    g.lineWidth = 2
    g.strokeRect(8, 8, 240, 128)
    g.beginPath()
    g.moveTo(128, 8)
    g.lineTo(128, 136)
    g.stroke()
    g.beginPath()
    g.arc(128, 72, 18, 0, Math.PI * 2)
    g.stroke()
    // the players run, the ball goes
    for (let k = 0; k < 10; k++) {
      g.fillStyle = k < 5 ? '#ff922b' : '#ffffff'
      g.fillRect(40 + ((k * 37 + now * (k % 3 ? 20 : -14)) % 176 + 176) % 176, 20 + ((k * 23 + now * 9) % 104), 6, 9)
    }
    g.fillStyle = '#ffd43b'
    g.beginPath()
    g.arc(128 + Math.sin(now) * 70, 72 + Math.cos(now * 1.3) * 35, 3.5, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(0,0,0,.55)'
    g.fillRect(6, 6, 74, 16)
    g.fillStyle = '#fff'
    g.font = 'bold 12px sans-serif'
    g.fillText('CIV 2 - 1', 12, 18)
    tex.t.needsUpdate = true
  })
  return (
    <group position={[TV.x, 2.0, TV.z]}>
      <RoundedBox args={[1.25, 0.75, 0.06]} radius={0.02} castShadow>
        <Flat color="#212529" />
      </RoundedBox>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[1.15, 0.65]} />
        <meshBasicMaterial map={tex.t} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Fan({ position }: { position: THREE.Vector3 }) {
  const blades = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.z += dt * 18
  })
  return (
    <group position={position} rotation={[0, Math.PI / 4, 0]}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 0.05, 12]} />
        <Flat color="#dee2e6" />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.15, 6]} />
        <Flat color="#adb5bd" />
      </mesh>
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.015, 6, 20]} />
        <Flat color="#ced4da" />
      </mesh>
      <group ref={blades} position={[0, 1.2, 0.02]}>
        {[0, 1, 2].map((k) => (
          <mesh key={k} rotation={[0, 0, (k * Math.PI * 2) / 3]} position={[0, 0, 0]}>
            <boxGeometry args={[0.07, 0.36, 0.01]} />
            <Flat color="#4dabf7" />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Two speakers by the kitchen, and a string of coloured lights along the awning. */
function Music() {
  const bulbs = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    bulbs.current?.children.forEach((c, i) => {
      ;((c as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = (0.6 + Math.max(0, Math.sin(clock.elapsedTime * 6 + i)) * 1.6) * (0.6 + night() * 1.3)
    })
  })
  const colors = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2']
  return (
    <>
      {SPEAKERS.map((p, i) => (
        <group key={i} position={p}>
          <RoundedBox args={[0.45, 0.8, 0.4]} radius={0.04} position={[0, 0.4, 0]} castShadow>
            <Flat color="#212529" />
          </RoundedBox>
          {[0.55, 0.25].map((y, k) => (
            <mesh key={k} position={[0, y, 0.21]}>
              <circleGeometry args={[k ? 0.14 : 0.08, 16]} />
              <Flat color="#495057" />
            </mesh>
          ))}
        </group>
      ))}
      <group ref={bulbs}>
        {Array.from({ length: 24 }, (_, i) => (
          <mesh key={i} position={[-5.8 + i * 0.47, 2.25 + Math.sin(i * 1.3) * 0.06, -1.45]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color={colors[i % 5]} emissive={colors[i % 5]} emissiveIntensity={1} />
          </mesh>
        ))}
      </group>
    </>
  )
}

/** A drinks fridge with its glass door: bissap, gnamakoudji, sodas. */
function Fridge() {
  const sign = useMemo(() => signTexture('FRAIS', '#1c7ed6'), [])
  const bottles = [DISHES.bissap.color, DISHES.gnamakoudji.color, '#e03131', '#f08c00', '#fff']
  return (
    <group position={FRIDGE} rotation={[0, Math.PI / 4, 0]}>
      <RoundedBox args={[0.65, 1.6, 0.55]} radius={0.04} position={[0, 0.8, 0]} castShadow>
        <Flat color="#f1f3f5" />
      </RoundedBox>
      <mesh position={[0, 0.85, 0.28]}>
        <planeGeometry args={[0.52, 1.2]} />
        <meshStandardMaterial color="#a5d8ff" transparent opacity={0.45} roughness={0.05} />
      </mesh>
      {[0.45, 0.85, 1.25].map((y) =>
        bottles.map((c, k) => (
          <mesh key={`${y}${k}`} position={[-0.2 + k * 0.1, y, 0.18]}>
            <cylinderGeometry args={[0.03, 0.03, 0.16, 6]} />
            <Flat color={c ?? '#fff'} />
          </mesh>
        )),
      )}
      <mesh position={[0, 1.52, 0.28]}>
        <planeGeometry args={[0.5, 0.13]} />
        <meshStandardMaterial map={sign} />
      </mesh>
    </group>
  )
}
