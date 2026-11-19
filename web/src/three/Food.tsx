import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Mat } from './Mat'
import { attiekeTexture, bumpTexture, cutFaceTexture } from './textures'

export type Veg = 'tomate' | 'oignon'
export const VEG_R = 0.095
const SKIN: Record<Veg, string> = { tomate: '#c9230f', oignon: '#b8743a' }

/** One piece of a sphere between x=a and x=b (the sphere is lying along x). */
function chunkGeometry(r: number, a: number, b: number) {
  const pts = [new THREE.Vector2(0.0005, a)]
  const n = 14
  for (let i = 0; i <= n; i++) {
    const y = a + ((b - a) * i) / n
    pts.push(new THREE.Vector2(Math.sqrt(Math.max(r * r - y * y, 0)) + 0.0005, y))
  }
  pts.push(new THREE.Vector2(0.0005, b))
  return new THREE.LatheGeometry(pts, 28)
}

/**
 * A tomato or onion that can be sliced. `cuts` are x positions (inside -r..r) where the knife went
 * through; the pieces spread apart a little so you see each slice with its cut face.
 */
export function Sliceable({ kind, cuts, ...group }: { kind: Veg; cuts: number[] } & ThreeElements['group']) {
  const r = VEG_R
  const bounds = useMemo(() => [-r, ...[...cuts].sort((a, b) => a - b), r], [cuts, r])
  const pieces = useMemo(() => bounds.slice(0, -1).map((a, i) => ({ a, b: bounds[i + 1], geo: chunkGeometry(r, a, bounds[i + 1]) })), [bounds, r])
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame((_, dt) => {
    const mid = (pieces.length - 1) / 2
    pieces.forEach((_, i) => {
      const g = refs.current[i]
      if (g) g.position.x += ((i - mid) * 0.018 - g.position.x) * Math.min(1, dt * 10)
    })
  })
  const face = cutFaceTexture(kind)
  return (
    <group {...group}>
      <group scale={kind === 'oignon' ? [1, 0.92, 0.92] : [1, 0.9, 1]}>
        {pieces.map((p, i) => (
          <group key={`${i}:${p.a}:${p.b}`} ref={(el) => void (refs.current[i] = el)}>
            <mesh geometry={p.geo} rotation={[0, 0, -Math.PI / 2]} castShadow>
              <meshPhysicalMaterial color={SKIN[kind]} roughness={kind === 'tomate' ? 0.22 : 0.45} clearcoat={kind === 'tomate' ? 1 : 0.3} />
            </mesh>
            {i > 0 && <CutFace x={p.a + 0.0012} r={Math.sqrt(r * r - p.a * p.a)} dir={-1} map={face} />}
            {i < pieces.length - 1 && <CutFace x={p.b - 0.0012} r={Math.sqrt(r * r - p.b * p.b)} dir={1} map={face} />}
          </group>
        ))}
        {kind === 'tomate' ? (
          <group position={[r - 0.004, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            {Array.from({ length: 5 }, (_, i) => (
              <mesh key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]} position={[0, 0.004, 0]}>
                <boxGeometry args={[0.012, 0.006, 0.05]} />
                <Mat color="#2f9e44" />
              </mesh>
            ))}
            <mesh position={[0, 0.015, 0]}>
              <cylinderGeometry args={[0.006, 0.008, 0.025, 6]} />
              <Mat color="#2b8a3e" />
            </mesh>
          </group>
        ) : (
          <mesh position={[r + 0.008, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.018, 0.04, 8]} />
            <Mat color="#c4a484" />
          </mesh>
        )}
      </group>
    </group>
  )
}

function CutFace({ x, r, dir, map }: { x: number; r: number; dir: 1 | -1; map: THREE.Texture }) {
  return (
    <mesh position={[x, 0, 0]} rotation={[0, (dir * Math.PI) / 2, 0]}>
      <circleGeometry args={[r, 28]} />
      <Mat color="#ffffff" map={map} />
    </mesh>
  )
}

/** Colour of fried fish for a cook level 0 (raw) .. 1+ (burnt). */
export function fishColor(c: number) {
  const stops: [number, string][] = [
    [0, '#d8b4a0'],
    [0.55, '#e8a33d'],
    [0.75, '#c4741f'],
    [1, '#5a2e10'],
    [1.2, '#241510'],
  ]
  const col = new THREE.Color()
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i]
    const [b, cb] = stops[i + 1]
    if (c <= b || i === stops.length - 2) {
      const t = THREE.MathUtils.clamp((c - a) / (b - a), 0, 1)
      return col.set(ca).lerp(new THREE.Color(cb), t)
    }
  }
  return col
}

/** A piece of fried thon (tuna), the fish of garba. */
export function FishPiece({ color, ...mesh }: { color: THREE.Color | string } & ThreeElements['group']) {
  return (
    <group {...mesh}>
      <RoundedBox args={[0.1, 0.045, 0.07]} radius={0.018} castShadow>
        <Mat color={color} rough={0.45} bumpMap={bumpTexture()} bumpScale={2} />
      </RoundedBox>
    </group>
  )
}

/** A mound of attiéké (fermented cassava semolina). */
export function Attieke({ size = 1, ...group }: { size?: number } & ThreeElements['group']) {
  return (
    <group {...group}>
      <mesh castShadow scale={[size, size * 0.55, size]}>
        <sphereGeometry args={[0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color="#ffffff" map={attiekeTexture()} rough={0.9} bumpMap={bumpTexture()} bumpScale={3} />
      </mesh>
    </group>
  )
}

export function Piment({ green = false, ...group }: { green?: boolean } & ThreeElements['group']) {
  return (
    <group {...group}>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.011, 0.035, 6, 12]} />
        <meshPhysicalMaterial color={green ? '#37b24d' : '#e03131'} roughness={0.2} clearcoat={1} />
      </mesh>
      <mesh position={[0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.005, 0.015, 5]} />
        <Mat color="#2b8a3e" />
      </mesh>
    </group>
  )
}

/** A little round slice (used for the tomato-onion mix on the plate). */
export function Slice({ kind, ...group }: { kind: Veg } & ThreeElements['group']) {
  return (
    <group {...group}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.01, 16]} />
        <Mat color={SKIN[kind]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0055, 0]}>
        <circleGeometry args={[0.028, 16]} />
        <Mat color="#ffffff" map={cutFaceTexture(kind)} />
      </mesh>
    </group>
  )
}

/** Scales a thing up from zero with a small bounce when it appears. */
export function PopIn({ children, delay = 0, ...group }: { delay?: number } & ThreeElements['group']) {
  const ref = useRef<THREE.Group>(null)
  const t = useRef(-delay)
  useFrame((_, dt) => {
    t.current += dt
    const k = THREE.MathUtils.clamp(t.current / 0.35, 0, 1)
    const s = k < 1 ? Math.sin(k * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1
    ref.current?.scale.setScalar(Math.max(0.0001, s))
  })
  return (
    <group ref={ref} scale={0.0001} {...group}>
      {children}
    </group>
  )
}
