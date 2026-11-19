import { RoundedBox } from '@react-three/drei'
import { signTexture } from '../three/textures'
import { Flat, Palm } from './Props'

// The street around the shop, kept simple and bright so the gameplay reads at a glance.

const SHOPS = [
  { x: -8.4, w: 3, h: 2.6, c: '#74c0fc', sign: 'CABINE', b: '#e8590c' },
  { x: -5.2, w: 3, h: 3.2, c: '#ffd43b', sign: 'MAQUIS', b: '#2b8a3e' },
  { x: 4.6, w: 3, h: 2.8, c: '#ff8787', sign: 'PRESSING', b: '#1864ab' },
  { x: 7.8, w: 3, h: 3.4, c: '#b197fc', sign: 'COIFFURE', b: '#c2255c' },
]

export function ArcadeWorld() {
  return (
    <>
      <color attach="background" args={['#8fd3ff']} />
      <fog attach="fog" args={['#bfe6ff', 18, 40]} />
      <hemisphereLight args={['#e3f4ff', '#ffcf9e', 1.5]} />
      <directionalLight
        castShadow
        position={[5, 10, 6]}
        intensity={2.2}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
        shadow-radius={3}
      />
      {/* laterite all around, the shop's own paved plot, the street behind */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <Flat color="#e8894a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.5, 0.01, 1.3]} receiveShadow>
        <planeGeometry args={[11.4, 7.8]} />
        <Flat color="#fbe7c6" />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-5.7 + i * 1.04 + 0.52, 0.012, 1.3]}>
          <planeGeometry args={[0.02, 7.8]} />
          <meshBasicMaterial color="#efd3a6" />
        </mesh>
      ))}
      <Palm position={[-6.8, 0, -1.8]} />
      <Palm position={[5.6, 0, 4.4]} s={0.9} />
      <Palm position={[-6.6, 0, 4.4]} s={1.1} />
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
