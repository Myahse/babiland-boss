import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Avatar } from './Avatar'
import { burst, fly, FX } from './fx'
import { sfx } from './sfx'
import { Moto, type MotoObj } from './Moto'
import { TOON_READY, ToonPerson } from './ToonPerson'
import type { PersonId } from '../three/RealPerson'
import { moveInput } from './input'
import { BOUNDS, CASH, COUNTER, ENTER, LANE_X, OUT_PATH, PADS, seatApproach, SLOT0, SLOT_STEP, SEATS, SOLIDS, CASHIER, MOTO,  START, STATION_LEVELS, STATION_SLOT, STATIONS, TABLE_SOLIDS, TABLES, UPGRADE_PADS, UPGRADE_PRICES, V, type Unlock } from './layout'
import { CashPile, Counter, Pad, PlateStack, SquareTable, Station } from './Props'
import { maxQueue, popText, priceLeft, useArcade } from './store'
import { DISHES, dishPrice, placeDishes, PLACES, type Dish, type Place } from './places'

/** The name on a pad: the particular-dish pads show the dish of the place. */
const padLabel = (u: Unlock, p: Place) => (u === 'plat1' ? DISHES[p.extras[0]].label : u === 'plat2' ? DISHES[p.extras[1]].label : PADS[u].label)

// The whole shop simulation, updated every frame:
//  - stations cook plates by themselves; each place has its main dish and 2 particular dishes,
//    each with its own station (STATION_SLOT says which dish a station makes),
//  - Tantie Aya picks plates up when she walks next to a station and drops them on the counter
//    (the counter keeps one column per dish); each customer orders one dish,
//  - customers line up, take plates from the counter, pay; the money piles up on the floor,
//  - walking over the money collects it; standing on a pad spends it to unlock things,
//  - the server (once hired) carries plates from the stations to the counter on his own.

const SPEED = 2.8 // a brisk walk (faster looks like sliding)
const carryMax = () => (useArcade.getState().unlocks.plateau ? 16 : 8)
const COUNTER_MAX = 8 // per dish
const TICK = 0.13 // one plate moves every TICK seconds

const player = { pos: START.clone(), rot: 0, moving: false, vel: new THREE.Vector3() }
const cashier = { pos: CASHIER.clone(), rot: 0, moving: false }
const moto: MotoObj = { pos: MOTO.clone(), rot: Math.PI, visible: true }
const MOTO_BOX = () => moto.pos.clone().add(new THREE.Vector3(0, 1.0, 0.55))
/** the moto rides off along the side street and comes back: t 0..1 */
function motoPath(t: number) {
  const road = new THREE.Vector3(7.2, 0, MOTO.z)
  if (t < 0.15) return { p: MOTO.clone().lerp(road, t / 0.15), r: Math.PI / 2, vis: true }
  if (t < 0.4) return { p: road.clone().add(new THREE.Vector3(0, 0, -((t - 0.15) / 0.25) * 18)), r: Math.PI, vis: true }
  if (t < 0.6) return { p: road.clone().add(new THREE.Vector3(0, 0, -18)), r: Math.PI, vis: false }
  if (t < 0.85) return { p: road.clone().add(new THREE.Vector3(0.6, 0, -18 + ((t - 0.6) / 0.25) * 18)), r: 0, vis: true }
  return { p: road.clone().lerp(MOTO, (t - 0.85) / 0.15), r: -Math.PI / 2, vis: true }
}
/** camera distance (1 = normal); a « zoom out » button could change it */
export const view = { zoom: 1 }
// handy for the automatic play tests (move Tantie Aya directly)
if (import.meta.env.DEV) Object.assign(window, { arcadePlayer: player, arcadeView: view })

type Cust = { id: number; who: PersonId; pos: THREE.Vector3; rot: number; state: 'line' | 'eat' | 'out'; dish: number; want: number; got: number; moving: boolean; seat: number; eat: number; path: THREE.Vector3[]; wait: number }
const WHO: PersonId[] = ['koffi', 'awa', 'yao', 'fatou']

const slot = (k: number) => SLOT0.clone().addScaledVector(SLOT_STEP, k)
const stationFront = (i: number) => STATIONS[i].clone().add(V(0.55, 1.0))
const COUNTER_BACK = COUNTER.clone().add(V(0, -0.85))
const up = (v: THREE.Vector3, y: number) => v.clone().add(new THREE.Vector3(0, y, 0))
const TRAY = (i: number) => STATIONS[i].clone().add(new THREE.Vector3(0, 0.5, 1.0))
const COUNTER_TOP = (k = 0) => COUNTER.clone().add(new THREE.Vector3(-0.15 + k * 0.36, 1.15, 0))
/** top of the stack in someone's hands (moves with them) */
const hands = (o: { pos: THREE.Vector3; rot: number }, n: () => number) => () =>
  o.pos.clone().add(new THREE.Vector3(Math.sin(o.rot) * 0.45, 1.05 + n() * 0.075, Math.cos(o.rot) * 0.45))

// everyone the simulation walks (customers, server) keeps a velocity: they speed up, slow down as they
// arrive, and round the corners of their path instead of moving like robots
const vels = new WeakMap<THREE.Vector3, THREE.Vector3>()
function step(pos: THREE.Vector3, to: THREE.Vector3, speed: number, dt: number, stopAtEnd = true) {
  let v = vels.get(pos)
  if (!v) vels.set(pos, (v = new THREE.Vector3()))
  const d = new THREE.Vector3(to.x - pos.x, 0, to.z - pos.z)
  const l = d.length()
  if (l < 0.04 && v.length() < 0.08) {
    v.set(0, 0, 0)
    return { moving: false, dir: 0, fast: false }
  }
  const want = l > 1e-4 ? d.multiplyScalar(Math.min(speed, stopAtEnd ? l * 2.5 : speed) / l) : d.set(0, 0, 0)
  v.lerp(want, Math.min(1, dt * 6))
  pos.addScaledVector(v, dt)
  return { moving: true, dir: Math.atan2(v.x, v.z), fast: v.length() > 0.25 }
}
/** keep people apart: everyone pushes the others gently out of their way */
function separate(people: THREE.Vector3[], fixed: THREE.Vector3[], dt: number) {
  const R = 0.55
  const k = Math.min(1, dt * 8)
  for (let i = 0; i < people.length; i++) {
    const a = people[i]
    for (let j = i + 1; j < people.length; j++) {
      const b = people[j]
      const dx = a.x - b.x
      const dz = a.z - b.z
      const l = Math.hypot(dx, dz)
      if (l > R || l < 1e-4) continue
      const push = ((R - l) / 2) * k
      a.x += (dx / l) * push
      a.z += (dz / l) * push
      b.x -= (dx / l) * push
      b.z -= (dz / l) * push
    }
    for (const f of fixed) {
      const dx = a.x - f.x
      const dz = a.z - f.z
      const l = Math.hypot(dx, dz)
      if (l > R || l < 1e-4) continue
      a.x += (dx / l) * (R - l) * k
      a.z += (dz / l) * (R - l) * k
    }
  }
}
const turn = (from: number, to: number, k: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k

export function Sim({ name }: { name: string }) {
  const s = useArcade()
  const progress = useRef([0, 0, 0, 0])
  const acc = useRef(0)
  const custs = useRef<Cust[]>([])
  if (import.meta.env.DEV) Object.assign(window, { arcadeCusts: custs })
  const nextId = useRef(0)
  const spawn = useRef(1)
  const [, rerender] = useState(0)
  const bump = () => rerender((n) => n + 1)
  const worker = useRef({ pos: V(-1, -0.4), rot: 0, moving: false, state: 'toStation' as 'toStation' | 'toCounter', carried: [] as number[] })
  // arriving in this maquis: start at the entrance, the moto parked
  useEffect(() => {
    player.pos.copy(START)
    player.vel.set(0, 0, 0)
    moto.pos.copy(MOTO)
    moto.visible = true
  }, [])
  const motoT = useRef(0)
  const motoWait = useRef(4)
  const solids = useMemo(
    () => [
      ...SOLIDS,
      ...([s.unlocks.pan2, s.unlocks.plat1, s.unlocks.plat2] as (true | undefined)[]).flatMap((on, i) => (on ? [{ c: STATIONS[i + 1], hx: 0.6, hz: 0.45 }] : [])),
      ...(s.unlocks.table ? TABLE_SOLIDS : []),
    ],
    [s.unlocks.pan2, s.unlocks.plat1, s.unlocks.plat2, s.unlocks.table],
  )

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
    // the stations that work here: the main one, then the ones unlocked
    const active = [0, ...(st.unlocks.pan2 ? [1] : []), ...(st.unlocks.plat1 ? [2] : []), ...(st.unlocks.plat2 ? [3] : [])]
    const place = PLACES[st.current]

    // 1. cooking
    const plates = [...st.station]
    let changed = false
    for (const i of active) {
      const L = STATION_LEVELS[st.level[i] - 1]
      if (plates[i] >= L.max) {
        progress.current[i] = 1
        continue
      }
      progress.current[i] += dt / L.cook
      if (progress.current[i] >= 1) {
        progress.current[i] = 0
        plates[i]++
        changed = true
      }
    }

    // 2. moving Tantie Aya (with the joystick / keys), blocked by the counters and the plot's edge
    const inp = moveInput()
    // speed up and slow down smoothly instead of starting / stopping dead
    const v = player.vel
    v.x += (inp.x * SPEED - v.x) * Math.min(1, dt * 10)
    v.z += (inp.z * SPEED - v.z) * Math.min(1, dt * 10)
    if (Math.hypot(inp.x, inp.z) < 0.05 && v.length() < 0.08) v.set(0, 0, 0)
    player.moving = v.length() > 0.05
    if (player.moving) {
      const p = player.pos
      p.x = THREE.MathUtils.clamp(p.x + v.x * dt, BOUNDS.minX, BOUNDS.maxX)
      p.z = THREE.MathUtils.clamp(p.z + v.z * dt, BOUNDS.minZ, BOUNDS.maxZ)
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
      if (v.length() > 0.3) player.rot = turn(player.rot, Math.atan2(v.x, v.z), Math.min(1, dt * 12))
    }

    // 3. picking up / dropping / collecting, one plate at a time
    acc.current += dt
    const carried = [...st.carried]
    const counter = [...st.counter]
    let cash = st.cash
    let money = st.money
    const w = worker.current
    const wCarried = [...w.carried]
    const wMax = st.unlocks.rapide ? 10 : 5
    while (acc.current >= TICK) {
      acc.current -= TICK
      for (const i of active) {
        if (carried.length < carryMax() && plates[i] > 0 && (player.pos.distanceTo(STATIONS[i]) < 1.15 || player.pos.distanceTo(STATIONS[i].clone().add(V(0, 1.0))) < 0.9)) {
          plates[i]--
          carried.push(STATION_SLOT[i])
          changed = true
          fly('plate', TRAY(i), hands(player, () => useArcade.getState().carried.length))
          sfx.pick()
          break
        }
      }
      // at the counter, the plates go down one by one, each in the column of its dish
      if (carried.length > 0 && player.pos.distanceTo(COUNTER) < 1.35) {
        // the highest plate in the stack whose dish still has room on the counter (a full column must not block the rest)
        let idx = -1
        for (let j = carried.length - 1; j >= 0; j--) if (counter[carried[j]] < COUNTER_MAX) { idx = j; break }
        const k = idx >= 0 ? carried[idx] : -1
        if (idx >= 0) {
          carried.splice(idx, 1)
          counter[k]++
          changed = true
          fly('plate', hands(player, () => carried.length)(), COUNTER_TOP(k))
          sfx.drop()
        }
      }
      // the server works the same way
      if (st.unlocks.serveur) {
        for (const i of active)
          if (w.state === 'toStation' && wCarried.length < wMax && plates[i] > 0 && w.pos.distanceTo(stationFront(i)) < 0.6) {
            plates[i]--
            wCarried.push(STATION_SLOT[i])
            changed = true
            fly('plate', TRAY(i), hands(w, () => w.carried.length))
            break
          }
        if (w.state === 'toCounter' && wCarried.length > 0 && w.pos.distanceTo(COUNTER_BACK) < 0.5) {
          let idx = -1
          for (let j = wCarried.length - 1; j >= 0; j--) if (counter[wCarried[j]] < COUNTER_MAX) { idx = j; break }
          const k = idx >= 0 ? wCarried[idx] : -1
          if (idx >= 0) {
            wCarried.splice(idx, 1)
            counter[k]++
            changed = true
            fly('plate', hands(w, () => wCarried.length)(), COUNTER_TOP(k))
          } else wCarried.pop() // that column is full: put it back in the kitchen
        }
      }
    }
    // tips left on the tables
    const tableCash = [...st.tableCash]
    tableCash.forEach((v, i) => {
      if (v > 0 && player.pos.distanceTo(TABLES[i]) < 1.25) {
        for (let k = 0; k < Math.min(6, Math.ceil(v / 200)); k++) fly('cash', up(TABLES[i], 0.9), hands(player, () => 0), k * 0.05, 0.35)
        sfx.cash()
        money += v
        popText(`+${v} FCFA`)
        tableCash[i] = 0
        changed = true
      }
    })
    if (cash > 0 && player.pos.distanceTo(CASH) < 0.9) {
      for (let k = 0; k < Math.min(14, Math.ceil(cash / 200)); k++) fly('cash', up(CASH, 0.2 + (k % 5) * 0.15), hands(player, () => 0), k * 0.04, 0.35)
      sfx.cash()
      money += cash
      popText(`+${cash} FCFA`)
      cash = 0
      changed = true
    }

    // 4. unlock pads: money pours in while you stand on one
    const unlocks = { ...st.unlocks }
    const paid = { ...st.paid }
    for (const u of Object.keys(PADS) as Unlock[]) {
      const need = PADS[u].needs
      if (unlocks[u] || (need && !unlocks[need]) || money <= 0 || player.pos.distanceTo(PADS[u].pos) > 0.6) continue
      const give = Math.min(money, Math.ceil((PADS[u].price / 1.4) * dt), priceLeft(u))
      money -= give
      paid[u] = (paid[u] ?? 0) + give
      changed = true
      if (paid[u]! >= PADS[u].price) {
        unlocks[u] = true
        popText(`Débloqué : ${padLabel(u, place)} !`)
        burst(PADS[u].pos)
        sfx.unlock()
      }
    }
    // station upgrades « Plus vite »: same idea, one pad beside each station
    const level = [...st.level]
    const upPaid = [...st.upPaid]
    for (const i of active) {
      if (level[i] >= 3 || money <= 0 || player.pos.distanceTo(UPGRADE_PADS[i]) > 0.6) continue
      const price = UPGRADE_PRICES[level[i] - 1]
      const give = Math.min(money, Math.ceil((price / 1.4) * dt), price - upPaid[i])
      money -= give
      upPaid[i] += give
      changed = true
      if (upPaid[i] >= price) {
        level[i]++
        upPaid[i] = 0
        popText(level[i] === 3 ? 'Poste au MAX !' : 'Poste plus rapide !')
        burst(STATIONS[i])
        sfx.unlock()
      }
    }

    // 5. the server: go to the fullest station, fill up to 3 plates, bring them to the counter
    if (st.unlocks.serveur) {
      if (w.state === 'toStation' && (wCarried.length >= wMax || (wCarried.length > 0 && active.every((i) => plates[i] === 0)))) w.state = 'toCounter'
      if (w.state === 'toCounter' && wCarried.length === 0) w.state = 'toStation'
      const best = active.reduce((b, i) => (plates[i] > plates[b] ? i : b), active[0])
      const r = step(w.pos, w.state === 'toStation' ? stationFront(best) : COUNTER_BACK, SPEED * (st.unlocks.rapide ? 1.0 : 0.7), dt)
      w.moving = r.moving
      if (r.fast) w.rot = turn(w.rot, r.dir, Math.min(1, dt * 10))
      w.carried = wCarried
    }

    // 6. customers: arrive, line up, take their plates, pay, leave
    spawn.current -= dt
    const line = custs.current.filter((c) => c.state === 'line')
    if (spawn.current <= 0 && line.length < maxQueue()) {
      spawn.current = 1.6 + Math.random() * 1.6
      // what they want: mostly the main dish, sometimes a particular dish that is already on the menu
      const menu = [0, ...(unlocks.plat1 ? [1] : []), ...(unlocks.plat2 ? [2] : [])]
      const r = Math.random()
      const dish = menu.length === 1 || r < 0.55 ? 0 : menu[1 + Math.floor(Math.random() * (menu.length - 1))]
      custs.current.push({ id: nextId.current, who: WHO[nextId.current % WHO.length], pos: ENTER.clone(), rot: -Math.PI / 2, state: 'line', dish, want: 1 + Math.floor(Math.random() * (unlocks.table ? 4 : 3)), got: 0, moving: true, seat: -1, eat: 0, path: [], wait: 0 })
      nextId.current++
      bump()
    }
    let served = st.served
    line.forEach((c, k) => {
      const r = step(c.pos, slot(k), 1.4, dt)
      // « arrived at their place in the line »: close to it (the small nudges between neighbours don't count as walking)
      const atSpot = c.pos.distanceTo(slot(k)) < 0.3
      if (r.fast && !atSpot) c.rot = turn(c.rot, r.dir, Math.min(1, dt * 8))
      else c.rot = turn(c.rot, Math.PI, Math.min(1, dt * 6))
      if (atSpot === c.moving) {
        c.moving = !atSpot
        bump()
      }
      // someone has to be at the till: Tantie Aya herself, or the cashier once hired
      const tillManned = unlocks.caisse || player.pos.distanceTo(COUNTER) < 1.8
      // the first in line loses patience if their dish never comes: they leave, the next one steps up
      if (k === 0 && atSpot && c.state === 'line') {
        c.wait += dt
        if (c.wait > 25 && c.got === 0) {
          c.state = 'out'
          c.moving = true
          c.path = [V(c.pos.x - 0.6, 1.6), V(LANE_X, 1.6), ...OUT_PATH.map((v) => v.clone())]
          popText(`${DISHES[placeDishes(place)[c.dish]].icon} Trop long… le client est parti`)
          bump()
          return
        }
      }
      if (k === 0 && atSpot && tillManned && counter[c.dish] > 0 && c.got < c.want && acc.current < dt) {
        counter[c.dish]--
        c.got++
        changed = true
        fly('plate', COUNTER_TOP(c.dish), up(c.pos, 1.2), 0, 0.25)
        bump()
        if (c.got >= c.want) {
          cash += c.want * dishPrice(place, c.dish)
          served++
          for (let k = 0; k < Math.min(4, c.want); k++) fly('cash', up(c.pos, 1.0), up(CASH, 0.3 + k * 0.1), k * 0.06, 0.3)
          sfx.pay()
          c.moving = true
          // with the terrace open, they go and sit to eat; otherwise they take it away
          const taken = new Set(custs.current.filter((o) => o.state === 'eat').map((o) => o.seat))
          const free = unlocks.table ? SEATS.findIndex((_, i) => !taken.has(i)) : -1
          // walk along the aisle behind the tables, then step into the chair (never through a table)
          const aisle = (z: number) => [V(c.pos.x - 0.6, z)]
          if (free >= 0) {
            c.state = 'eat'
            c.seat = free
            c.eat = 7
            const a = seatApproach(free)
            c.path = [...aisle(a.z), a, SEATS[free].clone()]
          } else {
            c.state = 'out'
            c.path = [...aisle(1.6), V(LANE_X, 1.6), ...OUT_PATH.map((v) => v.clone())]
          }
        }
      }
    })
    custs.current.forEach((c) => {
      if (c.state === 'line') return
      // follow the path one point at a time
      if (c.path.length) {
        const last = c.path.length === 1
        const r = step(c.pos, c.path[0], 1.4, dt, last)
        if (r.fast) c.rot = turn(c.rot, r.dir, Math.min(1, dt * 8))
        // round the corners: head for the next point a little before reaching this one
        if (!r.moving || (!last && c.pos.distanceTo(c.path[0]) < 0.4)) c.path.shift()
        if (!c.moving) {
          c.moving = true
          bump()
        }
        return
      }
      if (c.state === 'out') {
        c.id = -1
        return
      }
      // arrived in the chair: face the table, eat for a while, then leave the way they came
      if (c.moving) {
        c.moving = false
        bump()
      }
      const seat = SEATS[c.seat]
      const tb = TABLES[Math.floor(c.seat / 2)]
      c.rot = turn(c.rot, Math.atan2(tb.x - seat.x, tb.z - seat.z), Math.min(1, dt * 8))
      c.eat -= dt
      if (c.eat <= 0) {
        c.state = 'out'
        // they leave a tip on the table
        tableCash[Math.floor(c.seat / 2)] += 100 * c.want
        const a = seatApproach(c.seat)
        c.path = [a, V(LANE_X, a.z), ...OUT_PATH.map((v) => v.clone())]
        changed = true
        bump()
      }
    })
    // nobody walks through anybody (seated people and Tantie Aya don't get pushed)
    const walking = custs.current.filter((c) => c.id >= 0 && !(c.state === 'eat' && !c.path.length)).map((c) => c.pos)
    if (st.unlocks.serveur) walking.push(w.pos)
    separate(walking, [player.pos], dt)
    if (custs.current.some((c) => c.id < 0)) {
      custs.current = custs.current.filter((c) => c.id >= 0)
      bump()
    }

    // 7. moto delivery: a phone order waits at the moto; load it, it rides off, the money comes back
    let delivery = st.delivery
    if (unlocks.moto) {
      if (delivery.state === 'none') {
        motoWait.current -= dt
        if (motoWait.current <= 0) {
          delivery = { want: 3 + Math.floor(Math.random() * 4), got: 0, state: 'wait' }
          popText('📱 Nouvelle commande à livrer !')
          sfx.pay()
          changed = true
        }
      } else if (delivery.state === 'wait') {
        let got = delivery.got
        if (acc.current < dt) {
          // deliveries are always the main dish of the place
          const idx = carried.lastIndexOf(0)
          if (idx >= 0 && got < delivery.want && player.pos.distanceTo(MOTO) < 1.4) {
            carried.splice(idx, 1)
            got++
            fly('plate', hands(player, () => carried.length)(), MOTO_BOX())
            sfx.drop()
          } else if (unlocks.livreur && counter[0] > 0 && got < delivery.want) {
            // the livreur takes the plates from the counter himself
            counter[0]--
            got++
            fly('plate', COUNTER_TOP(0), MOTO_BOX(), 0, 0.45)
          }
        }
        if (got !== delivery.got) {
          changed = true
          delivery = { ...delivery, got }
          if (got >= delivery.want) {
            delivery = { ...delivery, state: 'away' }
            motoT.current = 0
            cash += delivery.want * Math.round(PLACES[st.current].plate * 1.4)
            for (let k = 0; k < 4; k++) fly('cash', MOTO_BOX(), up(CASH, 0.3 + k * 0.1), k * 0.06, 0.4)
            popText(`🛵 Livraison : +${delivery.want * Math.round(PLACES[st.current].plate * 1.4)} FCFA`)
            sfx.unlock()
          }
        }
      } else if (delivery.state === 'away') {
        motoT.current += dt / 14
        if (motoT.current >= 1) {
          delivery = { want: 0, got: 0, state: 'none' }
          motoWait.current = 3 + Math.random() * 4
          changed = true
        }
      }
    }
    const mp = delivery.state === 'away' ? motoPath(Math.min(1, motoT.current)) : { p: MOTO, r: Math.PI, vis: true }
    moto.pos.copy(mp.p)
    moto.rot = mp.r
    moto.visible = mp.vis

    if (changed || carried.length !== st.carried.length) set({ station: plates, carried, counter, cash, money, unlocks, paid, served, workerCarried: wCarried, tableCash, level, upPaid, delivery })
  })

  const dishes = placeDishes(PLACES[s.current])
  return (
    <>
      {STATIONS.map((pos, i) =>
        i === 0 || s.unlocks[(['pan2', 'plat1', 'plat2'] as Unlock[])[i - 1]] ? (
          <Station key={i} plates={s.station[i]} progress={progress.current[i]} level={s.level[i]} dish={dishes[STATION_SLOT[i]]} position={pos} />
        ) : null,
      )}
      {STATIONS.map((_, i) =>
        (i === 0 || s.unlocks[(['pan2', 'plat1', 'plat2'] as Unlock[])[i - 1]]) && s.level[i] < 3 ? (
          <Pad key={`up${i}`} label={`Plus vite · niv ${s.level[i] + 1}`} price={UPGRADE_PRICES[s.level[i] - 1]} left={UPGRADE_PRICES[s.level[i] - 1] - s.upPaid[i]} position={UPGRADE_PADS[i]} />
        ) : null,
      )}
      <FX />
      <Counter stock={s.counter} dishes={dishes} name={name} dish={PLACES[s.current].dishLabel} position={COUNTER} />
      <CashPile amount={s.cash} position={CASH} />
      {s.unlocks.table &&
        TABLES.map((t, i) => (
          <SquareTable key={i} position={t} cash={s.tableCash[i]} plates={custs.current.filter((c) => c.state === 'eat' && !c.moving && Math.floor(c.seat / 2) === i).length} />
        ))}
      {(Object.keys(PADS) as Unlock[]).map((u) => (!s.unlocks[u] && (!PADS[u].needs || s.unlocks[PADS[u].needs!]) ? <Pad key={u} label={padLabel(u, PLACES[s.current])} price={PADS[u].price} left={PADS[u].price - (s.paid[u] ?? 0)} position={PADS[u].pos} /> : null))}
      <Mover who="aya" obj={player} carried={s.carried.map((k) => dishes[k])} full={s.carried.length >= (s.unlocks.plateau ? 16 : 8)} />
      {s.unlocks.serveur && <Mover who="yao" obj={worker.current} carried={s.workerCarried.map((k) => dishes[k])} />}
      {s.unlocks.caisse && <Mover who="fatou" obj={cashier} />}
      {s.unlocks.moto && <Moto obj={moto} want={s.delivery.want} got={s.delivery.got} waiting={s.delivery.state === 'wait'} />}
      {custs.current.map((c, k) => (
        <Mover key={c.id} who={c.who} obj={c} sitting={c.state === 'eat' && !c.moving}>
          {k === 0 && c.state === 'line' && !c.moving && <Wants dish={dishes[c.dish]} want={c.want} got={c.got} />}
        </Mover>
      ))}
      <Follow />
    </>
  )
}

/** A person whose position/rotation is driven by the simulation (player, server or customer). */
function Mover({ who, obj, carried = [], sitting = false, full = false, children }: { who: PersonId; obj: { pos: THREE.Vector3; rot: number; moving: boolean }; carried?: Dish[]; sitting?: boolean; full?: boolean; children?: React.ReactNode }) {
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
      {TOON_READY.includes(who) ? <ToonPerson who={who} moving={moving} carrying={carried.length > 0} sitting={sitting} track={obj} scale={1.2} /> : <Avatar who={who} moving={moving} carrying={carried.length > 0} />}
      {carried.length > 0 && <PlateStack count={carried.length} dishes={carried} wobble position={[0, 1.0, 0.45]} />}
      {full && (
        <Html position={[0, 1.15 + carried.length * 0.075, 0.45]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="text-3xl font-extrabold text-[#ff2d55]" style={{ textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff' }}>
            MAX
          </div>
        </Html>
      )}
      {children}
    </group>
  )
}

/** What the customer at the counter wants: plates, and how many they already got. */
function Wants({ dish, want, got }: { dish: Dish; want: number; got: number }) {
  return (
    <Html position={[0, 1.95, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pop flex items-center gap-1.5 rounded-2xl border-[3px] border-[var(--color-ink)] bg-white px-3 py-1 text-xl font-extrabold whitespace-nowrap shadow-lg">
        <span>{DISHES[dish].icon}</span>
        <span className="text-xs leading-none">{DISHES[dish].label}</span>
        <span>
          {got}/{want}
        </span>
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
    // seen from a corner, high up: the shop looks like a diamond, like in the shop games
    const far = (size.width < size.height ? 1.85 : 1.2) * view.zoom
    const t = new THREE.Vector3(player.pos.x * 0.7, 0, player.pos.z * 0.7)
    camera.position.lerp(t.clone().add(new THREE.Vector3(6.2 * far, 9.5 * far, 6.2 * far)), 1 - Math.exp(-dt * 4))
    look.lerp(t, 1 - Math.exp(-dt * 4))
    camera.lookAt(look)
  })
  return null
}
