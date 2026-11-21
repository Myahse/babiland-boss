import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import { signTexture } from '../three/textures'
import { Flat, Palm } from './Props'
import { floorTexture, tier } from './looks'
import { EXT, EXT_AISLE_X } from './layout'

// The extension of the « Grand restaurant »: an air-conditioned room built on the empty lot left of the maquis,
// past its side wall. The back and the far side are walls (with the air conditioners and the big sign), the front
// and the side of the maquis stay open so the camera sees inside. Before: the empty lot, with a sign saying what
// will be built there.

const W = EXT.maxX - EXT.minX
const D = EXT.maxZ - EXT.minZ
const CX = (EXT.minX + EXT.maxX) / 2
const CZ = (EXT.minZ + EXT.maxZ) / 2

function AirCon({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[1.1, 0.34, 0.26]} radius={0.05}>
        <Flat color="#f8f9fa" />
      </RoundedBox>
      {/* the louvre and the little green light */}
      <mesh position={[0, -0.1, 0.135]}>
        <boxGeometry args={[0.95, 0.05, 0.02]} />
        <Flat color="#ced4da" />
      </mesh>
      <mesh position={[0.45, 0.08, 0.135]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshBasicMaterial color="#51cf66" toneMapped={false} />
      </mesh>
      {/* the cool air: faint blue strokes */}
      {[-0.3, 0, 0.3].map((x) => (
        <mesh key={x} position={[x, -0.32, 0.3]} rotation={[0.5, 0, 0]}>
          <planeGeometry args={[0.04, 0.3]} />
          <meshBasicMaterial color="#a5d8ff" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export function Extension({ stage, room }: { stage: number; room: number }) {
  const look = Math.max(6, room)
  const t = tier(look)
  const floor = floorTexture(Math.min(10, look + 1))
  const sign = useMemo(() => signTexture('SALLE CLIMATISÉE', '#1864ab'), [])
  const soon = useMemo(() => signTexture('BIENTÔT : SALLE CLIMATISÉE', '#495057', '#fff', 640, 128), [])
  if (stage < 1) return null
  if (stage < 3)
    return (
      // the empty lot, roped off, with the sign of what will be built (at the grand restaurant)
      <group>
        {[
          [EXT.minX, EXT.minZ],
          [EXT.maxX - 0.2, EXT.minZ],
          [EXT.minX, EXT.maxZ - 0.3],
          [EXT.maxX - 0.2, EXT.maxZ - 0.3],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.4, z]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
            <Flat color="#f08c00" />
          </mesh>
        ))}
        {/* the rope round the lot */}
        {[
          [CX - 0.1, EXT.minZ, W - 0.2, 0],
          [CX - 0.1, EXT.maxZ - 0.3, W - 0.2, 0],
          [EXT.minX, CZ - 0.15, D - 0.3, Math.PI / 2],
        ].map(([x, z, l, r], i) => (
          <mesh key={i} position={[x, 0.65, z]} rotation={[0, r, 0]}>
            <boxGeometry args={[l, 0.03, 0.03]} />
            <Flat color="#fa5252" />
          </mesh>
        ))}
        <group position={[CX, 0, CZ + 0.5]}>
          <mesh position={[-0.9, 0.7, 0]}>
            <boxGeometry args={[0.08, 1.4, 0.08]} />
            <Flat color="#7a4b28" />
          </mesh>
          <mesh position={[0.9, 0.7, 0]}>
            <boxGeometry args={[0.08, 1.4, 0.08]} />
            <Flat color="#7a4b28" />
          </mesh>
          <mesh position={[0, 1.35, 0.05]}>
            <planeGeometry args={[2.4, 0.48]} />
            <meshStandardMaterial map={soon} roughness={0.6} />
          </mesh>
        </group>
        <Palm position={[CX - 1.2, 0, CZ - 1.4]} s={0.8} />
      </group>
    )
  return (
    <group>
      {/* the floor of the room, a step above the ground */}
      <mesh key={`xf${look}`} rotation={[-Math.PI / 2, 0, 0]} position={[CX, 0.015, CZ]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={floor} roughness={0.4} />
      </mesh>
      {/* back wall and far wall, tall, in the colours of the house */}
      <mesh position={[CX, 1.5, EXT.minZ - 0.1]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.2, 3, 0.2]} />
        <Flat color={t.body} />
      </mesh>
      <mesh position={[EXT.minX - 0.1, 1.5, CZ]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 3, D + 0.2]} />
        <Flat color={t.body} />
      </mesh>
      {/* a trim along the top, and a baseboard */}
      <mesh position={[CX, 3.02, EXT.minZ - 0.1]}>
        <boxGeometry args={[W + 0.3, 0.12, 0.3]} />
        <Flat color={t.trim} />
      </mesh>
      <mesh position={[EXT.minX - 0.1, 3.02, CZ]}>
        <boxGeometry args={[0.3, 0.12, D + 0.3]} />
        <Flat color={t.trim} />
      </mesh>
      {/* the big sign and the air conditioners on the back wall */}
      <mesh position={[CX, 2.45, EXT.minZ + 0.01]}>
        <planeGeometry args={[3.4, 0.62]} />
        <meshStandardMaterial map={sign} roughness={0.5} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.25} />
      </mesh>
      <AirCon position={[CX - 1.6, 1.7, EXT.minZ + 0.14]} />
      <AirCon position={[CX + 1.6, 1.7, EXT.minZ + 0.14]} />
      <group rotation={[0, Math.PI / 2, 0]} position={[EXT.minX + 0.14, 1.9, CZ + 0.6]}>
        <AirCon position={[0, 0, 0]} />
      </group>
      {/* a window with curtains on the far wall */}
      <mesh position={[EXT.minX + 0.01, 1.4, CZ - 1.4]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.4, 1.0]} />
        <meshStandardMaterial color="#a5d8ff" roughness={0.1} metalness={0.2} />
      </mesh>
      {[-0.62, 0.62].map((o) => (
        <mesh key={o} position={[EXT.minX + 0.03, 1.4, CZ - 1.4 + o]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.3, 1.2]} />
          <Flat color={t.trim} side={2} />
        </mesh>
      ))}
      {/* the front: a low glass railing with a gap at the corner where you come in */}
      <mesh position={[(EXT.minX + EXT.maxX - 1.1) / 2, 0.45, EXT.maxZ + 0.02]}>
        <boxGeometry args={[W - 1.1, 0.9, 0.05]} />
        <meshStandardMaterial color="#d0ebff" transparent opacity={0.35} roughness={0.05} />
      </mesh>
      <mesh position={[(EXT.minX + EXT.maxX - 1.1) / 2, 0.92, EXT.maxZ + 0.02]}>
        <boxGeometry args={[W - 1.1, 0.06, 0.1]} />
        <Flat color={t.trim} />
      </mesh>
      {/* the red carpet from the opening to the tables */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[EXT_AISLE_X, 0.025, CZ]}>
        <planeGeometry args={[0.7, D - 0.4]} />
        <Flat color="#c92a2a" />
      </mesh>
      {/* plants in the corners */}
      {[
        [EXT.minX + 0.4, EXT.minZ + 0.4],
        [EXT.maxX - 0.35, EXT.minZ + 0.4],
        [EXT.minX + 0.4, EXT.maxZ - 0.4],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.17, 0.5, 12]} />
            <Flat color="#e8590c" />
          </mesh>
          <mesh position={[0, 0.75, 0]} castShadow>
            <sphereGeometry args={[0.38, 10, 8]} />
            <Flat color="#2f9e44" />
          </mesh>
        </group>
      ))}
      {/* the ceiling lights: small warm lamps on a wire across */}
      {[-1.6, 0, 1.6].map((z) =>
        [-1.2, 1.2].map((x) => (
          <mesh key={`${x}${z}`} position={[CX + x, 2.7, CZ + z]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshBasicMaterial color="#ffe066" toneMapped={false} />
          </mesh>
        )),
      )}
    </group>
  )
}
