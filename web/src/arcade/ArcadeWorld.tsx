import { RoundedBox } from '@react-three/drei'
import { signTexture } from '../three/textures'
import { useMemo } from 'react'
import { Flat, Palm } from './Props'
import { floorTexture, tier } from './looks'
import { laterite } from './StreetDecor'
import { DayNight } from './daynight'
import { Extension } from './Extension'

// The street around the shop, kept simple and bright so the gameplay reads at a glance.

const SHOPS = [
  { x: -8.4, w: 3, h: 2.6, c: '#74c0fc', sign: 'CABINE', b: '#e8590c' },
  { x: -5.2, w: 3, h: 3.2, c: '#ffd43b', sign: 'MAQUIS', b: '#2b8a3e' },
  { x: 4.6, w: 3, h: 2.8, c: '#ff8787', sign: 'PRESSING', b: '#1864ab' },
  { x: 7.8, w: 3, h: 3.4, c: '#b197fc', sign: 'COIFFURE', b: '#c2255c' },
]

/** `stage` 0 (a little corner on the pavement): bare packed earth instead of the maquis' wooden floor. */
export function ArcadeWorld({ stage = 1, room = 3 }: { stage?: number; room?: number }) {
  const floor = floorTexture(room)
  const ground = useMemo(() => laterite([10, 7]), [])
  return (
    <>
      {/* the sky, the sun or the moon, the fog: they follow the hour of the game (daynight.tsx) */}
      <DayNight />
      {/* laterite all around, the shop's own paved plot, the street behind */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial map={ground} roughness={0.95} />
      </mesh>
      {/* the plot: bare packed earth for a little corner, the wooden floor once it's a maquis (both kept, one shown:
          swapping the material would leave the floor black) */}
      {/* the floor of the room: its look follows the room's style level (looks.ts); a new mesh for each look */}
      <mesh key={`floor${room}`} rotation={[-Math.PI / 2, 0, 0]} position={[-0.5, 0.01, 1.3]} receiveShadow visible={stage >= 1}>
        <planeGeometry args={[11.4, 7.8]} />
        <meshStandardMaterial map={floor} roughness={room >= 9 ? 0.35 : 0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.5, 0.01, 1.3]} receiveShadow visible={stage < 1}>
        <planeGeometry args={[11.4, 7.8]} />
        <meshStandardMaterial color="#d6b98c" roughness={0.95} />
      </mesh>
      {/* low side wall with a red trim (the open side faces the camera) */}
      {/* (with the extension, the wall stops before the front: the way in to the air-conditioned room) */}
      <mesh position={[-6.25, 0.8, stage >= 3 ? 0.25 : 1.3]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 1.6, stage >= 3 ? 5.7 : 7.8]} />
        <Flat color={room >= 2 ? tier(room).body : '#ffe8b0'} />
      </mesh>
      <mesh position={[-6.25, 1.63, stage >= 3 ? 0.25 : 1.3]}>
        <boxGeometry args={[0.36, 0.1, stage >= 3 ? 5.76 : 7.86]} />
        <Flat color={room >= 2 ? tier(room).trim : '#e8432e'} />
      </mesh>
      {stage < 3 && <Palm position={[-6.8, 0, -1.8]} />}
      {stage < 3 && <Palm position={[-6.6, 0, 4.4]} s={1.1} />}
      <Extension stage={stage} room={room} />
      <Palm position={[5.6, 0, -1.6]} s={0.85} />
      {/* neighbours on both sides of the maquis */}
      {SHOPS.map((s, i) => (
        <group key={s.sign} position={[i < 2 ? -9.5 - i * 3.2 : 9.8 + (i - 2) * 3.2, 0, -3.6]}>
          <RoundedBox args={[s.w, s.h, 2.2]} radius={0.08} position={[0, s.h / 2, 0]} castShadow receiveShadow>
            <Flat color={s.c} />
          </RoundedBox>
          <mesh position={[0, s.h - 0.45, 1.11]}>
            <planeGeometry args={[s.w * 0.85, s.w * 0.2]} />
            <meshStandardMaterial map={signTexture(s.sign, s.b)} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.95, 1.11]}>
            <planeGeometry args={[0.8, 1.9]} />
            <Flat color="#7a4b28" />
          </mesh>
        </group>
      ))}
    </>
  )
}
