import { useMemo } from 'react'
import * as THREE from 'three'
import type { IconName } from './Icons'

// The VIP kitchen's ingredients in real 3D: about 1 unit across, sitting on y = 0, the long ones lying along x
// (so a cut across x shows their round inside). Built from simple shapes with glossy materials.
//
// `clip`: clipping planes (the slices of a cut: the same ingredient drawn between two planes).
// `cook`: 0 raw → ~0.7 golden → 1.15 burnt (the fish in the pan, the meat on the grill…).

type P = { clip?: THREE.Plane[]; cook?: number }

const mats = new Map<string, THREE.MeshStandardMaterial>()
/** a shared material (one per colour and look), or a fresh one when it is clipped or cooked */
function useMat(color: string, rough = 0.45, clip?: THREE.Plane[], extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return useMemo(() => {
    const key = `${color}|${rough}|${JSON.stringify(extra)}`
    if (!clip) {
      let m = mats.get(key)
      if (!m) mats.set(key, (m = new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra })))
      return m
    }
    return new THREE.MeshStandardMaterial({ color, roughness: rough, clippingPlanes: clip, side: THREE.DoubleSide, ...extra })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color, rough, clip])
}

/** raw → golden → burnt, for what cooks */
const RAW = new THREE.Color()
const GOLD = new THREE.Color('#c8862a')
const BURNT = new THREE.Color('#2a1608')
export function cookColor(raw: string, k: number, out = new THREE.Color()) {
  RAW.set(raw)
  if (k < 0.7) return out.copy(RAW).lerp(GOLD, k / 0.7)
  return out.copy(GOLD).lerp(BURNT, Math.min(1, (k - 0.7) / 0.45))
}

function Tomato({ clip }: P) {
  const red = useMat('#e0281c', 0.28, clip)
  const green = useMat('#2e7d32', 0.6, clip)
  return (
    <group>
      <mesh material={red} scale={[1, 0.82, 1]} position={[0, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.52, 32, 24]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} material={green} position={[Math.cos((k / 5) * Math.PI * 2) * 0.1, 0.84, Math.sin((k / 5) * Math.PI * 2) * 0.1]} rotation={[0, -(k / 5) * Math.PI * 2, 0.35]} scale={[1, 0.25, 0.45]}>
          <sphereGeometry args={[0.13, 8, 6]} />
        </mesh>
      ))}
      <mesh material={green} position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.1, 6]} />
      </mesh>
    </group>
  )
}

const onionProfile = (() => {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    const y = t * 1.0
    const r = Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.8 * 0.5 * (1 - t * 0.35)
    pts.push(new THREE.Vector2(Math.max(0.01, r), y))
  }
  pts.push(new THREE.Vector2(0.01, 1.05))
  return pts
})()
function Onion({ clip }: P) {
  const skin = useMat('#c47a35', 0.5, clip)
  const tip = useMat('#8d6e63', 0.8, clip)
  return (
    <group>
      <mesh material={skin} castShadow>
        <latheGeometry args={[onionProfile, 28]} />
      </mesh>
      <mesh material={tip} position={[0, 1.08, 0]}>
        <coneGeometry args={[0.04, 0.12, 6]} />
      </mesh>
    </group>
  )
}

/** a long pod along x (chili, plantain): a tube on a curve */
function Pod({ clip, color, tipColor, len, r, bend }: P & { color: string; tipColor: string; len: number; r: number; bend: number }) {
  const body = useMat(color, 0.3, clip)
  const tip = useMat(tipColor, 0.7, clip)
  const curve = useMemo(() => new THREE.CatmullRomCurve3([new THREE.Vector3(-len / 2, r, 0), new THREE.Vector3(0, r, bend), new THREE.Vector3(len / 2, r, 0)]), [len, r, bend])
  return (
    <group>
      <mesh material={body} castShadow>
        <tubeGeometry args={[curve, 24, r, 14, false]} />
      </mesh>
      <mesh material={body} position={[len / 2, r, 0]}>
        <sphereGeometry args={[r, 12, 10]} />
      </mesh>
      <mesh material={tip} position={[-len / 2 - 0.04, r, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 0.45, r * 0.7, 0.14, 8]} />
      </mesh>
    </group>
  )
}

function Pepper({ clip }: P) {
  const g = useMat('#3f9e3a', 0.25, clip)
  const stem = useMat('#33691e', 0.7, clip)
  return (
    <group>
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} material={g} position={[Math.cos(k * 1.57) * 0.13, 0.42, Math.sin(k * 1.57) * 0.13]} scale={[0.85, 1, 0.85]} castShadow>
          <sphereGeometry args={[0.36, 20, 16]} />
        </mesh>
      ))}
      <mesh material={stem} position={[0, 0.86, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.18, 8]} />
      </mesh>
    </group>
  )
}

function Aubergine({ clip }: P) {
  const purple = useMat('#4a148c', 0.2, clip)
  const cap = useMat('#2e7d32', 0.6, clip)
  return (
    <group>
      <mesh material={purple} position={[0.08, 0.34, 0]} scale={[1.6, 0.68, 0.68]} castShadow>
        <sphereGeometry args={[0.5, 28, 20]} />
      </mesh>
      <mesh material={cap} position={[-0.72, 0.38, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.22, 0.22, 8]} />
      </mesh>
      <mesh material={cap} position={[-0.9, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.05, 0.2, 6]} />
      </mesh>
    </group>
  )
}

function Leaves({ clip }: P) {
  const a = useMat('#4caf50', 0.5, clip)
  const b = useMat('#2e7d32', 0.5, clip)
  return (
    <group>
      {[-0.3, 0, 0.3, 0.15].map((z, k) => (
        <mesh key={k} material={k % 2 ? a : b} position={[0, 0.06 + k * 0.05, z]} rotation={[0, k * 0.4 - 0.4, 0]} scale={[1.1, 0.06, 0.32]} castShadow>
          <sphereGeometry args={[0.5, 16, 8]} />
        </mesh>
      ))}
    </group>
  )
}

function Fish({ clip, cook = 0 }: P) {
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8fa3ad', roughness: 0.35, metalness: 0.15, clippingPlanes: clip }), [clip])
  body.color.copy(cookColor('#8fa3ad', cook))
  const eye = useMat('#111', 0.2)
  return (
    <group>
      <mesh material={body} position={[0, 0.2, 0]} scale={[1.25, 0.36, 0.5]} castShadow>
        <sphereGeometry args={[0.5, 28, 16]} />
      </mesh>
      <mesh material={body} position={[0.78, 0.2, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.2]}>
        <coneGeometry args={[0.3, 0.42, 3]} />
      </mesh>
      <mesh material={body} position={[0.05, 0.4, 0]} rotation={[0, 0, -0.4]} scale={[1, 1, 0.15]}>
        <coneGeometry args={[0.16, 0.24, 3]} />
      </mesh>
      <mesh material={eye} position={[-0.45, 0.3, 0.17]}>
        <sphereGeometry args={[0.04, 8, 6]} />
      </mesh>
    </group>
  )
}

function Meat({ clip, cook = 0 }: P) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b3261e', roughness: 0.55, clippingPlanes: clip }), [clip])
  m.color.copy(cookColor('#b3261e', cook))
  const fat = useMat('#fde2d8', 0.6, clip)
  return (
    <group>
      {[-0.42, 0, 0.42].map((x) => (
        <mesh key={x} material={m} position={[x, 0.2, 0]} rotation={[0.3, x, 0.2]} castShadow>
          <boxGeometry args={[0.36, 0.3, 0.34]} />
        </mesh>
      ))}
      <mesh material={fat} position={[0, 0.36, 0.05]}>
        <boxGeometry args={[1.0, 0.04, 0.06]} />
      </mesh>
      {/* the skewer of the choukouya */}
      <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 1.5, 6]} />
        <meshStandardMaterial color="#d7b98e" />
      </mesh>
    </group>
  )
}

function Chicken({ clip, cook = 0 }: P) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f0c27a', roughness: 0.4, clippingPlanes: clip }), [clip])
  m.color.copy(cookColor('#f0c27a', cook * 0.9))
  const bone = useMat('#fffbe9', 0.5, clip)
  return (
    <group rotation={[0, 0, 0.1]}>
      <mesh material={m} position={[-0.15, 0.3, 0]} scale={[1.3, 0.85, 0.85]} castShadow>
        <sphereGeometry args={[0.35, 24, 16]} />
      </mesh>
      <mesh material={bone} position={[0.42, 0.22, 0]} rotation={[0, 0, Math.PI / 2 - 0.2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.45, 8]} />
      </mesh>
      <mesh material={bone} position={[0.66, 0.2, 0.05]}>
        <sphereGeometry args={[0.08, 10, 8]} />
      </mesh>
      <mesh material={bone} position={[0.66, 0.2, -0.05]}>
        <sphereGeometry args={[0.08, 10, 8]} />
      </mesh>
    </group>
  )
}

function Egg() {
  const white = useMat('#fffdf6', 0.35)
  const yolk = useMat('#ffae00', 0.2)
  return (
    <group>
      <mesh material={white} position={[0, 0.03, 0]} scale={[1, 1, 0.85]} receiveShadow>
        <cylinderGeometry args={[0.5, 0.52, 0.05, 28]} />
      </mesh>
      <mesh material={yolk} position={[0.05, 0.05, 0]} scale={[1, 0.6, 1]} castShadow>
        <sphereGeometry args={[0.18, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  )
}

const grains = Array.from({ length: 40 }, (_, k) => {
  const a = k * 2.4
  const r = Math.sqrt((k + 0.5) / 40) * 0.42
  return [Math.cos(a) * r, Math.sin(a) * r] as const
})
/** a mound (attiéké, rice): grains on a soft heap */
function Mound({ color = '#fbf6e6', grainy = true }: { color?: string; grainy?: boolean }) {
  const m = useMat(color, 0.8)
  const g = useMat('#e6dcc3', 0.8)
  return (
    <group>
      <mesh material={m} scale={[1, 0.55, 1]} castShadow>
        <sphereGeometry args={[0.5, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {grainy &&
        grains.map(([x, z], k) => (
          <mesh key={k} material={g} position={[x, Math.sqrt(Math.max(0, 0.25 - x * x - z * z)) * 0.55 + 0.005, z]} rotation={[k, k * 2, 0]}>
            <sphereGeometry args={[0.025, 5, 4]} />
          </mesh>
        ))}
    </group>
  )
}

const bowlProfile = [new THREE.Vector2(0.01, 0), new THREE.Vector2(0.28, 0), new THREE.Vector2(0.46, 0.18), new THREE.Vector2(0.52, 0.34), new THREE.Vector2(0.48, 0.34), new THREE.Vector2(0.42, 0.2), new THREE.Vector2(0.01, 0.05)]
function Bowl({ fill, color = '#8d6e63' }: { fill: string; color?: string }) {
  const b = useMat(color, 0.6, undefined, { side: THREE.DoubleSide })
  const f = useMat(fill, 0.3)
  return (
    <group>
      <mesh material={b} castShadow>
        <latheGeometry args={[bowlProfile, 28]} />
      </mesh>
      <mesh material={f} position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.45, 28]} />
      </mesh>
    </group>
  )
}

function Salad() {
  return (
    <group>
      <Leaves />
      <group position={[0.15, 0.12, 0.05]} scale={0.35}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.5, 0.12, 20]} />
          <meshStandardMaterial color="#e53935" roughness={0.3} />
        </mesh>
      </group>
      <mesh position={[-0.2, 0.14, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.03, 8, 20]} />
        <meshStandardMaterial color="#f3e5f5" />
      </mesh>
    </group>
  )
}

/** the ingredient `icon` in 3D (about 1 unit, on the ground) */
export function Ingredient({ icon, clip, cook }: { icon: IconName } & P) {
  switch (icon) {
    case 'tomato':
      return <Tomato clip={clip} />
    case 'onion':
      return <Onion clip={clip} />
    case 'chili':
      return <Pod clip={clip} color="#d81b1b" tipColor="#2e7d32" len={0.95} r={0.12} bend={0.18} />
    case 'plantain':
      return <Pod clip={clip} color="#f4c21b" tipColor="#4e342e" len={1.5} r={0.2} bend={0.3} />
    case 'pepper':
      return <Pepper clip={clip} />
    case 'aubergine':
      return <Aubergine clip={clip} />
    case 'leaves':
      return <Leaves clip={clip} />
    case 'fish':
      return <Fish clip={clip} cook={cook} />
    case 'meat':
      return <Meat clip={clip} cook={cook} />
    case 'chicken':
      return <Chicken clip={clip} cook={cook} />
    case 'egg':
      return <Egg />
    case 'rice':
      return <Mound />
    case 'mound':
      return <Mound color="#f6ecc4" grainy={false} />
    case 'salad':
      return <Salad />
    case 'stew':
      return <Bowl fill="#d84315" />
    case 'bowl':
      return <Bowl fill="#efe6cf" />
    default:
      return <Mound color="#ddd" grainy={false} />
  }
}

/** What you see where you cut: the inside's colour, its skin, its radius at x (for the round caps) and its height. */
export const INSIDE: Partial<Record<IconName, { flesh: string; skin: string; r: (x: number) => number; y: number; seeds?: string }>> = {
  tomato: { flesh: '#ff7a5c', skin: '#e0281c', r: (x) => Math.sqrt(Math.max(0, 0.27 - x * x)) * 0.85, y: 0.42, seeds: '#ffd27a' },
  onion: { flesh: '#f6eef2', skin: '#c47a35', r: (x) => Math.sqrt(Math.max(0, 0.25 - x * x)) * 0.95, y: 0.45 },
  chili: { flesh: '#ff6f61', skin: '#d81b1b', r: () => 0.12, y: 0.12, seeds: '#fff3d6' },
  plantain: { flesh: '#fff1bf', skin: '#f4c21b', r: () => 0.2, y: 0.2 },
  pepper: { flesh: '#c5e1a5', skin: '#3f9e3a', r: (x) => Math.sqrt(Math.max(0, 0.24 - x * x)), y: 0.42 },
  aubergine: { flesh: '#f2ebd3', skin: '#4a148c', r: (x) => Math.sqrt(Math.max(0, 1 - ((x - 0.08) / 0.8) ** 2)) * 0.34, y: 0.34, seeds: '#a1887f' },
  leaves: { flesh: '#7cb342', skin: '#2e7d32', r: () => 0.05, y: 0.08 },
}
