import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { signTexture } from '../three/textures'
import { Flat, Plate } from './Props'
import { ToonPerson } from './ToonPerson'
import type { PersonId } from '../three/RealPerson'
import type { Place } from './places'
import { SLOT0, SLOT_STEP } from './layout'
import { asphalt, kerb } from './StreetDecor'
import { glowing, night } from './daynight'

// The maquis building, its terraces, and the street corner around it — like a busy restaurant
// in the shop games: two floors, a big sign on the roof, people eating on the terraces, taxis going by.

const W = 10.6 // building width
const X0 = -0.5 // building centre x
const Z0 = -3.6 // building centre z
const D = 2.4 // depth
const H1 = 2.9 // ground floor height

/** A table with two chairs and a parasol (used on both terraces). */
export function TerraceTable({ parasol = '#e03131', plates = 0, ...props }: { parasol?: string; plates?: number } & ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh castShadow position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.05, 14]} />
        <Flat color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.04, 0.12, 0.72, 8]} />
        <Flat color="#dee2e6" />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.62, 0, 0]} rotation={[0, (s * -Math.PI) / 2, 0]}>
          <mesh castShadow position={[0, 0.44, 0]}>
            <boxGeometry args={[0.42, 0.05, 0.42]} />
            <Flat color="#f8f9fa" />
          </mesh>
          <mesh castShadow position={[0, 0.7, -0.2]}>
            <boxGeometry args={[0.42, 0.48, 0.05]} />
            <Flat color="#f8f9fa" />
          </mesh>
          {[-0.17, 0.17].map((x) =>
            [-0.17, 0.17].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.21, z]}>
                <boxGeometry args={[0.04, 0.42, 0.04]} />
                <Flat color="#ced4da" />
              </mesh>
            )),
          )}
        </group>
      ))}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.2, 6]} />
        <Flat color="#868e96" />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} castShadow position={[0, 1.95, 0]} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
          <coneGeometry args={[0.95, 0.35, 1, 1, true, 0, Math.PI / 4 + 0.01]} />
          <Flat color={i % 2 ? parasol : '#ffffff'} side={2} />
        </mesh>
      ))}
      {Array.from({ length: plates }, (_, i) => (
        <Plate key={i} position={[(i - (plates - 1) / 2) * 0.32, 0.76, 0]} />
      ))}
    </group>
  )
}

const WINDOW_GLASS = new THREE.MeshStandardMaterial({ color: '#ffd8a8', emissive: '#ffb347', emissiveIntensity: 0.55, roughness: 0.2 })
glowing.lamps.push(WINDOW_GLASS)

function Window({ x, y, w = 1.3, h = 1.2, z = D / 2 + 0.01 }: { x: number; y: number; w?: number; h?: number; z?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh>
        <boxGeometry args={[w + 0.14, h + 0.14, 0.06]} />
        <Flat color="#fff3dc" />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[w, h]} />
        {/* warm light inside the maquis (brighter at night) */}
        <primitive object={WINDOW_GLASS} attach="material" />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <boxGeometry args={[0.05, h, 0.02]} />
        <Flat color="#fff3dc" />
      </mesh>
    </group>
  )
}

/** Seated decor people for the upstairs terrace. */
const UP_PEOPLE: { who: PersonId; x: number; z: number; r: number }[] = [
  { who: 'awa', x: -4.2, z: 0.62, r: Math.PI / 2 },
  { who: 'yao', x: -1.7, z: -0.62, r: -Math.PI / 2 },
  { who: 'fatou', x: 1.6, z: 0.62, r: Math.PI / 2 },
  { who: 'koffi', x: 3.9, z: -0.62, r: -Math.PI / 2 },
]

/** Rolling metal shutters of a shop that isn't yours yet. */
function shutterTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')!
  for (let y = 0; y < 256; y += 16) {
    g.fillStyle = y % 32 ? '#adb5bd' : '#ced4da'
    g.fillRect(0, y, 256, 16)
    g.fillStyle = '#868e96'
    g.fillRect(0, y + 14, 256, 2)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * The building, at each stage of the place (growth.ts): 0 a closed shop « À LOUER » behind your little table,
 * 1 the maquis (open kitchen, awning, sign), 2 the restaurant (the upstairs terrace opens, the sign lights up),
 * 3 the grand restaurant (golden sign, red carpet, lamps).
 */
export function Building({ name, place, stage = 2 }: { name: string; place: Place; stage?: number }) {
  const sign = useMemo(
    () => (stage >= 3 ? signTexture(`★ ${place.dishLabel.toUpperCase()} CHEZ ${name.toUpperCase()} ★`, '#2b1a12', '#ffd43b', 1024, 192) : signTexture(`${place.dishLabel.toUpperCase()} CHEZ ${name.toUpperCase()}`, '#c92a2a', '#ffe066', 1024, 192)),
    [name, place, stage],
  )
  const shutters = useMemo(() => shutterTexture(), [])
  const forRent = useMemo(() => signTexture('À LOUER', '#ffffff', '#e03131', 384, 128), [])
  const lights = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    // the bulbs of the sign twinkle a little
    lights.current?.children.forEach((c, i) => {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
      m.emissiveIntensity = (1.2 + Math.sin(clock.elapsedTime * 4 + i) * 0.6) * (0.5 + night() * 1.4)
    })
  })
  return (
    <group position={[X0, 0, Z0]}>
      {/* ground floor */}
      <RoundedBox args={[W, H1, D]} radius={0.06} position={[0, H1 / 2, 0]} castShadow receiveShadow>
        <Flat color={place.wall} />
      </RoundedBox>
      <mesh position={[0, 0.35, D / 2 + 0.005]}>
        <planeGeometry args={[W, 0.7]} />
        <Flat color="#c2410c" />
      </mesh>
      {[-4, -2.4, 1.6, 3.4].map((x) => (
        <Window key={x} x={x} y={1.55} />
      ))}
      {/* wide open front where the kitchen is (closed shutters while it isn't yours) */}
      <mesh position={[-0.4, 1.25, D / 2 + 0.01]}>
        <planeGeometry args={[2.2, 2.3]} />
        {/* a key: a new material when it changes (the same one with a map added would stay black) */}
        {stage === 0 ? <meshStandardMaterial key="shut" map={shutters} roughness={0.6} metalness={0.3} /> : <meshStandardMaterial key="open" color="#5c2d0c" roughness={0.9} />}
      </mesh>
      {stage === 0 && (
        <mesh position={[-0.4, 1.7, D / 2 + 0.03]} rotation={[0, 0, -0.06]}>
          <planeGeometry args={[1.3, 0.42]} />
          <meshStandardMaterial map={forRent} roughness={0.7} />
        </mesh>
      )}
      {/* striped awning */}
      {stage >= 1 && Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} castShadow position={[-W / 2 + 0.38 + i * 0.76, 2.55, D / 2 + 0.45]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.76, 0.04, 1.0]} />
          <Flat color={i % 2 ? place.awning[1] : place.awning[0]} />
        </mesh>
      ))}
      {/* upstairs: floor slab, terrace railing, tables and people eating */}
      <mesh position={[0, H1 + 0.06, 0.3]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.2, 0.12, D + 0.6]} />
        <Flat color="#fff3dc" />
      </mesh>
      <RoundedBox args={[W, 2.2, 0.9]} radius={0.05} position={[0, H1 + 1.2, -D / 2 + 0.45]} castShadow>
        <Flat color={place.wall} />
      </RoundedBox>
      {[-3.5, -1, 1.5, 4].map((x) => (
        <Window key={x} x={x} y={H1 + 1.25} w={1.0} h={1.0} z={-D / 2 + 0.91} />
      ))}
      {stage < 2 && (
        <RoundedBox args={[W - 0.1, 2.1, D - 0.2]} radius={0.05} position={[0, H1 + 1.15, 0.1]} castShadow>
          <Flat color={stage === 0 ? '#e9ecef' : place.wall} />
        </RoundedBox>
      )}
      {stage < 2 && [-3.5, -1, 1.5, 4].map((x) => <Window key={`c${x}`} x={x} y={H1 + 1.15} w={0.9} h={0.9} z={D / 2 + 0.02} />)}
      {stage >= 2 && Array.from({ length: 27 }, (_, i) => (
        <mesh key={i} position={[-W / 2 + 0.2 + i * 0.395, H1 + 0.45, D / 2 + 0.55]}>
          <boxGeometry args={[0.05, 0.7, 0.05]} />
          <Flat color="#495057" />
        </mesh>
      ))}
      {stage >= 2 && (
        <mesh position={[0, H1 + 0.82, D / 2 + 0.55]}>
          <boxGeometry args={[W + 0.1, 0.07, 0.08]} />
          <Flat color="#495057" />
        </mesh>
      )}
      {stage >= 2 && [-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 + 0.05), H1 + 0.45, 0.3]}>
          <boxGeometry args={[0.08, 0.75, D + 0.6]} />
          <Flat color="#495057" />
        </mesh>
      ))}
      {/* string lights along the railing */}
      {stage >= 2 && Array.from({ length: 22 }, (_, i) => (
        <mesh key={i} position={[-W / 2 + 0.3 + i * 0.48, H1 + 1.05 + Math.sin((i % 4) * 0.8) * 0.06, D / 2 + 0.55]}>
          <sphereGeometry args={[0.045, 6, 5]} />
          <meshStandardMaterial color="#fff3bf" emissive="#ffd43b" emissiveIntensity={1.5} />
        </mesh>
      ))}
      <group position={[0, H1 + 0.12, 0.55]} visible={stage >= 2}>
        {[-3.6, -1.1, 1.0, 3.3].map((x, i) => (
          <TerraceTable key={x} position={[x, 0, 0.2]} parasol={['#e03131', '#1c7ed6', '#2f9e44', '#f59f00'][i]} plates={1 + (i % 2)} />
        ))}
        {UP_PEOPLE.map((p) => (
          <ToonPerson key={p.who} who={p.who} moving={false} sitting position={[p.x + (p.r > 0 ? -0.1 : 0.1), 0, 0.2 + p.z * 0]} rotation={[0, p.r, 0]} scale={1.1} />
        ))}
      </group>
      {/* roof with AC units, and the big sign with bulbs */}
      <mesh position={[0, H1 + 2.32, -D / 2 + 0.45]} castShadow>
        <boxGeometry args={[W + 0.1, 0.1, 1.0]} />
        <Flat color="#868e96" />
      </mesh>
      {[-3.8, -2.6, 3.2].map((x) => (
        <RoundedBox key={x} args={[0.7, 0.45, 0.6]} radius={0.04} position={[x, H1 + 2.6, -D / 2 + 0.4]} castShadow>
          <Flat color="#dee2e6" />
        </RoundedBox>
      ))}
      <group position={[0.2, H1 + 3.0, -D / 2 + 0.95]} visible={stage >= 1} scale={stage === 1 ? 0.8 : stage >= 3 ? 1.12 : 1}>
        <mesh castShadow>
          <boxGeometry args={[5.6, 1.05, 0.12]} />
          {stage >= 3 ? <meshStandardMaterial key="gold" color="#fcc419" metalness={0.7} roughness={0.25} /> : <Flat key="plain" color="#ffd43b" />}
        </mesh>
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[5.3, 0.9]} />
          <meshStandardMaterial map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.35} roughness={0.4} />
        </mesh>
        <group ref={lights} visible={stage >= 2}>
          {Array.from({ length: 24 }, (_, i) => {
            const t = i / 24
            const top = i < 12
            return (
              <mesh key={i} position={[-2.65 + (top ? t * 2 : (t - 0.5) * 2) * 5.3, top ? 0.58 : -0.58, 0.08]}>
                <sphereGeometry args={[0.05, 6, 5]} />
                <meshStandardMaterial color="#fff9db" emissive="#ffe066" emissiveIntensity={1.5} />
              </mesh>
            )
          })}
        </group>
        {[-2, 2].map((x) => (
          <mesh key={x} position={[x, -0.75, -0.05]}>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
            <Flat color="#495057" />
          </mesh>
        ))}
      </group>
      {/* menu boards beside the kitchen */}
      {[
        [`${place.dishLabel.toUpperCase()} ${place.plate}`, -1.9],
        ['LIVRAISON 🛵', 1.1],
      ]
        .filter((_, k) => stage >= 1 || k === 0)
        .map(([t, x]) => (
        <mesh key={t as string} position={[x as number, 1.9, D / 2 + 0.02]}>
          <planeGeometry args={[0.9, 0.3]} />
          <meshStandardMaterial map={signTexture(t as string, '#2b1a12', '#ffe066', 384, 128)} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/** A little yellow-orange taxi driving round the block. */
function Taxi({ path, speed, offset = 0 }: { path: (t: number) => { x: number; z: number; r: number }; speed: number; offset?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const p = path((clock.elapsedTime * speed + offset) % 1)
    ref.current?.position.set(p.x, 0, p.z)
    if (ref.current) ref.current.rotation.y = p.r
  })
  return (
    <group ref={ref}>
      <RoundedBox args={[1.0, 0.42, 2.0]} radius={0.12} position={[0, 0.42, 0]} castShadow>
        <Flat color="#fcc419" />
      </RoundedBox>
      <RoundedBox args={[0.86, 0.38, 1.0]} radius={0.12} position={[0, 0.78, -0.1]} castShadow>
        <Flat color="#fcc419" />
      </RoundedBox>
      <mesh position={[0, 0.8, 0.41]}>
        <boxGeometry args={[0.78, 0.26, 0.02]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.1} />
      </mesh>
      <mesh position={[0, 1.02, -0.1]}>
        <boxGeometry args={[0.3, 0.1, 0.16]} />
        <meshStandardMaterial map={signTexture('TAXI', '#ffffff', '#2b1a12', 256, 96)} />
      </mesh>
      {[-0.46, 0.46].map((x) =>
        [-0.62, 0.62].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.2, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.14, 10]} />
            <Flat color="#212529" />
          </mesh>
        )),
      )}
    </group>
  )
}

/** The street corner: a road in front and one on the right, pavements, planters and taxis. */
export function Streets() {
  const front = useMemo(() => (t: number) => ({ x: -16 + t * 32, z: 6.2, r: Math.PI / 2 }), [])
  const side = useMemo(() => (t: number) => ({ x: 7.6, z: 14 - t * 28, r: Math.PI }), [])
  const road = useMemo(() => ({ front: asphalt([20, 1]), side: asphalt([1, 20]), kerbX: kerb(120), kerbZ: kerb(120) }), [])
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 6.6]} receiveShadow>
        <planeGeometry args={[60, 2.8]} />
        <meshStandardMaterial map={road.front} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7.8, 0.012, 0]} receiveShadow>
        <planeGeometry args={[2.8, 60]} />
        <meshStandardMaterial map={road.side} roughness={0.9} />
      </mesh>
      {[-14, -10, -6, -2, 2, 10, 14].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 6.6]}>
          <planeGeometry args={[1.4, 0.1]} />
          <meshBasicMaterial color="#f8f9fa" />
        </mesh>
      ))}
      {[-12, -8, -4, 0, 10, 14].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[7.8, 0.022, z]}>
          <planeGeometry args={[0.1, 1.4]} />
          <meshBasicMaterial color="#f8f9fa" />
        </mesh>
      ))}
      {/* zebra crossing at the corner */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[5.6 + i * 0.4 - 1, 0.024, 6.6]}>
          <planeGeometry args={[0.22, 2.4]} />
          <meshBasicMaterial color="#f8f9fa" />
        </mesh>
      ))}
      {/* kerbs painted red and white */}
      <mesh position={[0, 0.07, 5.2]}>
        <boxGeometry args={[60, 0.14, 0.16]} />
        <meshStandardMaterial map={road.kerbX} roughness={0.6} />
      </mesh>
      <mesh position={[6.35, 0.07, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[60, 0.14, 0.16]} />
        <meshStandardMaterial map={road.kerbZ} roughness={0.6} />
      </mesh>
      <Taxi path={front} speed={0.045} />
      <Taxi path={front} speed={0.045} offset={0.5} />
      <Taxi path={side} speed={0.04} offset={0.3} />
    </>
  )
}

/** The grand restaurant: a red carpet under the queue and golden lamps on each side. */
export function GrandDecor() {
  const dir = Math.atan2(SLOT_STEP.x, SLOT_STEP.z)
  const len = 7.2
  const mid = SLOT0.clone().addScaledVector(SLOT_STEP.clone().normalize(), len / 2 - 0.4)
  return (
    <group>
      <mesh position={[mid.x, 0.03, mid.z]} rotation={[-Math.PI / 2, 0, dir]} receiveShadow>
        <planeGeometry args={[1.0, len]} />
        <meshStandardMaterial color="#c92a2a" roughness={0.9} />
      </mesh>
      {[-0.55, 0.55].map((side) =>
        [0.6, 3.2, 5.8].map((t) => {
          const p = SLOT0.clone().addScaledVector(SLOT_STEP.clone().normalize(), t)
          const nx = Math.cos(dir) * side
          const nz = -Math.sin(dir) * side
          return (
            <group key={`${side}${t}`} position={[p.x + nx * 1.2, 0, p.z + nz * 1.2]}>
              <mesh position={[0, 0.55, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.08, 1.1, 8]} />
                <meshStandardMaterial color="#fcc419" metalness={0.8} roughness={0.25} />
              </mesh>
              <mesh position={[0, 1.15, 0]}>
                <sphereGeometry args={[0.13, 12, 10]} />
                <meshStandardMaterial color="#fff9db" emissive="#ffd43b" emissiveIntensity={1.4} />
              </mesh>
            </group>
          )
        }),
      )}
    </group>
  )
}
