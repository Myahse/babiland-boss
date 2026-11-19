import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Toon } from './Person'
import { INK, lateriteTexture, signTexture, tinTexture } from './toon'

/** Warm late-afternoon sky dome: blue on top, peach at the horizon. */
function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { top: { value: new THREE.Color('#5fb4ea') }, bottom: { value: new THREE.Color('#ffd8a0') } },
        vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 p; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.05, 0.45, p.y)), 1.); }',
      }),
    [],
  )
  return (
    <mesh material={mat}>
      <sphereGeometry args={[80, 24, 16]} />
    </mesh>
  )
}

type Shop = { x: number; w: number; h: number; color: string; sign: string; signBg: string }
const SHOPS: Shop[] = [
  { x: -9.5, w: 3.2, h: 3.4, color: '#74c0fc', sign: 'CABINE', signBg: '#f76707' },
  { x: -6.2, w: 3.2, h: 4.6, color: '#ffe066', sign: 'MAQUIS LE BON COIN', signBg: '#2f9e44' },
  { x: -2.8, w: 3.4, h: 3.2, color: '#ffa8a8', sign: 'PRESSING', signBg: '#1c7ed6' },
  { x: 0.8, w: 3.6, h: 5.2, color: '#96f2d7', sign: 'ALIMENTATION', signBg: '#e03131' },
  { x: 4.4, w: 3.2, h: 3.6, color: '#d0bfff', sign: 'COIFFURE DAME', signBg: '#e64980' },
  { x: 7.7, w: 3.2, h: 4.2, color: '#ffc078', sign: 'QUINCAILLERIE', signBg: '#5f3dc4' },
]

function Building({ x, w, h, color, sign, signBg }: Shop) {
  const z = -5.6
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[w, h, 2.4]} radius={0.08} position={[0, h / 2, 0]} castShadow receiveShadow>
        <Toon color={color} />
        <Outlines thickness={0.03} color={INK} />
      </RoundedBox>
      {/* paint band at the bottom, like painted walls everywhere in Babi */}
      <mesh position={[0, 0.35, 1.205]}>
        <planeGeometry args={[w, 0.7]} />
        <Toon color="#495057" />
      </mesh>
      {/* tin roof */}
      <mesh position={[0, h + 0.12, 0.2]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[w + 0.3, 0.06, 2.9]} />
        <Toon color="#ffffff" map={tinTexture()} />
      </mesh>
      {/* door + windows */}
      <mesh position={[-w * 0.22, 1.05, 1.21]}>
        <planeGeometry args={[0.9, 2.1]} />
        <Toon color="#5c3b1e" />
      </mesh>
      {h > 3.5 && (
        <mesh position={[0, h - 1.2, 1.21]}>
          <planeGeometry args={[w * 0.6, 0.8]} />
          <Toon color="#1e3a5f" />
        </mesh>
      )}
      <mesh position={[w * 0.25, 1.4, 1.21]}>
        <planeGeometry args={[0.9, 0.8]} />
        <Toon color="#1e3a5f" />
      </mesh>
      {/* awning */}
      <mesh position={[0, 2.35, 1.6]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[w * 0.9, 0.04, 0.9]} />
        <Toon color={signBg} />
      </mesh>
      {/* sign */}
      <mesh position={[0, 2.85, 1.22]}>
        <planeGeometry args={[w * 0.85, (w * 0.85) / 4]} />
        <meshBasicMaterial map={signTexture(sign, signBg)} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Palm({ position, lean = 0.15 }: { position: [number, number, number]; lean?: number }) {
  const leaves = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (leaves.current) leaves.current.rotation.y = Math.sin(clock.elapsedTime * 0.7 + position[0]) * 0.06
  })
  const segs = 7
  return (
    <group position={position}>
      {Array.from({ length: segs }, (_, i) => (
        <mesh key={i} castShadow position={[Math.sin((i / segs) * 1.2) * lean * 4, i * 0.6 + 0.3, 0]} rotation={[0, 0, -lean * (i / segs)]}>
          <cylinderGeometry args={[0.13 - i * 0.008, 0.15 - i * 0.008, 0.62, 10]} />
          <Toon color={i % 2 ? '#8d6e4f' : '#a07f5c'} />
        </mesh>
      ))}
      <group ref={leaves} position={[Math.sin(1.2) * lean * 4, segs * 0.6 + 0.1, 0]}>
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
            <mesh castShadow position={[0.85, -0.25, 0]} rotation={[0, 0, -0.5]} scale={[1, 0.08, 0.32]}>
              <sphereGeometry args={[0.9, 12, 8]} />
              <Toon color={i % 2 ? '#2f9e44' : '#40c057'} />
            </mesh>
          </group>
        ))}
        <mesh>
          <sphereGeometry args={[0.2, 10, 8]} />
          <Toon color="#7a5230" />
        </mesh>
      </group>
    </group>
  )
}

function Pole({ x }: { x: number }) {
  return (
    <group position={[x, 0, -3.9]}>
      <mesh castShadow position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 6.4, 8]} />
        <Toon color="#868e96" />
      </mesh>
      <mesh position={[0, 6.1, 0]}>
        <boxGeometry args={[1.1, 0.08, 0.08]} />
        <Toon color="#495057" />
      </mesh>
    </group>
  )
}

function Wires() {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const xs = [-11, -3.5, 4, 11]
    for (const off of [-0.45, 0.45])
      for (let i = 0; i < xs.length - 1; i++)
        for (let k = 0; k <= 12; k++) {
          const t = k / 12
          const x = xs[i] + (xs[i + 1] - xs[i]) * t + off
          pts.push(new THREE.Vector3(x, 6.1 - Math.sin(t * Math.PI) * 0.5, -3.9))
          if (k > 0 && k < 12) pts.push(pts[pts.length - 1].clone())
        }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={INK} />
    </lineSegments>
  )
}

/** An orange Abidjan taxi that drives along the street behind the stand. */
function Taxi() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.elapsedTime * 3.2) % 40
    ref.current.position.x = -20 + t
    ref.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 12)) * 0.015
  })
  return (
    <group ref={ref} position={[-20, 0, -3]}>
      <RoundedBox args={[2.2, 0.55, 1.05]} radius={0.15} position={[0, 0.5, 0]} castShadow>
        <Toon color="#ff922b" />
        <Outlines thickness={0.025} color={INK} />
      </RoundedBox>
      <RoundedBox args={[1.2, 0.45, 0.95]} radius={0.15} position={[-0.1, 0.95, 0]} castShadow>
        <Toon color="#ff922b" />
        <Outlines thickness={0.025} color={INK} />
      </RoundedBox>
      <mesh position={[-0.1, 0.97, 0.48]}>
        <planeGeometry args={[1.05, 0.3]} />
        <Toon color="#1e3a5f" />
      </mesh>
      <mesh position={[-0.1, 1.24, 0]}>
        <boxGeometry args={[0.35, 0.12, 0.2]} />
        <meshBasicMaterial map={signTexture('TAXI', '#ffd43b', '#2b1a12', 256, 96)} toneMapped={false} />
      </mesh>
      {[-0.7, 0.7].map((x) =>
        [-0.5, 0.5].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.14, 16]} />
            <Toon color="#212529" />
          </mesh>
        )),
      )}
    </group>
  )
}

function Chair({ position, color, rot = 0 }: { position: [number, number, number]; color: string; rot?: number }) {
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.42, 0.05, 0.42]} />
        <Toon color={color} />
      </mesh>
      <mesh castShadow position={[0, 0.7, -0.2]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.42, 0.5, 0.04]} />
        <Toon color={color} />
      </mesh>
      {[-0.18, 0.18].map((x) =>
        [-0.18, 0.18].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.2, z]}>
            <cylinderGeometry args={[0.025, 0.03, 0.42, 6]} />
            <Toon color={color} />
          </mesh>
        )),
      )}
    </group>
  )
}

export function World() {
  return (
    <>
      <Sky />
      <fog attach="fog" args={['#ffd8a0', 18, 45]} />
      <hemisphereLight args={['#bfe3ff', '#c9642f', 1.1]} />
      <directionalLight
        castShadow
        position={[6, 9, 5]}
        intensity={2.3}
        color="#fff1d6"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={8}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />
      {/* laterite ground, tarmac street behind the stand, a gutter */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <Toon color="#ffffff" map={lateriteTexture()} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -3]} receiveShadow>
        <planeGeometry args={[60, 2.2]} />
        <Toon color="#5c5f66" />
      </mesh>
      {[-14, -10, -6, -2, 2, 6, 10, 14].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, -3]}>
          <planeGeometry args={[1.4, 0.08]} />
          <meshBasicMaterial color="#f1f3f5" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -4.25]}>
        <planeGeometry args={[60, 0.3]} />
        <Toon color="#3b3f45" />
      </mesh>
      {SHOPS.map((s) => (
        <Building key={s.sign} {...s} />
      ))}
      <Pole x={-11} />
      <Pole x={-3.5} />
      <Pole x={4} />
      <Pole x={11} />
      <Wires />
      <Palm position={[-4.3, 0, -1.6]} lean={0.12} />
      <Palm position={[5.2, 0, -1.2]} lean={-0.1} />
      <Palm position={[-8.5, 0, 1.2]} lean={0.18} />
      <Taxi />
      {/* the street sign everybody knows */}
      <group position={[3.2, 0, 1.6]}>
        <mesh castShadow position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
          <Toon color="#adb5bd" />
        </mesh>
        <mesh position={[0, 2.3, 0.03]}>
          <planeGeometry args={[1.3, 0.34]} />
          <meshBasicMaterial map={signTexture('RUE PRINCESSE', '#1971c2', '#fff', 512, 128)} toneMapped={false} />
        </mesh>
      </group>
      {/* plastic chairs and a little table for people who eat on the spot */}
      <group position={[-2.6, 0, 0.6]}>
        <mesh castShadow position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.04, 20]} />
          <Toon color="#f1f3f5" />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.04, 0.12, 0.6, 8]} />
          <Toon color="#f1f3f5" />
        </mesh>
        <Chair position={[-0.6, 0, 0.1]} color="#e03131" rot={Math.PI / 2} />
        <Chair position={[0.6, 0, -0.1]} color="#1c7ed6" rot={-Math.PI / 2} />
        <Chair position={[0, 0, -0.65]} color="#e03131" />
      </group>
    </>
  )
}
