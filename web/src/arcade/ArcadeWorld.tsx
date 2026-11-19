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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.3, 0.01, 0.5]} receiveShadow>
        <planeGeometry args={[10.4, 6.4]} />
        <Flat color="#fbe7c6" />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-5.5 + i * 1.04 + 0.52, 0.012, 0.5]}>
          <planeGeometry args={[0.02, 6.4]} />
          <meshBasicMaterial color="#efd3a6" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, -4.0]} receiveShadow>
        <planeGeometry args={[60, 2.4]} />
        <Flat color="#495057" />
      </mesh>
      {[-12, -8, -4, 0, 4, 8, 12].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, -4.0]}>
          <planeGeometry args={[1.4, 0.1]} />
          <meshBasicMaterial color="#f8f9fa" />
        </mesh>
      ))}
      {/* the street leading to the shop, where customers walk */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 4.4]} receiveShadow>
        <planeGeometry args={[60, 1.6]} />
        <Flat color="#d9773c" />
      </mesh>
      {SHOPS.map((s) => (
        <group key={s.sign} position={[s.x, 0, -6.6]}>
          <RoundedBox args={[s.w, s.h, 2]} radius={0.08} position={[0, s.h / 2, 0]} castShadow receiveShadow>
            <Flat color={s.c} />
          </RoundedBox>
          <mesh position={[0, s.h + 0.08, 0.1]} castShadow>
            <boxGeometry args={[s.w + 0.3, 0.12, 2.3]} />
            <Flat color="#adb5bd" />
          </mesh>
          <mesh position={[-s.w * 0.22, 0.95, 1.01]}>
            <planeGeometry args={[0.8, 1.9]} />
            <Flat color="#7a4b28" />
          </mesh>
          <mesh position={[s.w * 0.22, 1.3, 1.01]}>
            <planeGeometry args={[0.8, 0.7]} />
            <Flat color="#1e3a5f" />
          </mesh>
          <mesh position={[0, s.h - 0.45, 1.02]}>
            <planeGeometry args={[s.w * 0.85, s.w * 0.2]} />
            <meshStandardMaterial map={signTexture(s.sign, s.b)} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <Palm position={[-5.8, 0, -2.8]} />
      <Palm position={[5.2, 0, 3.4]} s={0.9} />
      <Palm position={[-6.2, 0, 3.6]} s={1.1} />
      <Palm position={[5.6, 0, -2.6]} s={0.85} />
    </>
  )
}
