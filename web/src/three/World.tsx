import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Mat } from './Mat'
import { Environment, Lightformer } from '@react-three/drei'
import { bumpTexture, INK, lateriteTexture, signTexture, tinTexture, wallTexture } from './textures'

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

function Window({ x, y, w = 0.9, h = 0.85, shutter }: { x: number; y: number; w?: number; h?: number; shutter: string }) {
  return (
    <group position={[x, y, 1.2]}>
      <RoundedBox args={[w + 0.14, h + 0.14, 0.08]} radius={0.03} position={[0, 0, 0.02]} castShadow>
        <Mat color="#f8f1e4" rough={0.8} />
      </RoundedBox>
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[w, h]} />
        <meshPhysicalMaterial color="#2c4a63" roughness={0.08} clearcoat={1} />
      </mesh>
      {/* burglar bars, like on every window in Babi */}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (w / 4) * i, 0, 0.09]}>
          <cylinderGeometry args={[0.011, 0.011, h, 8]} />
          <Mat color="#3a3f45" rough={0.4} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.09]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.011, 0.011, w, 8]} />
        <Mat color="#3a3f45" rough={0.4} metalness={0.6} />
      </mesh>
      {/* open wooden shutters */}
      {[-1, 1].map((sd) => (
        <RoundedBox key={sd} args={[w / 2, h + 0.06, 0.04]} radius={0.012} position={[sd * (w * 0.75 + 0.08), 0, 0.12]} rotation={[0, sd * 0.5, 0]} castShadow>
          <Mat color={shutter} rough={0.7} />
        </RoundedBox>
      ))}
      <RoundedBox args={[w + 0.3, 0.06, 0.18]} radius={0.02} position={[0, -h / 2 - 0.07, 0.09]} castShadow>
        <Mat color="#f8f1e4" rough={0.8} />
      </RoundedBox>
    </group>
  )
}

function Building({ x, w, h, color, sign, signBg }: Shop) {
  const z = -5.6
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[w, h, 2.4]} radius={0.12} smoothness={4} position={[0, h / 2, 0]} castShadow receiveShadow>
        <Mat color="#ffffff" map={wallTexture(color)} rough={0.92} bumpMap={bumpTexture()} bumpScale={0.6} />
      </RoundedBox>
      {/* cornice and painted plinth */}
      <RoundedBox args={[w + 0.12, 0.16, 2.55]} radius={0.05} position={[0, h - 0.05, 0]} castShadow>
        <Mat color="#f8f1e4" rough={0.8} />
      </RoundedBox>
      <RoundedBox args={[w + 0.04, 0.55, 2.46]} radius={0.05} position={[0, 0.27, 0]}>
        <Mat color="#5b5f66" rough={0.9} />
      </RoundedBox>
      {/* tin roof */}
      <mesh position={[0, h + 0.14, 0.15]} rotation={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[w + 0.35, 0.05, 2.9]} />
        <Mat color="#ffffff" map={tinTexture()} rough={0.35} metalness={0.5} />
      </mesh>
      {/* door */}
      <group position={[-w * 0.24, 1.08, 1.2]}>
        <RoundedBox args={[1.05, 2.2, 0.1]} radius={0.03} castShadow>
          <Mat color="#f8f1e4" rough={0.8} />
        </RoundedBox>
        <RoundedBox args={[0.88, 2.05, 0.06]} radius={0.02} position={[0, -0.04, 0.05]}>
          <Mat color="#6b4423" rough={0.6} />
        </RoundedBox>
        <mesh position={[0.32, -0.05, 0.09]}>
          <sphereGeometry args={[0.03, 12, 10]} />
          <meshStandardMaterial color="#d4a73c" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>
      <Window x={w * 0.24} y={1.45} shutter={signBg} />
      {h > 3.9 && (
        <>
          <Window x={-w * 0.24} y={h - 1.0} shutter={signBg} w={0.7} h={0.7} />
          <Window x={w * 0.24} y={h - 1.0} shutter={signBg} w={0.7} h={0.7} />
          {/* balcony with railing */}
          <RoundedBox args={[w * 0.8, 0.1, 0.6]} radius={0.03} position={[0, h - 1.55, 1.48]} castShadow>
            <Mat color="#f8f1e4" rough={0.8} />
          </RoundedBox>
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[-w * 0.4 + (w * 0.8 * i) / 8, h - 1.3, 1.76]}>
              <cylinderGeometry args={[0.014, 0.014, 0.48, 6]} />
              <Mat color="#3a3f45" rough={0.4} metalness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, h - 1.06, 1.76]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, w * 0.8, 8]} />
            <Mat color="#3a3f45" rough={0.4} metalness={0.6} />
          </mesh>
          {/* an air conditioner */}
          <RoundedBox args={[0.6, 0.38, 0.3]} radius={0.04} position={[w * 0.38, h - 0.45, 1.32]} castShadow>
            <Mat color="#e9ecef" rough={0.5} />
          </RoundedBox>
        </>
      )}
      {/* fabric awning, slightly curved */}
      <mesh position={[0, 2.48, 1.55]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, w * 0.92, 24, 1, true, Math.PI * 0.05, Math.PI * 0.45]} />
        <Mat color={signBg} rough={0.85} side={2} />
      </mesh>
      {/* sign board */}
      <group position={[0, 3.02, 1.24]}>
        <RoundedBox args={[w * 0.88, (w * 0.85) / 4 + 0.06, 0.06]} radius={0.02} castShadow>
          <Mat color="#2b1a12" rough={0.6} />
        </RoundedBox>
        <mesh position={[0, 0, 0.032]}>
          <planeGeometry args={[w * 0.85, (w * 0.85) / 4]} />
          <meshStandardMaterial map={signTexture(sign, signBg)} roughness={0.5} />
        </mesh>
      </group>
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
          <Mat color={i % 2 ? '#8d6e4f' : '#a07f5c'} />
        </mesh>
      ))}
      <group ref={leaves} position={[Math.sin(1.2) * lean * 4, segs * 0.6 + 0.1, 0]}>
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
            <mesh castShadow position={[0.85, -0.25, 0]} rotation={[0, 0, -0.5]} scale={[1, 0.08, 0.32]}>
              <sphereGeometry args={[0.9, 12, 8]} />
              <Mat color={i % 2 ? '#2f9e44' : '#40c057'} />
            </mesh>
          </group>
        ))}
        <mesh>
          <sphereGeometry args={[0.2, 10, 8]} />
          <Mat color="#7a5230" />
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
        <Mat color="#868e96" />
      </mesh>
      <mesh position={[0, 6.1, 0]}>
        <boxGeometry args={[1.1, 0.08, 0.08]} />
        <Mat color="#495057" />
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
      <RoundedBox args={[2.2, 0.55, 1.05]} radius={0.22} smoothness={6} position={[0, 0.5, 0]} castShadow>
        <meshPhysicalMaterial color="#ff8a1f" roughness={0.3} clearcoat={1} clearcoatRoughness={0.1} />
      </RoundedBox>
      <RoundedBox args={[1.25, 0.5, 0.95]} radius={0.2} smoothness={6} position={[-0.1, 0.92, 0]} castShadow>
        <meshPhysicalMaterial color="#ff8a1f" roughness={0.3} clearcoat={1} clearcoatRoughness={0.1} />
      </RoundedBox>
      {[0.481, -0.481].map((z) => (
        <mesh key={z} position={[-0.1, 0.98, z]} rotation={[0, z > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[1.0, 0.3]} />
          <meshPhysicalMaterial color="#1d2f40" roughness={0.05} clearcoat={1} />
        </mesh>
      ))}
      <mesh position={[-0.1, 1.24, 0]}>
        <boxGeometry args={[0.35, 0.12, 0.2]} />
        <meshStandardMaterial map={signTexture('TAXI', '#ffd43b', '#2b1a12', 256, 96)} roughness={0.5} />
      </mesh>
      {[-0.7, 0.7].map((x) =>
        [-0.5, 0.5].map((z) => (
          <group key={`${x}${z}`} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh castShadow>
              <torusGeometry args={[0.15, 0.065, 12, 28]} />
              <Mat color="#1d1f22" rough={0.9} />
            </mesh>
            <mesh>
              <cylinderGeometry args={[0.11, 0.11, 0.1, 20]} />
              <meshStandardMaterial color="#c9ced4" roughness={0.25} metalness={0.9} />
            </mesh>
          </group>
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
        <Mat color={color} />
      </mesh>
      <mesh castShadow position={[0, 0.7, -0.2]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.42, 0.5, 0.04]} />
        <Mat color={color} />
      </mesh>
      {[-0.18, 0.18].map((x) =>
        [-0.18, 0.18].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.2, z]}>
            <cylinderGeometry args={[0.025, 0.03, 0.42, 6]} />
            <Mat color={color} />
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
      {/* soft sky light all around (an environment made on the spot, nothing downloaded) */}
      <Environment resolution={128} environmentIntensity={0.55}>
        <color attach="background" args={['#9fcff0']} />
        <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer form="circle" intensity={6} color="#ffe2b0" position={[8, 9, 6]} scale={4} />
        <Lightformer form="rect" intensity={0.8} color="#d8763a" position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[30, 30, 1]} />
      </Environment>
      <hemisphereLight args={['#bfe3ff', '#c9642f', 0.35]} />
      <directionalLight
        castShadow
        position={[6, 9, 5]}
        intensity={2.2}
        color="#ffeacc"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={8}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={6}
      />
      {/* laterite ground, tarmac street behind the stand, a gutter */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <Mat color="#ffffff" map={lateriteTexture()} rough={1} bumpMap={bumpTexture()} bumpScale={1.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -3]} receiveShadow>
        <planeGeometry args={[60, 2.2]} />
        <Mat color="#5c5f66" />
      </mesh>
      {[-14, -10, -6, -2, 2, 6, 10, 14].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, -3]}>
          <planeGeometry args={[1.4, 0.08]} />
          <meshBasicMaterial color="#f1f3f5" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -4.25]}>
        <planeGeometry args={[60, 0.3]} />
        <Mat color="#3b3f45" />
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
          <Mat color="#adb5bd" />
        </mesh>
        <mesh position={[0, 2.3, 0.03]}>
          <planeGeometry args={[1.3, 0.34]} />
          <meshStandardMaterial map={signTexture('RUE PRINCESSE', '#1971c2', '#fff', 512, 128)} roughness={0.5} />
        </mesh>
      </group>
      {/* plastic chairs and a little table for people who eat on the spot */}
      <group position={[-2.6, 0, 0.6]}>
        <mesh castShadow position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.04, 20]} />
          <Mat color="#f1f3f5" />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.04, 0.12, 0.6, 8]} />
          <Mat color="#f1f3f5" />
        </mesh>
        <Chair position={[-0.6, 0, 0.1]} color="#e03131" rot={Math.PI / 2} />
        <Chair position={[0.6, 0, -0.1]} color="#1c7ed6" rot={-Math.PI / 2} />
        <Chair position={[0, 0, -0.65]} color="#e03131" />
      </group>
    </>
  )
}
