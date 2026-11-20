import { RoundedBox } from '@react-three/drei'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { Flat } from './Props'
import { FLOOR1, STAIR_FOOT, STAIR_IN, STAIR_TOP, STAIR_X } from './layout'

// The stairs up to the restaurant's terrace, along the left wall: wooden steps on a painted frame, a handrail.

const STEPS = 12
export function Stairs() {
  const run = STAIR_FOOT.z - STAIR_TOP.z
  return (
    <group position={[STAIR_X, 0, 0]}>
      {Array.from({ length: STEPS }, (_, i) => {
        const k = (i + 1) / STEPS
        const y = k * FLOOR1
        const z = STAIR_FOOT.z - k * run
        return (
          <group key={i}>
            <RoundedBox args={[0.72, 0.07, run / STEPS + 0.04]} radius={0.015} position={[0, y - 0.035, z + run / STEPS / 2]} castShadow receiveShadow>
              <Flat color="#b07a44" />
            </RoundedBox>
            {/* the riser under each step */}
            <mesh position={[0, y - FLOOR1 / STEPS / 2 - 0.035, z + run / STEPS]}>
              <boxGeometry args={[0.68, FLOOR1 / STEPS, 0.03]} />
              <Flat color="#e9ecef" />
            </mesh>
          </group>
        )
      })}
      {/* the side of the stairs (a slanted wall under the steps) and the handrail */}
      <mesh position={[0.37, FLOOR1 / 2 - 0.25, (STAIR_FOOT.z + STAIR_TOP.z) / 2]} rotation={[Math.atan2(FLOOR1, run), 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.5, Math.hypot(FLOOR1, run)]} />
        <Flat color="#e8432e" />
      </mesh>
      <mesh position={[0.4, FLOOR1 / 2 + 0.8, (STAIR_FOOT.z + STAIR_TOP.z) / 2]} rotation={[Math.atan2(FLOOR1, run), 0, 0]}>
        <boxGeometry args={[0.05, 0.05, Math.hypot(FLOOR1, run)]} />
        <Flat color="#495057" />
      </mesh>
      {[0.15, 0.4, 0.65, 0.9].map((k) => (
        <mesh key={k} position={[0.4, k * FLOOR1 + 0.45, STAIR_FOOT.z - k * run]}>
          <boxGeometry args={[0.04, 0.85, 0.04]} />
          <Flat color="#495057" />
        </mesh>
      ))}
    </group>
  )
}

/** Where you step to go up: a glowing ring at the foot of the stairs with an arrow going up (and one at the top to
 *  come down), so you see where to walk. */
export function StairMarks() {
  const a = useRef<THREE.Group>(null)
  const b = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (a.current) a.current.position.y = 0.55 + Math.sin(t * 3) * 0.12
    if (b.current) b.current.position.y = FLOOR1 + 0.55 + Math.sin(t * 3) * 0.12
  })
  const ring = (y: number, x: number, z: number) => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y + 0.03, z]}>
      <ringGeometry args={[0.36, 0.48, 32]} />
      <meshBasicMaterial color="#69db3c" transparent opacity={0.85} toneMapped={false} />
    </mesh>
  )
  return (
    <group>
      {ring(0, STAIR_IN.x, STAIR_IN.z)}
      <group ref={a} position={[STAIR_IN.x, 0.55, STAIR_IN.z]}>
        <mesh>
          <coneGeometry args={[0.18, 0.28, 4]} />
          <meshBasicMaterial color="#69db3c" toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.1, 0.2, 0.1]} />
          <meshBasicMaterial color="#69db3c" toneMapped={false} />
        </mesh>
      </group>
      {ring(FLOOR1, STAIR_TOP.x, STAIR_TOP.z)}
      <group ref={b} position={[STAIR_TOP.x, FLOOR1 + 0.55, STAIR_TOP.z]} rotation={[Math.PI, 0, 0]}>
        <mesh>
          <coneGeometry args={[0.18, 0.28, 4]} />
          <meshBasicMaterial color="#ffd43b" toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}
