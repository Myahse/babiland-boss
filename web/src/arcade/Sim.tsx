import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Avatar } from './Avatar'
import { burst, floatText, fly, FX, sparks } from './fx'
import { say, sfx } from './sfx'
import { Moto, type MotoObj } from './Moto'
import { TOON_READY, ToonPerson } from './ToonPerson'
import type { PersonId } from '../three/RealPerson'
import { camYaw, moveInput } from './input'
import { EXIT, EXT_AISLE_X, EXT_FRONT_Z, EXT_TABLES, EXT_TABLE_SOLIDS, EXT_WALK, extPath, isExt, tableZone, COUNTER_BACK, ALL_SEATS, ALL_TABLES, approach, FLOOR1, isUp, STAIR_FOOT, STAIR_IN, STAIR_SOLID, STAIR_TOP, STAIR_X, UP_BOUNDS, UP_TABLES, BIN, VITRINE, VITRINE_DROP, VITRINE_MAX, PAD_INFO, UPGRADE_INFO, CORNER_PADS, GROW_PAD, BULK_CLIENTS, BULK_EVERY, BULK_MIN_SERVED, BULK_PAY, BULK_TIME, CRATE, BOUNDS, CASH, COUNTER, ENTER, LANE_X, OUT_PATH, PADS, SLOT0, SLOT_STEP, SOLIDS, CASHIER, MOTO,  START, STATION_LEVELS, STATION_SLOT, STATIONS, TABLE_SOLIDS, TABLES, UPGRADE_PADS, UPGRADE_PRICES, V, type Unlock } from './layout'
import { Bin, CashPile, Counter, Pad, PadHint, PlateStack, SquareTable, Station } from './Props'
import { SideStands } from './SideStands'
import { SIDE_SOLIDS } from './side'
import { addFame, celebrate, maxQueue, popText, priceLeft, useArcade } from './store'
import { bonusOf, cutFor, payCut, tickTurf } from './turf'
import { fx, has } from './items'
import { arrivals, Zones } from './Annexe'
import { applyLayout, DEFAULT_LAYOUT, rectOf } from './furniture'
import { BuildEditor, DecorLayer } from './Build'
import { TerraceTable } from './Shop'
import { StairMarks, Stairs } from './Stairs'
import { tier } from './looks'
import { Icon, type IconName } from './Icons'
import { STAGE_ICONS } from './HudExtras'
import { nightCustomers } from './daynight'
import { saleBoost } from './online'
import { others, playerWho, useProfile } from './profile'
import { StoryArrow } from './Story'
import { Staff } from './Staff'
import { currentStep, useStory } from './story'
import { DISHES, placeDishes, PLACES, type Dish, type Place } from './places'
import { missionEvent } from './missions'
import { FAME, fameLevel, fameSpawn, sellPrice, stagePrice, STAGES } from './growth'
import { RECIPES, vipCall, useVip, vipPay, VIPS, VIP_EVERY, VIP_FIRST, VIP_MIN_SERVED, VIP_PATIENCE } from './vip'

/** Can this pad show up here: a little corner only has a 2nd stove and a bigger tray to unlock. */
const padOpen = (u: Unlock, stage: number) => stage >= 1 || CORNER_PADS.includes(u)

/** The pads you can see now: only the next few things to buy (the cheapest first, and any you started paying),
 * so the floor isn't covered with prices. The same list decides what you can pay on. */
const SHOWN = 3
type PadView = { key: string; u?: Unlock; i?: number; price: number; left: number; pos: THREE.Vector3; label: string; icon: IconName; text: string }
function padsShown(st: ReturnType<typeof useArcade.getState>): PadView[] {
  const place = PLACES[st.current]
  const all: PadView[] = []
  for (const u of Object.keys(PADS) as Unlock[]) {
    const need = PADS[u].needs
    if (st.unlocks[u] || !padOpen(u, st.stage) || (need && !st.unlocks[need])) continue
    all.push({ key: `u:${u}`, u, price: PADS[u].price, left: PADS[u].price - (st.paid[u] ?? 0), pos: PADS[u].pos, label: padLabel(u, place), icon: PAD_INFO[u].icon, text: u === 'plat1' || u === 'plat2' ? `${padLabel(u, place)} : ${PAD_INFO[u].text}` : PAD_INFO[u].text })
  }
  STATIONS.forEach((_, i) => {
    if (!(i === 0 || st.unlocks[(['pan2', 'plat1', 'plat2'] as Unlock[])[i - 1]]) || st.level[i] >= STATION_LEVELS.length) return
    const price = UPGRADE_PRICES[st.level[i] - 1]
    all.push({ key: `up:${i}`, i, price, left: price - st.upPaid[i], pos: UPGRADE_PADS[i], label: `Plus vite · niv ${st.level[i] + 1}`, icon: UPGRADE_INFO.icon, text: UPGRADE_INFO.text })
  })
  // always shown: the ones you started paying, and the one the story points at
  const goal = currentStep()?.target?.()
  const keep = all.filter((p) => p.left < p.price || (goal && p.pos.distanceTo(goal) < 0.01))
  const next = all.filter((p) => !keep.includes(p)).sort((a, b) => a.price - b.price).slice(0, Math.max(0, SHOWN - keep.length))
  return [...keep, ...next]
}

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

const SPEED = 2.9 // a brisk walk (faster looks like sliding)
const carryMax = () => (useArcade.getState().unlocks.plateau ? 16 : 8)
const COUNTER_MAX = 8 // per dish
const TICK = 0.13 // one plate moves every TICK seconds

/** `floor`: 0 downstairs, 1 upstairs (the restaurant's terrace); `climb`: going up or down the stairs */
const player = { pos: START.clone(), rot: 0, moving: false, vel: new THREE.Vector3(), floor: 0 as 0 | 1, climb: null as null | { pts: THREE.Vector3[]; t: number; to: 0 | 1 }, armed: true }
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
const TERRACE_CAM = new THREE.Vector3(2.4, 10.2, 9.2)
const TERRACE_LOOK = new THREE.Vector3(-0.5, 3.1, -3.3)
// handy for the automatic play tests (move Tantie Aya directly)
if (import.meta.env.DEV) Object.assign(window, { arcadePlayer: player, arcadeView: view })

/** where a customer can ask to sit (« Je veux m'asseoir… »): you take them there yourself for a big tip */
export type Wish = 'haut' | 'bas' | 'seul' | 'monde' | 'deco' | 'salle'
export const WISHES: Record<Wish, { text: string; icon: IconName }> = {
  haut: { text: 'En haut, sur la terrasse', icon: 'up' },
  bas: { text: 'En bas, dehors', icon: 'chair' },
  seul: { text: 'Une table pour moi seul', icon: 'person' },
  monde: { text: 'À côté de quelqu’un', icon: 'hand' },
  deco: { text: 'Près d’une décoration', icon: 'leaves' },
  salle: { text: 'Dans la salle climatisée', icon: 'fan' },
}
const ASK_WAIT = 16 // seconds they wait to be taken to a table, then they find a place themselves
const LEAD_TIME = 35 // seconds they follow you before giving up and sitting anywhere
const woman = (c: { who: PersonId }) => c.who === 'awa' || c.who === 'fatou' || c.who === 'aya'
let askHinted = false
let stairHinted = false
type Cust = { id: number; who: PersonId; pos: THREE.Vector3; rot: number; state: 'line' | 'ask' | 'eat' | 'out'; wish?: Wish; follow?: boolean; trail?: THREE.Vector3[]; tip?: number; dish: number; want: number; got: number; moving: boolean; seat: number; eat: number; path: THREE.Vector3[]; wait: number; vip?: string }
const WHO: PersonId[] = ['koffi', 'awa', 'yao', 'fatou']

const slot = (k: number) => SLOT0.clone().addScaledVector(SLOT_STEP, k)
export const stationFront = (i: number) => STATIONS[i].clone().add(V(0.55, 1.0))
export { COUNTER_BACK } from './layout'
const up = (v: THREE.Vector3, y: number) => v.clone().add(new THREE.Vector3(0, y, 0))
export const TRAY = (i: number) => STATIONS[i].clone().add(new THREE.Vector3(0, 0.5, 1.0))
export const COUNTER_TOP = (k = 0) => COUNTER.clone().add(new THREE.Vector3(-0.15 + k * 0.36, 1.15, 0))
/** top of the stack in someone's hands (moves with them) */
export const hands = (o: { pos: THREE.Vector3; rot: number }, n: () => number) => () =>
  o.pos.clone().add(new THREE.Vector3(Math.sin(o.rot) * 0.45, 1.05 + n() * 0.075, Math.cos(o.rot) * 0.45))

// everyone the simulation walks (customers, server) keeps a velocity: they speed up, slow down as they
// arrive, and round the corners of their path instead of moving like robots
const vels = new WeakMap<THREE.Vector3, THREE.Vector3>()
export function step(pos: THREE.Vector3, to: THREE.Vector3, speed: number, dt: number, stopAtEnd = true) {
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
export const turn = (from: number, to: number, k: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k

export function Sim({ name }: { name: string }) {
  const s = useArcade()
  const progress = useRef([0, 0, 0, 0])
  const acc = useRef(0)
  const custs = useRef<Cust[]>([])
  if (import.meta.env.DEV) Object.assign(window, { arcadeCusts: custs })
  const nextId = useRef(0)
  const spawn = useRef(1)
  const vipT = useRef(VIP_FIRST)
  const bulkT = useRef(45)
  if (import.meta.env.DEV) Object.assign(window, { arcadeBulkT: bulkT })
  const bulkAcc = useRef(0)
  if (import.meta.env.DEV) Object.assign(window, { arcadeVipT: vipT })
  vipCall.now = () => (vipT.current = 0)
  // leaving this maquis: a VIP waiting here is gone
  useEffect(() => () => useVip.setState({ ready: null, open: false, done: null }), [])
  const [, rerender] = useState(0)
  const bump = () => rerender((n) => n + 1)
  const fullHint = useRef(0)
  const binT = useRef(0)
  const vitT = useRef(3)
  const worker = useRef({ pos: V(-1, -0.4), rot: 0, moving: false, state: 'toStation' as 'toStation' | 'toCounter', carried: [] as number[] })
  // once the stairs are there, nothing you placed before may stand at their foot: it goes back to its first place
  const stage = s.stage
  const layout = s.layout
  useEffect(() => {
    if (stage < 2 || !layout) return
    const foot = { x0: -5.75, x1: -4.75, z0: 1.15, z1: 2.15 }
    const hit = (r: { x0: number; x1: number; z0: number; z1: number }) => r.x0 < foot.x1 && foot.x0 < r.x1 && r.z0 < foot.z1 && foot.z0 < r.z1
    // the pieces' solid part only (the room around them can be walked through)
    const solid = (x: number, z: number, hx: number, hz: number) => hit({ x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz })
    const L = { ...layout, st: [...layout.st], tables: [...layout.tables] }
    let moved = false
    L.st.forEach(([x, z], i) => solid(x, z, 0.6, 0.45) && ((L.st[i] = DEFAULT_LAYOUT.st[i]), (moved = true)))
    L.tables.forEach(([x, z], i) => solid(x, z, 0.95, 0.45) && ((L.tables[i] = DEFAULT_LAYOUT.tables[i]), (moved = true)))
    if (solid(L.counter[0], L.counter[1], 0.9, 0.42)) (L.counter = DEFAULT_LAYOUT.counter), (moved = true)
    if (hit(rectOf({ kind: 'bin' }, L.bin[0], L.bin[1]))) (L.bin = DEFAULT_LAYOUT.bin), (moved = true)
    if (moved) {
      useArcade.setState({ layout: L })
      popText('Un meuble gênait l’escalier : il est revenu à sa place')
    }
  }, [stage, layout])
  // arriving in this maquis: start at the entrance, the moto parked
  useEffect(() => {
    player.pos.copy(START)
    player.vel.set(0, 0, 0)
    player.floor = 0
    player.climb = null
    moto.pos.copy(MOTO)
    moto.visible = true
  }, [])
  const motoT = useRef(0)
  const motoWait = useRef(4)
  const solids = useMemo(
    () => [
      ...SOLIDS,
      ...SIDE_SOLIDS,
      ...([s.unlocks.pan2, s.unlocks.plat1, s.unlocks.plat2] as (true | undefined)[]).flatMap((on, i) => (on ? [{ c: STATIONS[i + 1], hx: 0.6, hz: 0.45 }] : [])),
      ...(s.unlocks.table ? TABLE_SOLIDS : []),
      ...(s.stage >= 2 ? [STAIR_SOLID] : []),
      ...(s.stage >= 3 ? EXT_TABLE_SOLIDS : []),
    ],
    [s.unlocks.pan2, s.unlocks.plat1, s.unlocks.plat2, s.unlocks.table, s.stage],
  )

  const redraw = useRef(0)
  useFrame((_, rawDt) => {
    // the VIP's cooking screen is open: the shop waits
    if (useVip.getState().open || useStory.getState().talking || useArcade.getState().building) return
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
    // what the assistants and the things in the room do (« Aménager »)
    const F = fx(st.current)

    // 1. cooking
    const plates = [...st.station]
    let changed = false
    for (const i of active) {
      const L = STATION_LEVELS[st.level[i] - 1]
      if (plates[i] >= L.max) {
        progress.current[i] = 1
        continue
      }
      // key zone « marché »: stations cook faster
      progress.current[i] += (dt * (1 + bonusOf(st.current, 'cook')) * F.cook * (Date.now() < st.marketUntil ? 1.25 : 1)) / L.cook
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
    if (player.climb) {
      // going up or down the stairs: along the steps, then one step off them
      const c = player.climb
      c.t = Math.min(1, c.t + dt / 1.6)
      const [a, b, e] = c.pts
      const k = c.t < 0.82 ? c.t / 0.82 : (c.t - 0.82) / 0.18
      const from = c.t < 0.82 ? a : b
      const to = c.t < 0.82 ? b : e
      const prev = player.pos.clone()
      player.pos.lerpVectors(from, to, k)
      player.moving = true
      v.set(0, 0, 0)
      player.rot = turn(player.rot, Math.atan2(player.pos.x - prev.x, player.pos.z - prev.z), Math.min(1, dt * 12))
      if (c.t >= 1) {
        player.floor = c.to
        player.climb = null
        player.armed = false
      }
    } else if (player.moving) {
      const p = player.pos
      const B = player.floor ? UP_BOUNDS : BOUNDS
      // downstairs with the extension: the plot, the opening at the end of the side wall, the room
      const rects = !player.floor && st.stage >= 3 ? [B, ...EXT_WALK] : [B]
      const nx = p.x + v.x * dt
      const nz = p.z + v.z * dt
      let best = Infinity
      for (const r of rects) {
        const cx = THREE.MathUtils.clamp(nx, r.minX, r.maxX)
        const cz = THREE.MathUtils.clamp(nz, r.minZ, r.maxZ)
        const d = Math.hypot(cx - nx, cz - nz)
        if (d < best) {
          best = d
          p.x = cx
          p.z = cz
        }
      }
      p.y = player.floor ? FLOOR1 : 0
      for (const b of player.floor ? [] : solids) {
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

    // the stairs (from the restaurant on): walk into the foot to go up, into the top to come down
    if (st.stage >= 2 && !player.climb) {
      const flat = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z)
      const at = player.floor ? flat(player.pos, STAIR_TOP) : flat(player.pos, STAIR_IN)
      if (at > 0.9) player.armed = true
      if (player.armed && at < 0.6) {
        player.climb = player.floor
          ? { pts: [STAIR_TOP.clone(), STAIR_FOOT.clone(), V(STAIR_X + 0.55, 2.2)], t: 0, to: 0 }
          : { pts: [STAIR_FOOT.clone(), STAIR_TOP.clone(), STAIR_TOP.clone().add(new THREE.Vector3(0.65, 0, -0.45))], t: 0, to: 1 }
        sfx.pick()
      }
    } else if (st.stage < 2 && !stairHinted && player.pos.x < -4.6 && player.pos.z < 1.0) {
      // walking along the left wall before the stairs exist: say when they come
      stairHinted = true
      popText(`L’escalier et l’étage arrivent quand ton maquis devient un Restaurant (marche sur le carré « Agrandir »)`)
    } else if (st.stage < 2 && player.floor) {
      player.floor = 0
      player.pos.set(STAIR_X + 0.55, 0, 2.2)
    }

    // 3. picking up / dropping / collecting, one plate at a time
    acc.current += dt
    const carried = [...st.carried]
    const counter = [...st.counter]
    let cash = st.cash
    let money = st.money
    let vitrine = st.vitrine
    const w = worker.current
    const wCarried = [...w.carried]
    const wMax = st.unlocks.rapide ? 10 : 5
    binT.current = player.pos.distanceTo(BIN) < 0.6 ? binT.current + dt : 0
    while (acc.current >= TICK) {
      acc.current -= TICK
      for (const i of active) {
        if (carried.length < carryMax() && plates[i] > 0 && (player.pos.distanceTo(STATIONS[i]) < 1.35 || player.pos.distanceTo(STATIONS[i].clone().add(V(0, 1.0))) < 1.1)) {
          plates[i]--
          carried.push(STATION_SLOT[i])
          changed = true
          fly('plate', TRAY(i), hands(player, () => useArcade.getState().carried.length))
          sfx.pick()
          break
        }
      }
      // the takeaway window of the annexe: the plates you carry go in (any dish), up to VITRINE_MAX
      if (carried.length > 0 && vitrine < VITRINE_MAX && has(st.current, 'vitrine') && player.pos.distanceTo(VITRINE_DROP) < 0.9) {
        carried.pop()
        vitrine++
        changed = true
        fly('plate', hands(player, () => carried.length)(), VITRINE.clone().setY(1.0))
        sfx.drop()
      }
      // the bin: the plates you carry go in, one by one
      // (only after half a second standing on it: walking across it never throws anything away)
      if (carried.length > 0 && binT.current > 0.5) {
        carried.pop()
        changed = true
        fly('plate', hands(player, () => carried.length)(), BIN.clone().add(new THREE.Vector3(0.5, 0.85, -0.45)))
        sfx.drop()
        if (!carried.length) popText('Jeté à la poubelle')
      }
      // at the counter, the plates go down one by one, each in the column of its dish
      if (carried.length > 0 && player.pos.distanceTo(COUNTER) < 1.6) {
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
        } else if (performance.now() - fullHint.current > 8000) {
          // nothing of what you carry fits: say where it can go
          fullHint.current = performance.now()
          popText('Le comptoir est plein pour ce plat : sers les clients, ou jette-le à la poubelle')
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
    const tableCash = ALL_TABLES.map((_, i) => st.tableCash[i] ?? 0)
    tableCash.forEach((v, i) => {
      if (v > 0 && player.pos.distanceTo(ALL_TABLES[i]) < 1.25) {
        for (let k = 0; k < Math.min(6, Math.ceil(v / 200)); k++) fly('cash', up(ALL_TABLES[i], 0.9), hands(player, () => 0), k * 0.05, 0.35)
        say('cadeau', { chance: 0.3 })
        sfx.cash()
        money += v
        popText(`+${v} FCFA`)
        tableCash[i] = 0
        changed = true
      }
    })
    if (cash > 0 && player.pos.distanceTo(CASH) < 1.2) {
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
    const shown = new Set(padsShown(st).map((p) => p.key))
    for (const u of Object.keys(PADS) as Unlock[]) {
      const need = PADS[u].needs
      if (!shown.has(`u:${u}`) || unlocks[u] || !padOpen(u, st.stage) || (need && !unlocks[need]) || money <= 0 || player.pos.distanceTo(PADS[u].pos) > 0.6) continue
      const give = Math.min(money, Math.ceil((PADS[u].price / 1.4) * dt), priceLeft(u))
      money -= give
      paid[u] = (paid[u] ?? 0) + give
      changed = true
      if (paid[u]! >= PADS[u].price) {
        unlocks[u] = true
        missionEvent('unlock')
        popText(`Débloqué : ${padLabel(u, place)} !`)
        burst(PADS[u].pos)
        sfx.unlock()
      }
    }
    // growing the place: once enough people know you, pay on the golden pad
    let stage = st.stage
    let growPaid = st.growPaid
    const nextStage = STAGES[stage + 1]
    if (nextStage && fameLevel(st.fame) >= nextStage.fame && money > 0 && player.pos.distanceTo(GROW_PAD) < 0.6) {
      const price = stagePrice(st.current, stage + 1)
      const give = Math.min(money, Math.ceil((price / 1.6) * dt), price - growPaid)
      money -= give
      growPaid += give
      changed = true
      if (growPaid >= price) {
        stage++
        say('grand', { important: true })
        growPaid = 0
        missionEvent('unlock')
        burst(GROW_PAD, 80)
        burst(COUNTER, 60)
        sfx.unlock()
        celebrate('grow', stage)
      }
    }
    // station upgrades « Plus vite »: same idea, one pad beside each station
    const level = [...st.level]
    const upPaid = [...st.upPaid]
    for (const i of active) {
      if (!shown.has(`up:${i}`) || level[i] >= STATION_LEVELS.length || money <= 0 || player.pos.distanceTo(UPGRADE_PADS[i]) > 0.6) continue
      const price = UPGRADE_PRICES[level[i] - 1]
      const give = Math.min(money, Math.ceil((price / 1.4) * dt), price - upPaid[i])
      money -= give
      upPaid[i] += give
      changed = true
      if (upPaid[i] >= price) {
        level[i]++
        missionEvent('unlock')
        upPaid[i] = 0
        popText(`Réchaud niveau ${level[i]}${level[i] >= STATION_LEVELS.length ? ' (MAX)' : ''} : ${tier(level[i]).name} !`)
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

    // the takeaway window sells by itself to the people walking by
    vitT.current -= dt
    if (vitrine > 0 && vitT.current <= 0) {
      vitT.current = 2.5 + Math.random() * 2.5
      vitrine--
      const pay = Math.round(sellPrice(st.current, 0, st.stage) * 1.2 * (1 - cutFor(st.current)))
      money += pay
      changed = true
      floatText(VITRINE.clone().setY(0.6), `+${pay}`, '#f08c00')
      sfx.cash()
    }

    // 6. customers: arrive, line up, take their plates, pay, leave
    spawn.current -= dt
    const line = custs.current.filter((c) => c.state === 'line')
    // the parking: someone gets out of a car that has just parked and comes to queue
    while (arrivals.length) {
      const at = arrivals.shift()!
      if (line.length >= maxQueue() + 2) continue
      const menu = [0, ...(unlocks.plat1 ? [1] : []), ...(unlocks.plat2 ? [2] : [])]
      custs.current.push({ id: nextId.current, who: others(WHO)[nextId.current % WHO.length], pos: at.clone(), rot: -Math.PI / 2, state: 'line', dish: menu[Math.floor(Math.random() * menu.length)], want: 1 + Math.floor(Math.random() * 3), got: 0, moving: true, seat: -1, eat: 0, path: [], wait: 0 })
      nextId.current++
      bump()
    }
    if (spawn.current <= 0 && line.length < maxQueue()) {
      // key zone « zone industrielle »: more customers
      // more customers when the place is bigger and more people know you
      spawn.current = (1.6 + Math.random() * 1.6) / ((1 + bonusOf(st.current, 'customers')) * STAGES[st.stage].spawn * fameSpawn(st.fame) * F.customers * nightCustomers())
      // what they want: mostly the main dish, sometimes a particular dish that is already on the menu
      const menu = [0, ...(unlocks.plat1 ? [1] : []), ...(unlocks.plat2 ? [2] : [])]
      const r = Math.random()
      const dish = menu.length === 1 || r < 0.55 ? 0 : menu[1 + Math.floor(Math.random() * (menu.length - 1))]
      custs.current.push({ id: nextId.current, who: others(WHO)[nextId.current % WHO.length], pos: ENTER.clone(), rot: -Math.PI / 2, state: 'line', dish, want: 1 + Math.floor(Math.random() * (unlocks.table ? 4 : 3)), got: 0, moving: true, seat: -1, eat: 0, path: [], wait: 0 })
      nextId.current++
      bump()
    }
    // now and then a VIP (golden crown): he wants the main dish cooked by hand (vip.ts)
    vipT.current -= dt
    if (vipT.current <= 0 && st.stage >= 1 && st.served >= VIP_MIN_SERVED && RECIPES[place.dish] && !custs.current.some((c) => c.vip) && line.length < maxQueue()) {
      vipT.current = (VIP_EVERY[0] + Math.random() * (VIP_EVERY[1] - VIP_EVERY[0])) * (st.stage >= 3 ? 0.6 : 1)
      const vip = VIPS[Math.floor(Math.random() * VIPS.length)]
      custs.current.push({ id: nextId.current, who: 'koffi', pos: ENTER.clone(), rot: -Math.PI / 2, state: 'line', dish: 0, want: 2 + Math.floor(Math.random() * 2), got: 0, moving: true, seat: -1, eat: 0, path: [], wait: 0, vip })
      nextId.current++
      popText(`Un client VIP arrive : ${vip} !`)
      say('vip', { important: true })
      sfx.unlock()
      bump()
    }
    let served = st.served
    /** paid: they go and sit on the terrace if a seat is free, otherwise they take it away */
    const taken0 = () => new Set(custs.current.filter((o) => o.state === 'eat').map((o) => o.seat))
    /** can table `t` take one more person, and is it open here */
    const tableOpen = (t: number, taken: Set<number>) => (tableZone(t) === 2 ? st.stage >= 3 : tableZone(t) === 1 ? st.stage >= 2 : !!unlocks.table) && (!taken.has(2 * t) || !taken.has(2 * t + 1))
    const sitters = (t: number, taken: Set<number>) => (taken.has(2 * t) ? 1 : 0) + (taken.has(2 * t + 1) ? 1 : 0)
    const nearDecor = (t: number) => t < TABLES.length && st.decor.some((d) => Math.hypot(d.x - ALL_TABLES[t].x, d.z - ALL_TABLES[t].z) < 2.4)
    /** does table `t` give the customer what they asked for */
    const fits = (wish: Wish, t: number, taken: Set<number>) =>
      wish === 'haut' ? tableZone(t) === 1 : wish === 'bas' ? tableZone(t) === 0 : wish === 'salle' ? tableZone(t) === 2 : wish === 'seul' ? sitters(t, taken) === 0 : wish === 'monde' ? sitters(t, taken) === 1 : nearDecor(t)
    /** sit `c` at table `t` (a free seat of it), from where they stand */
    const sitAt = (c: Cust, t: number, taken: Set<number>) => {
      const seat = taken.has(2 * t) ? 2 * t + 1 : 2 * t
      c.state = 'eat'
      c.seat = seat
      c.eat = 7
      c.moving = true
      c.follow = false
      c.trail = undefined
      const a = approach(seat)
      c.path = isUp(seat) || isExt(seat) ? [a, ALL_SEATS[seat].clone()] : [V(c.pos.x, a.z), a, ALL_SEATS[seat].clone()]
    }
    const leavePaid = (c: Cust, noAsk = false) => {
      c.moving = true
      const taken = new Set(custs.current.filter((o) => o.state === 'eat').map((o) => o.seat))
      // some customers want a particular place (from the time there are two kinds of tables, or decorations):
      // they wait beside the counter; take them there yourself (walk up to them, they follow you)
      if (!c.vip && !noAsk && Math.random() < 0.4 && !custs.current.some((o) => o.state === 'ask')) {
        const open = ALL_TABLES.map((_, t) => t).filter((t) => tableOpen(t, taken))
        const can = (Object.keys(WISHES) as Wish[]).filter((w) => {
          const ok = open.filter((t) => fits(w, t, taken))
          return ok.length > 0 && ok.length < open.length
        })
        if (open.length >= 2 && can.length) {
          c.state = 'ask'
          c.wish = can[Math.floor(Math.random() * can.length)]
          c.wait = 0
          c.path = [V(c.pos.x - 0.6, COUNTER.z + 1.9), V(COUNTER.x - 1.35, COUNTER.z + 1.9)]
          if (!askHinted) {
            askHinted = true
            popText(`Ce client veut choisir sa place : ${WISHES[c.wish].text.toLowerCase()}. Va le chercher et emmène-le à une table !`)
          }
          return
        }
      }
      // the free seats: the terrace downstairs once it is open, and upstairs from the restaurant on (some like it
      // up there: half of them go up when there is room)
      const freeSeats = ALL_SEATS.map((_, i) => i).filter((i) => !taken.has(i) && (isExt(i) ? st.stage >= 3 : isUp(i) ? st.stage >= 2 : unlocks.table))
      // one of the open places at random (downstairs, upstairs, the extension), then a seat there
      const zones = [freeSeats.filter((i) => !isUp(i) && !isExt(i)), freeSeats.filter(isUp), freeSeats.filter(isExt)].filter((z) => z.length)
      const zone = zones.length ? zones[Math.floor(Math.random() * zones.length)] : []
      const free = zone.length ? (isUp(zone[0]) || isExt(zone[0]) ? zone[Math.floor(Math.random() * zone.length)] : zone[0]) : -1
      // walk along the aisle behind the tables, then step into the chair (never through a table)
      const aisle = (z: number) => [V(c.pos.x - 0.6, z)]
      if (free >= 0) {
        c.state = 'eat'
        c.seat = free
        c.eat = 7
        const a = approach(free)
        // upstairs: to the foot of the stairs, up the steps, along the terrace to the chair
        c.path = isUp(free)
          ? [V(c.pos.x - 0.6, 1.65), STAIR_IN.clone(), STAIR_FOOT.clone(), STAIR_TOP.clone(), a, ALL_SEATS[free].clone()]
          : isExt(free)
            ? [...aisle(EXT_FRONT_Z), ...extPath(free)]
            : [...aisle(a.z), a, ALL_SEATS[free].clone()]
      } else {
        c.state = 'out'
        c.path = [...aisle(1.6), V(LANE_X, 1.6), ...OUT_PATH.map((v) => v.clone())]
      }
    }
    // the VIP's order is cooked: he pays (up to 3 times the price) and goes to eat
    const vd = useVip.getState().done
    if (vd) {
      const c = custs.current.find((o) => o.id === vd.id)
      useVip.setState({ done: null, ready: null })
      if (c) {
        const pay = Math.round(vipPay(st.current, c.want, vd.score) * saleBoost())
        payCut(st.current, pay / (1 - cutFor(st.current)))
        cash += pay
        served++
        missionEvent('serve')
        missionEvent('vip')
        if (vd.score >= 0.85) missionEvent('vip3')
        addFame(FAME.vip + FAME.vipStar * (vd.score >= 0.85 ? 3 : vd.score >= 0.55 ? 2 : 1))
        c.got = c.want
        for (let k = 0; k < 8; k++) fly('cash', up(c.pos, 1.0), up(CASH, 0.3 + k * 0.08), k * 0.05, 0.35)
        popText(`${c.vip} : +${pay} FCFA`)
        sparks(c.pos.clone().add(new THREE.Vector3(0, 1.6, 0)), 24)
        floatText(c.pos.clone().add(new THREE.Vector3(0.5, -0.4, 0)), `+${pay}`, '#f08c00')
        sfx.cash()
        leavePaid(c)
        changed = true
        bump()
      }
    }
    line.forEach((c, k) => {
      const r = step(c.pos, slot(k), 1.4, dt)
      // « arrived at their place in the line »: close to it (the small nudges between neighbours don't count as walking)
      const atSpot = c.pos.distanceTo(slot(k)) < 0.3
      if (r.fast && !atSpot) c.rot = turn(c.rot, r.dir, Math.min(1, dt * 8))
      else c.rot = turn(c.rot, Math.PI, Math.min(1, dt * 6))
      if (atSpot === c.moving) {
        c.moving = !atSpot
        // at the counter: « Tantie, on dit quoi ? »
        if (atSpot && k === 0 && !c.vip) say('salut', { woman: woman(c), chance: 0.35 })
        bump()
      }
      // someone has to be at the till: Tantie Aya herself, or the cashier once hired
      const tillManned = unlocks.caisse || player.pos.distanceTo(COUNTER) < 1.8
      if (c.vip) {
        if (k !== 0 || !atSpot || c.state !== 'line') return
        c.wait += dt
        const r = useVip.getState().ready
        if (!r || r.id !== c.id || Math.abs(r.wait - c.wait) > 0.5) useVip.setState({ ready: { id: c.id, name: c.vip, want: c.want, wait: c.wait } })
        if (c.wait > VIP_PATIENCE) {
          c.state = 'out'
          c.moving = true
          c.path = [V(c.pos.x - 0.6, 1.6), V(LANE_X, 1.6), ...OUT_PATH.map((v) => v.clone())]
          useVip.setState({ ready: null })
          popText(`${c.vip} en a eu marre d’attendre…`)
          bump()
        }
        return
      }
      // the first in line loses patience if their dish never comes: they leave, the next one steps up
      if (k === 0 && atSpot && c.state === 'line') {
        c.wait += dt
        if (c.got === 0 && c.wait > 14 * F.patience && c.wait - dt <= 14 * F.patience) say('lent', { woman: woman(c), chance: 0.7 })
        if (c.wait > 25 * F.patience && c.got === 0) {
          c.state = 'out'
          c.moving = true
          c.path = [V(c.pos.x - 0.6, 1.6), V(LANE_X, 1.6), ...OUT_PATH.map((v) => v.clone())]
          popText(`Trop long… le client est parti`)
          say('part', { woman: woman(c), important: true })
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
          // while you work for the boss of the district, he takes his cut
          // x2 boost and Pass Boss (shop), key zones; the boss of your district takes his share
          const gross = (c.want * sellPrice(st.current, c.dish, st.stage) + F.drink) * (1 + bonusOf(st.current, 'sales')) * saleBoost()
          const earned = Math.round(gross * (1 - cutFor(st.current)))
          cash += earned
          payCut(st.current, gross)
          // what they paid floats up, with a few sparks
          sparks(c.pos.clone().add(new THREE.Vector3(0, 1.6, 0)))
          floatText(c.pos.clone().add(new THREE.Vector3(0.5, -0.4, 0)), `+${earned.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')}`)
          addFame(FAME.customer * F.fame)
          served++
          missionEvent('serve')
          for (let k = 0; k < Math.min(4, c.want); k++) fly('cash', up(c.pos, 1.0), up(CASH, 0.3 + k * 0.1), k * 0.06, 0.3)
          sfx.pay()
          say('doux', { woman: woman(c), chance: 0.25 })
          // with the terrace open, they go and sit to eat; otherwise they take it away
          leavePaid(c)
        }
      }
    })
    // those who asked for a place: they wait by the counter; walk up to them and they follow you (in your steps,
    // up the stairs too); stop by a table and they sit. The place they wanted: a big tip
    const pFloor = player.climb ? -1 : player.floor
    custs.current.forEach((c) => {
      if (c.state !== 'ask') return
      c.wait += dt
      const flatTo = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z)
      const sameFloor = Math.abs(c.pos.y - player.pos.y) < 0.5
      if (!c.follow) {
        if (c.path.length) {
          const r = step(c.pos, c.path[0], 1.4, dt, c.path.length === 1)
          if (r.fast) c.rot = turn(c.rot, r.dir, Math.min(1, dt * 8))
          if (!r.moving || (c.path.length > 1 && c.pos.distanceTo(c.path[0]) < 0.4)) c.path.shift()
        } else {
          c.rot = turn(c.rot, Math.atan2(player.pos.x - c.pos.x, player.pos.z - c.pos.z), Math.min(1, dt * 4))
          if (c.moving) {
            c.moving = false
            bump()
          }
        }
        if (sameFloor && flatTo(c.pos, player.pos) < 1.0) {
          c.follow = true
          c.wait = 0
          c.path = []
          c.trail = [player.pos.clone()]
          floatText(c.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), 'Je te suis !', '#1c7ed6')
          say('suis', { woman: woman(c), important: true })
          sfx.pick()
          bump()
        } else if (c.wait > ASK_WAIT) {
          // nobody came: they find a place themselves (no tip bonus)
          c.wish = undefined
          c.state = 'line'
          floatText(c.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), 'Bon… je me débrouille', '#868e96')
          leavePaid(c, true)
          bump()
        }
        return
      }
      // following you: walk your steps, keep a little behind
      const tr = c.trail!
      const last = tr[tr.length - 1]
      if (!last || last.distanceTo(player.pos) > 0.3) tr.push(player.pos.clone())
      const close = sameFloor && flatTo(c.pos, player.pos) < 0.95
      if (!close && tr.length) {
        const to = tr[0]
        if (Math.abs(to.y - c.pos.y) > 0.01) {
          const d = to.clone().sub(c.pos)
          const l = d.length()
          if (l < 0.08) c.pos.copy(to), tr.shift()
          else c.pos.addScaledVector(d, Math.min(1, (2.2 * dt) / l))
          c.rot = turn(c.rot, Math.atan2(d.x, d.z), Math.min(1, dt * 8))
        } else {
          const r = step(c.pos, to, 2.6, dt, false)
          if (r.fast) c.rot = turn(c.rot, r.dir, Math.min(1, dt * 8))
          if (flatTo(c.pos, to) < 0.35) tr.shift()
        }
        if (!c.moving) {
          c.moving = true
          bump()
        }
      } else {
        // caught up: drop the steps already done
        while (tr.length > 1 && flatTo(tr[0], c.pos) < 1.2 && Math.abs(tr[0].y - c.pos.y) < 0.3) tr.shift()
        if (c.moving) {
          c.moving = false
          bump()
        }
      }
      // you stop by a table with a free seat, they are with you: they sit
      const taken = taken0()
      if (pFloor >= 0 && sameFloor && flatTo(c.pos, player.pos) < 2.6) {
        for (let t = 0; t < ALL_TABLES.length; t++) {
          if ((tableZone(t) === 1) !== (pFloor === 1) || !tableOpen(t, taken) || flatTo(ALL_TABLES[t], player.pos) > 1.45) continue
          const good = fits(c.wish!, t, taken)
          sitAt(c, t, taken)
          const at = c.pos.clone().add(new THREE.Vector3(0, 2.2, 0))
          if (good) {
            c.tip = 3
            addFame(FAME.customer * 2 * F.fame)
            floatText(at, 'Parfait, merci !', '#2f9e44')
            say('parfait', { woman: woman(c), important: true })
            sparks(at, 16)
            sfx.unlock()
          } else {
            floatText(at, 'Bof… c’est pas ce que j’ai demandé', '#e8590c')
            say('bof', { woman: woman(c), important: true })
          }
          bump()
          return
        }
      }
      if (c.wait > LEAD_TIME) {
        c.wish = undefined
        c.follow = false
        c.trail = undefined
        c.state = 'line'
        floatText(c.pos.clone().add(new THREE.Vector3(0, 2.2, 0)), 'Je vais m’asseoir où je peux', '#868e96')
        leavePaid(c, true)
        bump()
      }
    })
    custs.current.forEach((c) => {
      if (c.state === 'line' || c.state === 'ask') return
      // follow the path one point at a time
      if (c.path.length && Math.abs(c.path[0].y - c.pos.y) > 0.01) {
        // on the stairs: straight up (or down) the steps
        const d = c.path[0].clone().sub(c.pos)
        const l = d.length()
        if (l < 0.06) {
          c.pos.copy(c.path[0])
          c.path.shift()
        } else {
          c.pos.addScaledVector(d, Math.min(1, (1.3 * dt) / l))
          c.rot = turn(c.rot, Math.atan2(d.x, d.z), Math.min(1, dt * 8))
        }
        if (!c.moving) {
          c.moving = true
          bump()
        }
        return
      }
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
      const seat = ALL_SEATS[c.seat]
      const tb = ALL_TABLES[Math.floor(c.seat / 2)]
      c.rot = turn(c.rot, Math.atan2(tb.x - seat.x, tb.z - seat.z), Math.min(1, dt * 8))
      c.eat -= dt
      if (c.eat <= 0) {
        c.state = 'out'
        // they leave a tip on the table
        tableCash[Math.floor(c.seat / 2)] += Math.round(100 * c.want * F.tips * (c.tip ?? 1))
        const a = approach(c.seat)
        c.path = isExt(c.seat) ? [a, V(EXT_AISLE_X, a.z), V(EXT_AISLE_X, 5.6), EXIT.clone()] : isUp(c.seat) ? [a, STAIR_TOP.clone(), STAIR_FOOT.clone(), STAIR_IN.clone(), V(LANE_X, 1.65), ...OUT_PATH.map((v) => v.clone())] : [a, V(LANE_X, a.z), ...OUT_PATH.map((v) => v.clone())]
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
          popText('Nouvelle commande à livrer !')
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
            cash += Math.round(delivery.want * sellPrice(st.current, 0, st.stage) * (has(st.current, 'livraison') ? 1.82 : 1.4) * (1 - cutFor(st.current)))
            for (let k = 0; k < 4; k++) fly('cash', MOTO_BOX(), up(CASH, 0.3 + k * 0.1), k * 0.06, 0.4)
            popText(`Livraison : +${delivery.want * Math.round(sellPrice(st.current, 0, st.stage) * (has(st.current, 'livraison') ? 1.82 : 1.4))} FCFA`)
            sfx.unlock()
          }
        }
      } else if (delivery.state === 'away') {
        motoT.current += dt / (has(st.current, 'livraison') ? 7 : 14)
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

    // 8. bulk orders: a restaurant phones in a big order of one dish; put the plates in the crate in time
    let bulk = st.bulk
    bulkT.current -= dt
    if (!bulk && bulkT.current <= 0 && st.stage >= 1 && st.served >= BULK_MIN_SERVED) {
      bulkT.current = BULK_EVERY[0] + Math.random() * (BULK_EVERY[1] - BULK_EVERY[0])
      const menu = [0, ...(unlocks.plat1 ? [1] : []), ...(unlocks.plat2 ? [2] : [])]
      const dish = menu[Math.floor(Math.random() * menu.length)]
      const want = 8 + 2 * Math.floor(Math.random() * 4) + (unlocks.plateau ? 4 : 0)
      const name = BULK_CLIENTS[Math.floor(Math.random() * BULK_CLIENTS.length)]
      bulk = { name, dish, want, got: 0, left: BULK_TIME, time: BULK_TIME }
      popText(`${name} : ${want} ${DISHES[placeDishes(place)[dish]].label.toLowerCase()} !`)
      sfx.unlock()
    } else if (bulk) {
      let { got } = bulk
      bulkAcc.current += dt
      while (bulkAcc.current >= TICK) {
        bulkAcc.current -= TICK
        const idx = carried.lastIndexOf(bulk.dish)
        if (idx >= 0 && got < bulk.want && player.pos.distanceTo(CRATE) < 1.3) {
          carried.splice(idx, 1)
          got++
          fly('plate', hands(player, () => carried.length)(), up(CRATE, 0.5 + Math.min(got, 12) * 0.04))
          sfx.drop()
          changed = true
        }
      }
      const left = bulk.left - dt
      if (got >= bulk.want) {
        const gross = bulk.want * sellPrice(st.current, bulk.dish, st.stage) * BULK_PAY * (1 + bonusOf(st.current, 'sales')) * saleBoost()
        const pay = Math.round(gross * (1 - cutFor(st.current)))
        payCut(st.current, gross)
        cash += pay
        for (let k = 0; k < 10; k++) fly('cash', up(CRATE, 1.0), up(CASH, 0.3 + k * 0.08), k * 0.05, 0.45)
        popText(`${bulk.name} : +${pay} FCFA`)
        floatText(CRATE, `+${pay}`, '#f08c00')
        burst(CRATE)
        sfx.unlock()
        missionEvent('bulk', 1)
        addFame(FAME.bulk)
        bulk = null
        changed = true
      } else if (left <= 0) {
        popText(`Trop tard… ${bulk.name} a annulé`)
        sfx.wrong()
        bulk = null
      } else if (got !== bulk.got || Math.ceil(left) !== Math.ceil(bulk.left)) bulk = { ...bulk, got, left }
      else bulk.left = left
    }
    if (bulk !== st.bulk) set({ bulk })

    // districts: duel progress, and rent from the districts you own
    const rent = tickTurf(st.current, served, dt)
    if (rent > 0) {
      money += rent
      popText(`Loyer des quartiers : +${rent} FCFA`)
      sfx.cash()
      changed = true
    }
    if (changed || carried.length !== st.carried.length) set({ vitrine, station: plates, carried, counter, cash, money, unlocks, paid, served, workerCarried: wCarried, tableCash, level, upPaid, delivery, stage, growPaid })
  })

  const dishes = placeDishes(PLACES[s.current])
  const myOutfit = useProfile((p) => p.profile?.outfit ?? 1)
  // your own design: put the pieces where you placed them (before drawing them)
  useMemo(() => applyLayout(s.layout), [s.layout])
  return (
    <>
      {STATIONS.map((pos, i) =>
        i === 0 || s.unlocks[(['pan2', 'plat1', 'plat2'] as Unlock[])[i - 1]] ? (
          <Station key={i} plates={s.station[i]} progress={progress.current[i]} level={s.level[i]} dish={dishes[STATION_SLOT[i]]} position={pos.toArray()} />
        ) : null,
      )}
      {padsShown(s).map((p) => (
        <group key={p.key}>
          <Pad label={p.label} icon={p.icon} price={p.price} left={p.left} position={p.pos.toArray()} />
          <PadHint at={p.pos} who={player} icon={p.icon} title={p.label} text={p.text} price={p.left} />
        </group>
      ))}
      <Zones player={player} />
      {s.stage >= 2 && (
        <>
          <Stairs />
          <StairMarks />
          <PadHint at={STAIR_IN} who={player} icon="up" title="L’escalier" text="Monte à la terrasse du haut : les clients y mangent et y laissent leurs pourboires." />
          {UP_TABLES.map((t, i) => (
            <group key={`up${i}`}>
              <TerraceTable position={t} parasol={['#e03131', '#1c7ed6', '#2f9e44', '#f59f00'][i]} plates={custs.current.filter((c) => c.state === 'eat' && !c.moving && Math.floor(c.seat / 2) === 3 + i).length} />
              {(s.tableCash[3 + i] ?? 0) > 0 && <CashPile amount={s.tableCash[3 + i]} position={[t.x, t.y + 0.76, t.z]} scale={0.7} />}
            </group>
          ))}
        </>
      )}
      <Bin position={BIN.toArray()} />
      <DecorLayer />
      <BuildEditor />
      <PadHint at={BIN} who={player} icon="trash" title="Poubelle" text="Reste dessus pour jeter les plats que tu portes (un plat que personne ne commande)." />
      <FX />
      <SideStands player={player} />
      <StoryArrow />
      <Staff />
      {s.bulk && <Crate dish={dishes[s.bulk.dish]} got={s.bulk.got} want={s.bulk.want} />}
      <Counter stock={s.counter} dishes={dishes} name={name} dish={PLACES[s.current].dishLabel} look={s.style.counter} position={COUNTER.toArray()} />
      <CashPile amount={s.cash} position={CASH.toArray()} />
      {s.unlocks.table &&
        TABLES.map((t, i) => (
          <SquareTable key={i} position={t.toArray()} look={s.style.terrace} cash={s.tableCash[i]} plates={custs.current.filter((c) => c.state === 'eat' && !c.moving && Math.floor(c.seat / 2) === i).length} />
        ))}
      {s.stage >= 3 &&
        EXT_TABLES.map((t, i) => {
          const k = ALL_TABLES.length - EXT_TABLES.length + i
          return <SquareTable key={`x${i}`} position={t.toArray()} look={Math.max(6, s.style.room)} cash={s.tableCash[k] ?? 0} plates={custs.current.filter((c) => c.state === 'eat' && !c.moving && Math.floor(c.seat / 2) === k).length} />
        })}
      {STAGES[s.stage + 1] && fameLevel(s.fame) >= STAGES[s.stage + 1].fame && <GrowPad stage={s.stage} fame={s.fame} paid={s.growPaid} />}
      <Mover who={playerWho()} obj={player} carried={s.carried.map((k) => dishes[k])} full={s.carried.length >= (s.unlocks.plateau ? 16 : 8)} outfit={myOutfit} outfitKind="boss" />
      {s.unlocks.serveur && <Mover who={others(["yao"])[0]} obj={worker.current} carried={s.workerCarried.map((k) => dishes[k])} outfit={s.style.team} />}
      {s.unlocks.caisse && <Mover who={others(["fatou"])[0]} obj={cashier} outfit={s.style.team} />}
      {s.unlocks.moto && <Moto obj={moto} want={s.delivery.want} got={s.delivery.got} waiting={s.delivery.state === 'wait'} />}
      {custs.current.map((c, k) => (
        <Mover key={c.id} who={c.who} obj={c} sitting={c.state === 'eat' && !c.moving}>
          {c.vip ? <Crown /> : c.state === 'ask' && c.wish ? <WishBubble wish={c.wish} follow={!!c.follow} /> : k === 0 && c.state === 'line' && !c.moving && <Wants dish={dishes[c.dish]} want={c.want} got={c.got} />}
        </Mover>
      ))}
      <Follow />
    </>
  )
}

/** A person whose position/rotation is driven by the simulation (player, server or customer). */
export function Mover({ who, obj, carried = [], sitting = false, full = false, outfit = 1, outfitKind, children }: { who: PersonId; obj: { pos: THREE.Vector3; rot: number; moving: boolean }; carried?: Dish[]; sitting?: boolean; full?: boolean; outfit?: number; outfitKind?: 'cook' | 'boss' | 'staff'; children?: React.ReactNode }) {
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
      {TOON_READY.includes(who) ? <ToonPerson who={who} moving={moving} carrying={carried.length > 0} sitting={sitting} track={obj} scale={1.2} outfit={outfit} outfitKind={outfitKind} /> : <Avatar who={who} moving={moving} carrying={carried.length > 0} />}
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

/** The golden pad to grow the place, with what it becomes; locked until enough people know you. */
function GrowPad({ stage, fame, paid }: { stage: number; fame: number; paid: number }) {
  const place = useArcade((s) => s.current)
  const next = STAGES[stage + 1]
  const ok = fameLevel(fame) >= next.fame
  const price = stagePrice(place, stage + 1)
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.z = clock.elapsedTime * 0.8
  })
  return (
    <group position={GROW_PAD}>
      <Pad label={`Agrandir : ${next.name}`} icon={STAGE_ICONS[stage + 1]} price={price} left={price - paid} />
      {ok && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.8, 0.9, 6]} />
          <meshBasicMaterial color="#ffd43b" />
        </mesh>
      )}
      {ok && (
        <Html position={[0, 1.1, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="vip-glow flex items-center gap-1 rounded-2xl border-[3px] border-[var(--color-ink)] bg-[#ffe066] px-2.5 py-0.5 text-xs font-extrabold whitespace-nowrap shadow-lg">
            <Icon name="up" size={16} /> Agrandir !
          </div>
        </Html>
      )}
    </group>
  )
}

/** The crate of a bulk order, filling up with plates, and the restaurant's boy waiting next to it. */
function Crate({ dish, got, want }: { dish: Dish; got: number; want: number }) {
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.06)
  })
  return (
    <group position={CRATE}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.72, 0.86, 32]} />
        <meshBasicMaterial color="#ffd43b" transparent opacity={0.85} />
      </mesh>
      <RoundedBox args={[0.8, 0.45, 0.65]} radius={0.03} position={[0, 0.23, 0]} castShadow>
        <meshStandardMaterial color="#c08552" roughness={0.8} />
      </RoundedBox>
      {[-0.2, 0.2].map((x) => (
        <mesh key={x} position={[x, 0.23, 0.33]}>
          <boxGeometry args={[0.06, 0.45, 0.01]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>
      ))}
      <PlateStack count={Math.min(got, 12)} dishes={Array(Math.min(got, 12)).fill(dish)} position={[0, 0.46, 0]} />
      <Html position={[0, 1.55, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="pop flex items-center gap-1 rounded-2xl border-[3px] border-[var(--color-ink)] bg-[#ffe066] px-2.5 py-0.5 text-lg font-extrabold whitespace-nowrap shadow-lg">
          <Icon name="box" size={20} /> {got}/{want}
        </div>
      </Html>
      <ToonPerson who="koffi" moving={false} position={[0.75, 0, 0.55]} rotation={[0, -2.2, 0]} scale={1.1} />
    </group>
  )
}

/** The golden crown of a VIP, turning above his head. */
function Crown() {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!g.current) return
    g.current.rotation.y = clock.elapsedTime * 1.5
    g.current.position.y = 2.25 + Math.sin(clock.elapsedTime * 3) * 0.06
  })
  return (
    <group ref={g} position={[0, 2.25, 0]}>
      <mesh>
        <cylinderGeometry args={[0.2, 0.17, 0.14, 12, 1, true]} />
        <meshStandardMaterial color="#ffd43b" metalness={0.6} roughness={0.25} emissive="#b8860b" emissiveIntensity={0.35} side={THREE.DoubleSide} />
      </mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[Math.sin((k / 5) * Math.PI * 2) * 0.18, 0.13, Math.cos((k / 5) * Math.PI * 2) * 0.18]}>
          <coneGeometry args={[0.05, 0.14, 6]} />
          <meshStandardMaterial color="#ffd43b" metalness={0.6} roughness={0.25} emissive="#b8860b" emissiveIntensity={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 0.02, 0.19]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshStandardMaterial color="#e03131" roughness={0.2} />
      </mesh>
    </group>
  )
}

/** Where a customer wants to sit (they wait for you by the counter, then follow you). */
function WishBubble({ wish, follow }: { wish: Wish; follow: boolean }) {
  const w = WISHES[wish]
  return (
    <Html position={[0, 2.05, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`pop flex items-center gap-1.5 rounded-2xl border-[3px] border-[var(--color-ink)] px-2.5 py-1 font-extrabold whitespace-nowrap shadow-lg ${follow ? 'bg-[#d0ebff]' : 'bg-[#fff3bf]'}`}>
        <Icon name="chair" size={18} />
        <Icon name={w.icon} size={18} />
        <span className="text-xs leading-tight">{w.text}</span>
      </div>
    </Html>
  )
}

/** What the customer at the counter wants: plates, and how many they already got. */
function Wants({ dish, want, got }: { dish: Dish; want: number; got: number }) {
  return (
    <Html position={[0, 1.95, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pop flex items-center gap-1.5 rounded-2xl border-[3px] border-[var(--color-ink)] bg-white px-3 py-1 text-xl font-extrabold whitespace-nowrap shadow-lg">
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
    camYaw.v = Math.PI / 4
    if (import.meta.env.DEV) Object.assign(window, { __cam: camera })
  }, [camera])
  useFrame(({ scene }, dt) => {
    // « Construire » moves the camera itself (Build.tsx)
    if (useArcade.getState().building) return
    const cam = useArcade.getState().cam
    const k = 1 - Math.exp(-dt * 4)
    // the haze far away: further when the camera is pulled back (« Dehors »), or it would hide everything
    const fog = scene.fog as THREE.Fog | null
    if (fog) {
      const [n, f] = cam === 'dehors' ? [45, 95] : [20, 44]
      fog.near += (n - fog.near) * k
      fog.far += (f - fog.far) * k
    }
    if (cam === 'terrasse' && useArcade.getState().stage >= 2) {
      // the upstairs terrace of the restaurant, seen from the street in front, at its height
      camera.position.lerp(TERRACE_CAM, k)
      look.lerp(TERRACE_LOOK, k)
      camYaw.v = Math.atan2(TERRACE_CAM.x - TERRACE_LOOK.x, TERRACE_CAM.z - TERRACE_LOOK.z)
      camera.lookAt(look)
      return
    }
    camYaw.v = Math.PI / 4
    // seen from a corner, high up: the shop looks like a diamond, like in the shop games. « Dehors »: further back
    // and following you more, to see the street, the annexe across the side street, the parking
    const out = cam === 'dehors'
    const far = (size.width < size.height ? 1.85 : 1.2) * view.zoom * (out ? 1.65 : 1)
    const follow = out ? 0.9 : 0.7
    // in the extension (left of the side wall) the camera follows you fully, or you would leave the screen
    const px = player.pos.x
    const tx = px < -6 ? -6 * follow + (px + 6) : px * follow
    const t = new THREE.Vector3(tx, player.pos.y * 0.85, player.pos.z * follow)
    camera.position.lerp(t.clone().add(new THREE.Vector3(6.2 * far, 9.5 * far, 6.2 * far)), k)
    look.lerp(t, k)
    camera.lookAt(look)
  })
  return null
}
