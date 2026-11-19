import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { signTexture } from '../three/textures'

// The arcade-idle look: chunky simple shapes, flat-shaded facets, bright saturated colours,
// a slightly glossy "plastic toy" finish.

export function Flat({ color, ...rest }: { color: THREE.ColorRepresentation } & ThreeElements['meshStandardMaterial']) {
  return <meshStandardMaterial color={color} flatShading roughness={0.45} metalness={0} {...rest} />
}

/** One garba plate: white plate, attiéké mound, two pieces of fried fish, a bit of tomato. */
export function Plate(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.12, 0.035, 10]} />
        <Flat color="#ffffff" />
      </mesh>
      <mesh position={[-0.03, 0.035, 0]} scale={[1, 0.55, 1]}>
        <icosahedronGeometry args={[0.075, 0]} />
        <Flat color="#fff1c1" />
      </mesh>
      <mesh position={[0.06, 0.045, 0.02]} rotation={[0, 0.5, 0.2]}>
        <boxGeometry args={[0.07, 0.03, 0.05]} />
        <Flat color="#d9822b" />
      </mesh>
      <mesh position={[0.05, 0.045, -0.05]} rotation={[0, -0.3, -0.1]}>
        <boxGeometry args={[0.06, 0.03, 0.045]} />
        <Flat color="#c96b1c" />
      </mesh>
      <mesh position={[-0.07, 0.05, 0.06]}>
        <cylinderGeometry args={[0.022, 0.022, 0.012, 6]} />
        <Flat color="#ff3b30" />
      </mesh>
    </group>
  )
}

/** A pile of plates; `wobble` makes a carried stack sway like in the games. */
export function PlateStack({ count, wobble = false, ...props }: { count: number; wobble?: boolean } & ThreeElements['group']) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!wobble || !ref.current) return
    ref.current.children.forEach((c, i) => {
      c.position.x = Math.sin(clock.elapsedTime * 7 + i * 0.3) * 0.006 * i
    })
  })
  return (
    <group ref={ref} {...props}>
      {Array.from({ length: count }, (_, i) => (
        <Plate key={i} position={[0, i * 0.075, 0]} rotation={[0, i * 0.7, 0]} />
      ))}
    </group>
  )
}

/** Garba station: a counter with the frying pan, a basin of attiéké, and the plates it makes. */
export function Station({ plates, progress, ...props }: { plates: number; progress: number } & ThreeElements['group']) {
  const fish = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (fish.current) fish.current.position.y = 0.06 + Math.abs(Math.sin(clock.elapsedTime * 6)) * 0.02
  })
  return (
    <group {...props}>
      <RoundedBox args={[1.1, 0.9, 0.9]} radius={0.06} position={[0, 0.45, 0]} castShadow receiveShadow>
        <Flat color="#ff8a1f" />
      </RoundedBox>
      <mesh position={[0, 0.91, 0]} receiveShadow>
        <boxGeometry args={[1.14, 0.04, 0.94]} />
        <Flat color="#fff3dc" />
      </mesh>
      {/* pan on the gas */}
      <group position={[-0.25, 0.93, -0.12]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.22, 0.17, 0.08, 12]} />
          <Flat color="#2d3436" />
        </mesh>
        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.19, 12]} />
          <Flat color="#ffc93c" />
        </mesh>
        <group ref={fish}>
          <mesh position={[0.04, 0, 0]} rotation={[0, 0.4, 0]}>
            <boxGeometry args={[0.1, 0.04, 0.07]} />
            <Flat color="#d9822b" />
          </mesh>
          <mesh position={[-0.07, 0, 0.05]} rotation={[0, -0.5, 0]}>
            <boxGeometry args={[0.09, 0.04, 0.06]} />
            <Flat color="#e09a3e" />
          </mesh>
        </group>
        <mesh position={[0.32, 0.02, 0]}>
          <boxGeometry args={[0.22, 0.03, 0.04]} />
          <Flat color="#2d3436" />
        </mesh>
      </group>
      {/* basin of attiéké */}
      <group position={[0.28, 0.93, -0.15]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.13, 0.12, 10]} />
          <Flat color="#4dabf7" />
        </mesh>
        <mesh position={[0, 0.07, 0]} scale={[1, 0.45, 1]}>
          <icosahedronGeometry args={[0.15, 1]} />
          <Flat color="#fff1c1" />
        </mesh>
      </group>
      <PlateStack count={plates} position={[0.1, 0.95, 0.25]} />
      <ProgressRing progress={progress} position={[0, 1.9, 0]} />
    </group>
  )
}

/** Round "cooking…" timer floating above a station. */
export function ProgressRing({ progress, ...props }: { progress: number } & ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh>
        <ringGeometry args={[0.16, 0.22, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.001]} rotation={[0, 0, Math.PI / 2]}>
        <ringGeometry args={[0.16, 0.22, 32, 1, 0, Math.max(0.001, progress) * Math.PI * 2]} />
        <meshBasicMaterial color="#51cf66" />
      </mesh>
    </group>
  )
}

/** The selling counter with its sign. */
export function Counter({ plates, name, ...props }: { plates: number; name: string } & ThreeElements['group']) {
  return (
    <group {...props}>
      <RoundedBox args={[1.7, 0.95, 0.8]} radius={0.06} position={[0, 0.475, 0]} castShadow receiveShadow>
        <Flat color="#2fb344" />
      </RoundedBox>
      <mesh position={[0, 0.965, 0]} receiveShadow>
        <boxGeometry args={[1.75, 0.04, 0.85]} />
        <Flat color="#fff3dc" />
      </mesh>
      <mesh position={[0, 0.5, 0.405]}>
        <planeGeometry args={[1.5, 0.38]} />
        <meshStandardMaterial map={signTexture(`GARBA CHEZ ${name.toUpperCase()}`, '#ff8a1f', '#fff', 768, 192)} roughness={0.5} />
      </mesh>
      <PlateStack count={Math.min(plates, 12)} position={[0, 1.0, 0]} />
    </group>
  )
}

/** Bills piling up on the floor, waiting to be picked up. */
export function CashPile({ amount, ...props }: { amount: number } & ThreeElements['group']) {
  const n = Math.min(40, Math.ceil(amount / 100))
  return (
    <group {...props}>
      {Array.from({ length: n }, (_, i) => {
        const col = i % 4
        const row = Math.floor(i / 4) % 2
        const lvl = Math.floor(i / 8)
        return (
          <group key={i} position={[(col - 1.5) * 0.17, 0.03 + lvl * 0.05, (row - 0.5) * 0.3]}>
            <mesh castShadow>
              <boxGeometry args={[0.15, 0.045, 0.27]} />
              <Flat color="#51cf66" />
            </mesh>
            <mesh position={[0, 0.024, 0]}>
              <boxGeometry args={[0.152, 0.003, 0.06]} />
              <Flat color="#fcc419" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** An unlock pad on the ground (a square zone): price and name; it fills up while you stand on it. */
export function Pad({ label, left, price, ...props }: { label: string; left: number; price: number } & ThreeElements['group']) {
  const tex = useMemo(() => signTexture(`${label} · ${left} F`, '#1c7ed6', '#fff', 640, 128), [label, left])
  const done = Math.max(0.001, 1 - left / price)
  const S = 1.1
  return (
    <group {...props}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[S, S]} />
        <meshBasicMaterial color="#4dabf7" transparent opacity={0.45} />
      </mesh>
      {/* green fill rising from the front edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, S / 2 - (S * done) / 2]}>
        <planeGeometry args={[S, S * done]} />
        <meshBasicMaterial color="#51cf66" transparent opacity={0.8} />
      </mesh>
      {/* white border */}
      {[
        [0, S / 2, S, 0.06],
        [0, -S / 2, S, 0.06],
        [S / 2, 0, 0.06, S],
        [-S / 2, 0, 0.06, S],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.03, z]}>
          <boxGeometry args={[w, 0.02, d]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial map={signTexture('F', '#fcc419', '#2b1a12', 128, 128)} transparent />
      </mesh>
      <mesh rotation={[-Math.PI / 2.6, 0, 0]} position={[0, 0.35, 0.8]}>
        <planeGeometry args={[1.5, 0.3]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function Palm({ s = 1, ...props }: { s?: number } & ThreeElements['group']) {
  return (
    <group scale={s} {...props}>
      <mesh castShadow position={[0, 1.2, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.1, 0.16, 2.4, 6]} />
        <Flat color="#b07d4f" />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} castShadow position={[Math.cos((i / 6) * Math.PI * 2) * 0.55, 2.35, Math.sin((i / 6) * Math.PI * 2) * 0.55]} rotation={[0, -(i / 6) * Math.PI * 2, -0.5]} scale={[1, 0.12, 0.35]}>
          <icosahedronGeometry args={[0.7, 0]} />
          <Flat color={i % 2 ? '#2fb344' : '#40c057'} />
        </mesh>
      ))}
    </group>
  )
}

/** Simple plastic table with two chairs (the maquis corner, once unlocked). */
export function MaquisTable(props: ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh castShadow position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.05, 12]} />
        <Flat color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.05, 0.12, 0.72, 6]} />
        <Flat color="#ffffff" />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.7, 0, 0]} rotation={[0, (s * -Math.PI) / 2, 0]}>
          <mesh castShadow position={[0, 0.42, 0]}>
            <boxGeometry args={[0.42, 0.05, 0.42]} />
            <Flat color="#e03131" />
          </mesh>
          <mesh castShadow position={[0, 0.68, -0.2]}>
            <boxGeometry args={[0.42, 0.5, 0.05]} />
            <Flat color="#e03131" />
          </mesh>
          {[-0.17, 0.17].map((x) =>
            [-0.17, 0.17].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.2, z]}>
                <boxGeometry args={[0.04, 0.4, 0.04]} />
                <Flat color="#c92a2a" />
              </mesh>
            )),
          )}
        </group>
      ))}
      <Plate position={[0, 0.76, 0]} />
    </group>
  )
}
