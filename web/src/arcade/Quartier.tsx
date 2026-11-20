import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { signTexture } from '../three/textures'
import { DayNight } from './daynight'
import { camYaw, moveInput } from './input'
import { idlePerMinute } from './offline'
import { PLACES } from './places'
import { playerWho, useProfile } from './profile'
import { Flat, Palm } from './Props'
import { Building, Taxi } from './Shop'
import { Mover, turn } from './Sim'
import { asphalt, kerb, Lamp, laterite, PottedPlant } from './StreetDecor'
import { night } from './daynight'
import { lane, PassingMoto, Walker } from './StreetLife'
import { useArcade } from './store'
import { bossName, DISTRICTS, neighbours } from './turf'
import type { PersonId } from '../three/RealPerson'
import { ToonPerson } from './ToonPerson'

// The street of your quarter, on foot (as in Babi Life): a road with its pavements and buildings on both sides,
// your maquis in the middle (as big as it has grown), the maquis of the other bosses around, the market and the
// gbaka station; motos, taxis, people walking; day and night. Walk with the same stick; in front of a place a
// button appears (enter your maquis, see the districts, do the market, take a gbaka). Your staff keeps selling
// while you walk.

const SPEED = 3.2
const ROAD = 3.6 // half width of the road
const PAVE = 6.5 // the buildings start here
const BOUND = { minX: -56, maxX: 56, minZ: -5.9, maxZ: 5.9 }
const MY_X = 0
const RIVAL_X = [-31, 31]
const MARKET_X = -16
const GARE_X = 16
// the camera looks at the street from the south, a little from the right: the places are on the far side, facing it
const CAM = new THREE.Vector3(4, 13.5, 15)

/** What you can do in front of a place. */
export type Spot = { id: 'maquis' | 'rival0' | 'rival1' | 'market' | 'gare'; at: THREE.Vector3; title: string; text: string }

/** Where the player is in the street (kept between visits to the maquis). */
export const walker = { pos: new THREE.Vector3(MY_X - 0.9, 0, -4.6), rot: 0, moving: false, vel: new THREE.Vector3() }
if (import.meta.env.DEV) Object.assign(window, { quartierWalker: walker })

const SIGNS = ['PHARMACIE DU CARREFOUR', 'BOUTIQUE LA GRÂCE', 'COIFFURE BELLE DAME', 'QUINCAILLERIE', 'CABINE · TRANSFERT', 'ATELIER COUTURE', 'PRESSING', 'CAVE', 'ÉLECTRONIQUE', 'LIBRAIRIE', 'BOULANGERIE', 'TAILLEUR']
const WALLS = ['#f4a261', '#e9c46a', '#8ecae6', '#ffb4a2', '#b5e48c', '#cdb4db', '#ffd6a5', '#90e0ef', '#f6bd60', '#a8dadc']

function rng(seed: number) {
  let s = seed % 2147483647 || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

/** An ordinary building of the street: a wall, a tin roof, a door, windows, its sign. */
function Shop({ x, side, w, h, wall, sign }: { x: number; side: 1 | -1; w: number; h: number; wall: string; sign: string }) {
  const tex = useMemo(() => signTexture(sign, '#2b1a12', '#ffe066', 512, 96), [sign])
  const d = 6
  const z = side * (PAVE + d / 2)
  const face = side * PAVE
  const out = -side // the front looks at the road
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.06} position={[x, h / 2, z]} castShadow receiveShadow>
        <Flat color={wall} />
      </RoundedBox>
      {/* tin roof, a little slanted */}
      <mesh position={[x, h + 0.12, z]} rotation={[side * 0.06, 0, 0]} castShadow>
        <boxGeometry args={[w + 0.3, 0.12, d + 0.4]} />
        <meshStandardMaterial color="#8d6e63" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[x - w * 0.25, 1.1, face + out * 0.02]} rotation={[0, side < 0 ? 0 : Math.PI, 0]}>
        <planeGeometry args={[1.1, 2.2]} />
        <Flat color="#5c3a1e" />
      </mesh>
      {[0.12, 0.34].map((k) => (
        <mesh key={k} position={[x + w * k, 1.55, face + out * 0.02]} rotation={[0, side < 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[1.1, 1.0]} />
          <meshStandardMaterial color="#ffe8a3" emissive="#ffb347" emissiveIntensity={0.25} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[x, Math.min(h - 0.5, 2.75), face + out * 0.04]} rotation={[0, side < 0 ? 0 : Math.PI, 0]}>
        <planeGeometry args={[Math.min(w - 0.6, 6), 0.7]} />
        <meshStandardMaterial map={tex} roughness={0.5} />
      </mesh>
    </group>
  )
}

/** The market: stalls under parasols, the produce, the sellers. */
function Market({ x }: { x: number }) {
  const sign = useMemo(() => signTexture('MARCHÉ', '#2f9e44', '#ffffff', 384, 96), [])
  const stalls = [-4, 0, 4]
  const goods = ['#e03131', '#ffd43b', '#2f9e44', '#ff922b', '#f8f9fa', '#c2255c']
  return (
    <group position={[x, 0, -(PAVE + 3)]} rotation={[0, Math.PI, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color="#c9a27e" roughness={1} />
      </mesh>
      {stalls.map((sx, i) =>
        [-1.2, 1.4].map((sz, j) => (
          <group key={`${i}${j}`} position={[sx, 0, sz]}>
            <RoundedBox args={[2.2, 0.8, 1.1]} radius={0.04} position={[0, 0.4, 0]} castShadow>
              <Flat color="#a0673a" />
            </RoundedBox>
            {Array.from({ length: 8 }, (_, k) => (
              <mesh key={k} position={[-0.8 + (k % 4) * 0.52, 0.92, -0.2 + Math.floor(k / 4) * 0.4]} castShadow>
                <sphereGeometry args={[0.16, 8, 6]} />
                <Flat color={goods[(i * 2 + j + k) % goods.length]} />
              </mesh>
            ))}
            <mesh position={[0, 2.3, 0]} castShadow>
              <coneGeometry args={[1.5, 0.45, 8, 1, true]} />
              <meshStandardMaterial color={['#e03131', '#1c7ed6', '#f59f00', '#2f9e44', '#7048e8', '#e8590c'][(i * 2 + j) % 6]} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 2.3, 6]} />
              <Flat color="#dee2e6" />
            </mesh>
          </group>
        )),
      )}
      <ToonPerson who="fatou" moving={false} position={[-4, 0, 0.2]} rotation={[0, Math.PI, 0]} scale={1.15} />
      <ToonPerson who="awa" moving={false} position={[4, 0, 0.3]} rotation={[0, Math.PI, 0]} scale={1.15} />
      <mesh position={[0, 3.4, -2.8]}>
        <planeGeometry args={[3.4, 0.85]} />
        <meshStandardMaterial map={sign} />
      </mesh>
      {[-1.7, 1.7].map((px) => (
        <mesh key={px} position={[px, 1.7, -2.8]}>
          <cylinderGeometry args={[0.05, 0.05, 3.4, 6]} />
          <Flat color="#495057" />
        </mesh>
      ))}
    </group>
  )
}

/** The gbaka station: two minibuses, the sign, the « apprenti » calling. */
function Gare({ x }: { x: number }) {
  const sign = useMemo(() => signTexture('GARE · GBAKA', '#1c7ed6', '#ffffff', 512, 96), [])
  return (
    <group position={[x, 0, -(PAVE + 3)]} rotation={[0, Math.PI, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color="#868e96" roughness={1} />
      </mesh>
      {[
        [-3.2, '#2f9e44'],
        [2.4, '#fcc419'],
      ].map(([gx, c]) => (
        <group key={gx as number} position={[gx as number, 0, 0.4]} rotation={[0, Math.PI / 2, 0]}>
          <RoundedBox args={[2.1, 1.9, 4.6]} radius={0.25} position={[0, 1.25, 0]} castShadow>
            <Flat color={c as string} />
          </RoundedBox>
          <mesh position={[1.06, 1.55, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[3.6, 0.6]} />
            <meshStandardMaterial color="#1b2a3a" roughness={0.1} />
          </mesh>
          <mesh position={[-1.06, 1.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[3.6, 0.6]} />
            <meshStandardMaterial color="#1b2a3a" roughness={0.1} />
          </mesh>
          {[-1.5, 1.5].map((wz) =>
            [-1.05, 1.05].map((wx) => (
              <mesh key={`${wz}${wx}`} position={[wx, 0.35, wz]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.35, 0.35, 0.25, 12]} />
                <Flat color="#212529" />
              </mesh>
            )),
          )}
        </group>
      ))}
      <ToonPerson who="koffi" moving={false} position={[0, 0, -1.6]} rotation={[0, Math.PI, 0]} scale={1.15} />
      <mesh position={[0, 3.4, -2.8]}>
        <planeGeometry args={[4.2, 0.8]} />
        <meshStandardMaterial map={sign} />
      </mesh>
      {[-2.1, 2.1].map((px) => (
        <mesh key={px} position={[px, 1.7, -2.8]}>
          <cylinderGeometry args={[0.05, 0.05, 3.4, 6]} />
          <Flat color="#495057" />
        </mesh>
      ))}
    </group>
  )
}

/** A boss's maquis in the street (the same building as yours, in his colours), the boss standing in front. */
function BossMaquis({ x, boss, wall, who }: { x: number; boss: string; wall: string; who: PersonId }) {
  const place = useArcade((s) => PLACES[s.current])
  const p = useMemo(() => ({ ...place, wall, awning: ['#212529', '#ffd43b'] as [string, string] }), [place, wall])
  return (
    <group>
      <group position={[x + 0.5, 0, -4.1]}>
        <Building name={boss} place={p} stage={1} />
      </group>
      <ToonPerson who={who} moving={false} position={[x + 2.2, 0, -5.4]} rotation={[0, 0.3, 0]} scale={1.2} />
    </group>
  )
}

/** The camera follows you along the street, from the same corner as in the maquis. */
function Follow() {
  const { camera, size, gl } = useThree()
  const look = useMemo(() => walker.pos.clone(), [])
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __cam: camera, __scene: scene, __gl: gl })
    camera.position.copy(walker.pos).add(CAM)
    camYaw.v = Math.atan2(CAM.x, CAM.z)
  }, [camera])
  useFrame((_, dt) => {
    const far = size.width < size.height ? 1.2 : 0.9
    const t = walker.pos
    camera.position.lerp(new THREE.Vector3(t.x + CAM.x * far, CAM.y * far, t.z + CAM.z * far), 1 - Math.exp(-dt * 4))
    // look a little past you, toward the buildings: you see the street and the places, not just the road
    look.lerp(new THREE.Vector3(t.x, 0, t.z - 3), 1 - Math.exp(-dt * 5))
    camera.lookAt(look)
  })
  return null
}

export function Quartier({ onSpot }: { onSpot: (s: Spot | null) => void }) {
  const current = useArcade((s) => s.current)
  const stage = useArcade((s) => s.stage)
  const facade = useArcade((s) => s.style.facade)
  const place = PLACES[current]
  const name = useProfile((s) => s.profile?.name ?? 'Boss')
  const road = useMemo(() => ({ main: asphalt([28, 2]), ground: laterite([24, 6]), kerb: kerb(140) }), [])
  // the bosses of the street: the one of your district, and a neighbour
  const ds = DISTRICTS[current]
  const rivals = useMemo(() => {
    const n = neighbours(current, 0)
    return [0, n[0] ?? 1].map((i, k) => ({ i, boss: bossName(current, i), district: ds[i]?.name ?? '', x: RIVAL_X[k] }))
  }, [current, ds])
  const spots = useMemo<Spot[]>(
    () => [
      { id: 'maquis', at: new THREE.Vector3(MY_X - 0.9, 0, -5.3), title: `${place.dishLabel} chez ${name}`, text: 'Ton maquis. Entre pour cuisiner, servir et l’améliorer.' },
      ...rivals.map((r, k) => ({ id: `rival${k}` as Spot['id'], at: new THREE.Vector3(r.x - 0.9, 0, -5.3), title: `Chez ${r.boss}`, text: r.i === 0 ? `Le boss de ton quartier (${r.district}). Il prend sa part sur tes ventes : un jour, trahis-le.` : `Le boss de ${r.district}, à côté. Prends-lui son quartier.` })),
      { id: 'market', at: new THREE.Vector3(MARKET_X, 0, -5.3), title: 'Le marché', text: 'Achète tes produits frais : tes réchauds cuisent 25 % plus vite pendant 5 minutes.' },
      { id: 'gare', at: new THREE.Vector3(GARE_X, 0, -5.3), title: 'La gare des gbakas', text: 'Pars dans une autre commune ou une autre ville.' },
    ],
    [place, name, rivals],
  )
  // the ordinary buildings, the same ones every visit
  const shops = useMemo(() => {
    const r = rng(current.length * 97 + 13)
    const out: { x: number; side: 1 | -1; w: number; h: number; wall: string; sign: string }[] = []
    let k = 0
    for (const side of [-1, 1] as const)
      for (let x = -54; x <= 54; x += 11) {
        const busy = side === -1 && (Math.abs(x - MY_X) < 9 || RIVAL_X.some((rx) => Math.abs(x - rx) < 9) || Math.abs(x - MARKET_X) < 9.5 || Math.abs(x - GARE_X) < 9.5)
        if (busy) continue
        const near = side === 1
        out.push({ x, side, w: 8 + r() * 2, h: near ? 2.8 + r() * 0.5 : r() < 0.4 ? 6 + r() * 1.5 : 3.4 + r() * 0.8, wall: WALLS[Math.floor(r() * WALLS.length)], sign: SIGNS[k++ % SIGNS.length] })
      }
    return out
  }, [current])

  // walking
  const [near, setNear] = useState<Spot['id'] | null>(null)
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1)
    const inp = moveInput()
    const v = walker.vel
    v.x += (inp.x * SPEED - v.x) * Math.min(1, dt * 10)
    v.z += (inp.z * SPEED - v.z) * Math.min(1, dt * 10)
    if (Math.hypot(inp.x, inp.z) < 0.05 && v.length() < 0.08) v.set(0, 0, 0)
    walker.moving = v.length() > 0.05
    if (walker.moving) {
      walker.pos.x = THREE.MathUtils.clamp(walker.pos.x + v.x * dt, BOUND.minX, BOUND.maxX)
      walker.pos.z = THREE.MathUtils.clamp(walker.pos.z + v.z * dt, BOUND.minZ, BOUND.maxZ)
      if (v.length() > 0.3) walker.rot = turn(walker.rot, Math.atan2(v.x, v.z), Math.min(1, dt * 12))
    }
    // in front of a place?
    let best: Spot | null = null
    let bd = 2.3
    for (const s of spots) {
      const d = walker.pos.distanceTo(s.at)
      if (d < bd) {
        bd = d
        best = s
      }
    }
    if ((best?.id ?? null) !== near) {
      setNear(best?.id ?? null)
      onSpot(best)
    }
  })
  // your staff keeps selling while you walk (when you have a server and a cashier): the money waits in the maquis
  useEffect(() => {
    const t = setInterval(() => {
      const per = idlePerMinute(useArcade.getState().current)
      if (per > 0) useArcade.setState((s) => ({ cash: s.cash + Math.round((per * 3 * 4) / 60) }))
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const front = useMemo(() => (t: number) => ({ x: -58 + t * 116, z: 1.0, r: Math.PI / 2 }), [])
  const back = useMemo(() => (t: number) => ({ x: 58 - t * 116, z: -1.0, r: -Math.PI / 2 }), [])
  const motoLanes = useMemo(() => [lane(-58, -2.2, 58, -2.2), lane(58, 2.2, -58, 2.2), lane(-58, -2.6, 58, -2.6)], [])
  const walkLanes = useMemo(() => [lane(-58, -4.9, 58, -4.9), lane(58, -5.2, -58, -5.2), lane(-58, 4.9, 58, 4.9), lane(58, 5.25, -58, 5.25)], [])

  return (
    <>
      <DayNight />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[140, 60]} />
        <meshStandardMaterial map={road.ground} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[120, ROAD * 2]} />
        <meshStandardMaterial map={road.main} roughness={0.9} />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-57 + i * 5, 0.02, 0]}>
          <planeGeometry args={[2, 0.12]} />
          <meshBasicMaterial color="#f8f9fa" />
        </mesh>
      ))}
      {/* pavements, their kerbs painted red and white */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, s * (ROAD + (PAVE - ROAD) / 2)]} receiveShadow>
            <planeGeometry args={[120, PAVE - ROAD]} />
            <meshStandardMaterial color="#d8c3a5" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.07, s * ROAD]}>
            <boxGeometry args={[120, 0.14, 0.16]} />
            <meshStandardMaterial map={road.kerb} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* your maquis, as big as it has grown */}
      <group position={[MY_X + 0.5, 0, -4.1]}>
        <Building name={name} place={place} stage={stage} look={facade} />
      </group>
      {rivals.map((r, k) => (
        <BossMaquis key={k} x={r.x} boss={r.boss} wall={['#9775fa', '#4dabf7'][k]} who={(['yao', 'koffi'] as PersonId[])[k]} />
      ))}
      <Market x={MARKET_X} />
      <Gare x={GARE_X} />
      {shops.map((s, i) => (
        <Shop key={i} {...s} />
      ))}
      {[-40, -6, 8, 30, 44].map((x) => (
        <Palm key={x} position={[x, 0, x % 2 ? -5.9 : 5.9]} s={1.1} />
      ))}
      {[-37, -23, 23, 37].map((x) => (
        <PottedPlant key={x} position={[x, 0, -5.9]} />
      ))}
      {[-48, -32, -8, 8, 32, 48].map((x) => (
        <Lamp key={x} position={[x, 0, -6.0]} facing={0} />
      ))}
      {[-40, -16, 0, 24, 40].map((x) => (
        <Lamp key={`s${x}`} position={[x, 0, 6.0]} facing={Math.PI} />
      ))}
      <NightGlow />
      {/* street life */}
      <Taxi path={front} speed={0.012} />
      <Taxi path={back} speed={0.011} offset={0.5} />
      <PassingMoto l={motoLanes[0]} speed={5} offset={0.2} color="#e03131" rider="yao" passenger="awa" />
      <PassingMoto l={motoLanes[1]} speed={4.4} offset={0.6} color="#1c7ed6" rider="koffi" />
      <PassingMoto l={motoLanes[2]} speed={3.8} offset={0.9} color="#f59f00" rider="koffi" />
      <Walker l={walkLanes[0]} speed={1.1} offset={0.1} who="fatou" basin="#ffd43b" />
      <Walker l={walkLanes[1]} speed={1.0} offset={0.45} who="koffi" />
      <Walker l={walkLanes[2]} speed={1.05} offset={0.3} who="awa" />
      <Walker l={walkLanes[3]} speed={0.95} offset={0.75} who="aya" basin="#e03131" />
      <Walker l={walkLanes[0]} speed={1.0} offset={0.7} who="yao" />
      {/* you */}
      <Mover who={playerWho()} obj={walker} />
      {/* a ring on the ground in front of the place you are at */}
      {near && <SpotRing at={spots.find((s) => s.id === near)!.at} />}
      <Follow />
    </>
  )
}

function SpotRing({ at }: { at: THREE.Vector3 }) {
  const g = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (g.current) g.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.08)
  })
  return (
    <mesh ref={g} rotation={[-Math.PI / 2, 0, 0]} position={[at.x, 0.06, at.z]}>
      <ringGeometry args={[0.8, 0.95, 32]} />
      <meshBasicMaterial color="#ffd43b" transparent opacity={0.9} />
    </mesh>
  )
}

/** At night the street lamps light the pavement around you (one warm light that follows you). */
function NightGlow() {
  const l = useRef<THREE.PointLight>(null)
  useFrame(() => {
    if (!l.current) return
    l.current.position.set(walker.pos.x, 5, walker.pos.z - 1)
    l.current.intensity = night() * 14
  })
  return <pointLight ref={l} color="#ffc078" distance={16} decay={1.4} intensity={0} />
}
