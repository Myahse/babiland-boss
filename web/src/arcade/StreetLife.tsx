import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { PersonId } from '../three/RealPerson'
import { glowing } from './daynight'
import { others } from './profile'
import { Flat } from './Props'
import { ToonPerson } from './ToonPerson'
import { S } from './layout'

// Life in the street around the maquis: motos and scooters riding by on both roads (a rider, sometimes a
// passenger, the headlight on at night), and people walking on the far pavements — some women with a basin on
// the head, like the street sellers. Everything stays on the roads and the far pavements, never in the shop or
// in the queue.

/** A straight lane: from `a` to `b`, then again from `a` (the ends are out of sight). */
export type Lane = { a: THREE.Vector3; b: THREE.Vector3 }
export const lane = (ax: number, az: number, bx: number, bz: number): Lane => ({ a: new THREE.Vector3(ax, 0, az), b: new THREE.Vector3(bx, 0, bz) })
/** a lane around the maquis, in the plan's metres (the streets are stretched to the wider maquis, layout.ts S) */
const mlane = (ax: number, az: number, bx: number, bz: number) => lane(ax * S, az * S, bx * S, bz * S)

// the front road runs along x (z 5.2..8.0, the taxis at z 6.2 going +x); the side road along z (x 6.4..9.2, taxis at x 7.6)
const MOTO_LANES = [mlane(18, 7.15, -18, 7.15), mlane(-18, 7.65, 18, 7.65), mlane(8.45, -16, 8.45, 16), mlane(9.0, 16, 9.0, -16)]
// on the edge of the road on the maquis side (where people walk in Abidjan), and the far pavement of the side street
const WALK_LANES = [mlane(-18, 5.5, 18, 5.5), mlane(18, 5.62, -18, 5.62), mlane(9.75, 14, 9.75, -16), mlane(10.1, -16, 10.1, 14)]

const headlight = new THREE.MeshStandardMaterial({ color: '#fff9db', emissive: '#ffe066', emissiveIntensity: 1 })
glowing.lamps.push(headlight)

/** Moves `g` along a lane at `speed` (m/s), starting `offset` (0..1) of the way; returns the object to track. */
function useLane(l: Lane, speed: number, offset: number) {
  const g = useRef<THREE.Group>(null)
  const track = useMemo(() => ({ pos: l.a.clone() }), [l])
  const len = l.a.distanceTo(l.b)
  const dir = useMemo(() => new THREE.Vector3().subVectors(l.b, l.a).normalize(), [l])
  useFrame(({ clock }) => {
    const d = (clock.elapsedTime * speed + offset * len) % len
    track.pos.copy(l.a).addScaledVector(dir, d)
    if (g.current) {
      g.current.position.copy(track.pos)
      g.current.rotation.y = Math.atan2(dir.x, dir.z)
    }
  })
  return { g, track }
}

function Wheel({ z }: { z: number }) {
  return (
    <group position={[0, 0.22, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.17, 0.065, 8, 14]} />
        <Flat color="#212529" />
      </mesh>
    </group>
  )
}

/** A moto riding by: its colour, its rider, maybe a passenger. */
export function PassingMoto({ l, speed, offset, color, rider, passenger }: { l: Lane; speed: number; offset: number; color: string; rider: PersonId; passenger?: PersonId }) {
  const { g } = useLane(l, speed, offset)
  const body = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (body.current) body.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 28 + offset * 9)) * 0.01
  })
  return (
    <group ref={g}>
      <group ref={body}>
        <Wheel z={0.52} />
        <Wheel z={-0.52} />
        <RoundedBox args={[0.3, 0.28, 0.95]} radius={0.08} position={[0, 0.42, -0.05]} castShadow>
          <Flat color={color} />
        </RoundedBox>
        <RoundedBox args={[0.32, 0.6, 0.16]} radius={0.05} position={[0, 0.6, 0.45]} rotation={[-0.25, 0, 0]} castShadow>
          <Flat color={color} />
        </RoundedBox>
        <mesh position={[0, 0.95, 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, 0.55, 6]} />
          <Flat color="#343a40" />
        </mesh>
        <mesh position={[0, 0.72, 0.56]} material={headlight}>
          <sphereGeometry args={[0.065, 8, 6]} />
        </mesh>
        <RoundedBox args={[0.28, 0.09, 0.62]} radius={0.04} position={[0, 0.63, -0.18]} castShadow>
          <Flat color="#2b2b2b" />
        </RoundedBox>
        <ToonPerson who={rider} moving={false} sitting position={[0, 0.2, -0.05]} scale={1.0} />
        {passenger && <ToonPerson who={passenger} moving={false} sitting position={[0, 0.24, -0.42]} scale={0.95} />}
      </group>
    </group>
  )
}

/** Someone walking by; `basin`: a basin of goods on the head. */
export function Walker({ l, speed, offset, who, basin }: { l: Lane; speed: number; offset: number; who: PersonId; basin?: string }) {
  const { g, track } = useLane(l, speed, offset)
  return (
    <group ref={g}>
      <ToonPerson who={who} moving track={track} scale={1.15} />
      {basin && (
        <group position={[0, 2.12, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.32, 0.22, 0.14, 16, 1, true]} />
            <meshStandardMaterial color="#adb5bd" metalness={0.6} roughness={0.35} side={THREE.DoubleSide} />
          </mesh>
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} position={[Math.cos(k * 1.3) * 0.13, 0.08, Math.sin(k * 1.3) * 0.13]}>
              <sphereGeometry args={[0.08, 8, 6]} />
              <Flat color={basin} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

export function StreetLife() {
  const motos = useMemo(
    () => [
      { l: MOTO_LANES[0], speed: 4.2, offset: 0.1, color: '#1c7ed6', rider: 'yao' as PersonId, passenger: 'awa' as PersonId },
      { l: MOTO_LANES[1], speed: 3.6, offset: 0.62, color: '#2b2b2b', rider: 'koffi' as PersonId },
      { l: MOTO_LANES[2], speed: 3.9, offset: 0.35, color: '#e03131', rider: 'koffi' as PersonId, passenger: 'fatou' as PersonId },
      { l: MOTO_LANES[3], speed: 4.6, offset: 0.8, color: '#f59f00', rider: 'yao' as PersonId },
    ],
    [],
  )
  const walkers = useMemo(
    () => [
      { l: WALK_LANES[0], speed: 1.1, offset: 0.15, who: 'fatou' as PersonId, basin: '#ffd43b' },
      { l: WALK_LANES[0], speed: 1.0, offset: 0.6, who: 'koffi' as PersonId },
      { l: WALK_LANES[1], speed: 1.15, offset: 0.35, who: 'awa' as PersonId },
      { l: WALK_LANES[1], speed: 0.95, offset: 0.85, who: 'aya' as PersonId, basin: '#e03131' },
      { l: WALK_LANES[2], speed: 1.05, offset: 0.4, who: 'yao' as PersonId },
      { l: WALK_LANES[3], speed: 1.0, offset: 0.1, who: 'fatou' as PersonId, basin: '#ff922b' },
    ],
    [],
  )
  return (
    <>
      {motos.map((m, i) => (
        <PassingMoto key={i} {...m} rider={others([m.rider])[0]} passenger={m.passenger ? others([m.passenger])[0] : undefined} />
      ))}
      {walkers.map((w, i) => (
        <Walker key={i} {...w} who={others([w.who])[0]} />
      ))}
    </>
  )
}
