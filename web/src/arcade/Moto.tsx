import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { signTexture } from '../three/textures'
import { Flat } from './Props'
import { ToonPerson } from './ToonPerson'

// The delivery moto: a little scooter with a red delivery box, and the livreur on it.
// The simulation moves `obj` (parked by the side street, or riding off to deliver and back).

export type MotoObj = { pos: THREE.Vector3; rot: number; visible: boolean }

function Wheel({ z }: { z: number }) {
  return (
    <group position={[0, 0.24, z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.18, 0.07, 8, 16]} />
        <Flat color="#212529" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 10]} />
        <Flat color="#adb5bd" />
      </mesh>
    </group>
  )
}

export function Moto({ obj, want, got, waiting }: { obj: MotoObj; want: number; got: number; waiting: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    g.visible = obj.visible
    g.position.copy(obj.pos)
    g.rotation.y = obj.rot
    // a small engine shake
    g.position.y = Math.abs(Math.sin(clock.elapsedTime * 30)) * 0.008
  })
  return (
    <group ref={ref}>
      <Wheel z={0.55} />
      <Wheel z={-0.55} />
      {/* body, floor board, front shield, handlebar */}
      <RoundedBox args={[0.34, 0.3, 0.9]} radius={0.08} position={[0, 0.42, -0.1]} castShadow>
        <Flat color="#e8432e" />
      </RoundedBox>
      <RoundedBox args={[0.36, 0.7, 0.18]} radius={0.06} position={[0, 0.6, 0.45]} rotation={[-0.25, 0, 0]} castShadow>
        <Flat color="#e8432e" />
      </RoundedBox>
      <mesh position={[0, 1.0, 0.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 6]} />
        <Flat color="#343a40" />
      </mesh>
      <mesh position={[0, 0.72, 0.58]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color="#fff9db" emissive="#ffe066" emissiveIntensity={1} />
      </mesh>
      <RoundedBox args={[0.3, 0.1, 0.5]} radius={0.04} position={[0, 0.64, -0.2]} castShadow>
        <Flat color="#343a40" />
      </RoundedBox>
      {/* the delivery box on the back */}
      <group position={[0, 0.95, -0.55]}>
        <RoundedBox args={[0.55, 0.5, 0.5]} radius={0.05} castShadow>
          <Flat color="#ffd43b" />
        </RoundedBox>
        <mesh position={[0, 0, 0.255]}>
          <planeGeometry args={[0.48, 0.18]} />
          <meshStandardMaterial map={signTexture('GARBA', '#e8432e', '#fff', 256, 96)} />
        </mesh>
        <mesh position={[0, 0, -0.255]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.48, 0.18]} />
          <meshStandardMaterial map={signTexture('GARBA', '#e8432e', '#fff', 256, 96)} />
        </mesh>
      </group>
      {/* the livreur, sitting on the seat, hands on the handlebar */}
      <ToonPerson who="koffi" moving={false} sitting position={[0, 0.2, -0.12]} scale={1.05} />
      {waiting && (
        <Html position={[0, 2.1, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="pop flex items-center gap-1 rounded-full border-[3px] border-[var(--color-ink)] bg-white px-3 py-1 text-lg font-extrabold whitespace-nowrap shadow-lg">
            📱 Livraison 🍛 {got}/{want}
          </div>
        </Html>
      )}
    </group>
  )
}
