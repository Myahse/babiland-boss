import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { create } from 'zustand'
import type { IconName } from './Icons'
import { Ingredient, INSIDE } from './Food3D'
import { woodTexture } from './Props'

// The VIP's kitchen in 3D (VipCook.tsx keeps the rules, the buttons and the words on top): the worktop, the tiled
// wall with its strip of wax, and for each step its things — the board, the ingredient really cut into slices
// (each slice is the same ingredient between two clipping planes, with its inside on the cut faces), the knife,
// the gas ring and its flames, the pan / grill / pot, the plate the ingredients fall onto.

// ---------------------------------------------------------------- what the rules tell the 3D
export type Flash = { x: number; id: number }
type Kitchen = {
  step: number
  /** cutting: the ingredient, the cuts (world x), which guides are used, the cuts' flashes, all cut */
  item: IconName | null
  cuts: number[]
  used: boolean[]
  flashes: Flash[]
  finished: boolean
  /** the knife under the finger (world x, z), or none */
  knife: [number, number] | null
  /** cooking: on what, which food */
  on: 'pan' | 'grill' | 'pot'
  food: IconName
  /** plating: the ingredients in order, how many are on the plate */
  plate: IconName[]
  placed: number
}
export const useKitchen = create<Kitchen>(() => ({ step: 0, item: null, cuts: [], used: [false, false, false], flashes: [], finished: false, knife: null, on: 'pan', food: 'fish', plate: [], placed: 0 }))
/** the cooking, read every frame (VipCook writes it) */
export const cookLive = { shown: 0, side: 0, flip: 0, done: false, burning: false }

/** where the guides are on the board (world x) and how wide the ingredient is */
export const GUIDE_X = [-0.55, 0, 0.55]
export const HALF = 1.1
/** the ingredient is drawn this much bigger on the board */
const ITEM_SCALE = 2

// ---------------------------------------------------------------- the finger on the board
const cam = { camera: null as THREE.Camera | null, el: null as HTMLElement | null }
const ray = new THREE.Raycaster()
// for the automatic tests: where a point of the kitchen is on the screen
if (import.meta.env.DEV)
  Object.assign(window, {
    kitchenToScreen: (x: number, y: number, z: number) => {
      if (!cam.camera || !cam.el) return null
      const r = cam.el.getBoundingClientRect()
      const v = new THREE.Vector3(x, y, z).project(cam.camera)
      return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height]
    },
  })
/** the point of the board (at height `y`) under the finger, in world units */
export function pickBoard(clientX: number, clientY: number, y = 0.8): [number, number] | null {
  if (!cam.camera || !cam.el) return null
  const r = cam.el.getBoundingClientRect()
  ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), cam.camera)
  const p = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), new THREE.Vector3())
  return p ? [p.x, p.z] : null
}

// ---------------------------------------------------------------- textures
let tilesTex: THREE.CanvasTexture | null = null
function tiles() {
  if (tilesTex) return tilesTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#eef4f6'
  g.fillRect(0, 0, 128, 128)
  g.strokeStyle = '#c9d6dc'
  g.lineWidth = 4
  g.strokeRect(0, 0, 128, 128)
  g.fillStyle = 'rgba(255,255,255,.6)'
  g.fillRect(10, 10, 40, 8)
  tilesTex = new THREE.CanvasTexture(c)
  tilesTex.wrapS = tilesTex.wrapT = THREE.RepeatWrapping
  tilesTex.repeat.set(14, 6)
  tilesTex.colorSpace = THREE.SRGBColorSpace
  return tilesTex
}
let waxTex: THREE.CanvasTexture | null = null
function wax() {
  if (waxTex) return waxTex
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 32
  const g = c.getContext('2d')!
  const cols = ['#f08c00', '#2f9e44', '#e8432e', '#ffd43b']
  for (let i = -2; i < 20; i++) {
    g.fillStyle = cols[(i + 8) % 4]
    g.beginPath()
    g.moveTo(i * 16, 32)
    g.lineTo(i * 16 + 16, 32)
    g.lineTo(i * 16 + 32, 0)
    g.lineTo(i * 16 + 16, 0)
    g.fill()
  }
  waxTex = new THREE.CanvasTexture(c)
  waxTex.wrapS = THREE.RepeatWrapping
  waxTex.repeat.set(6, 1)
  waxTex.colorSpace = THREE.SRGBColorSpace
  return waxTex
}
let puffTex: THREE.CanvasTexture | null = null
function puff() {
  if (puffTex) return puffTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  puffTex = new THREE.CanvasTexture(c)
  return puffTex
}

// ---------------------------------------------------------------- the room
function Room() {
  const wood = useMemo(() => {
    const t = woodTexture().clone()
    t.repeat.set(3, 2)
    t.needsUpdate = true
    return t
  }, [])
  return (
    <group>
      {/* the worktop */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <boxGeometry args={[16, 0.4, 10]} />
        <meshStandardMaterial map={wood} color="#c98a4b" roughness={0.6} />
      </mesh>
      {/* the wall, its strip of wax just above the worktop */}
      <mesh position={[0, 4, -3.6]} receiveShadow>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial map={tiles()} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.25, -3.55]}>
        <boxGeometry args={[16, 0.5, 0.06]} />
        <meshStandardMaterial map={wax()} roughness={0.5} />
      </mesh>
      {/* a shelf with jars, a bottle of oil: life in the back */}
      <mesh position={[-3.2, 2.2, -3.35]} castShadow>
        <boxGeometry args={[3, 0.1, 0.5]} />
        <meshStandardMaterial color="#8d5a2b" />
      </mesh>
      {[
        ['#f59f00', -4.2],
        ['#e8432e', -3.5],
        ['#2f9e44', -2.8],
      ].map(([c, x]) => (
        <mesh key={x} position={[x as number, 2.55, -3.35]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.6, 16]} />
          <meshStandardMaterial color={c as string} roughness={0.2} transparent opacity={0.85} />
        </mesh>
      ))}
      <mesh position={[3.6, 0.7, -2.8]} castShadow>
        <cylinderGeometry args={[0.22, 0.25, 1.4, 16]} />
        <meshStandardMaterial color="#ffd43b" roughness={0.1} transparent opacity={0.75} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------- 1. cut
function Slice({ icon, l, r, spread }: { icon: IconName; l: number; r: number; spread: number }) {
  const g = useRef<THREE.Group>(null)
  const planes = useMemo(() => [new THREE.Plane(new THREE.Vector3(1, 0, 0), -l), new THREE.Plane(new THREE.Vector3(-1, 0, 0), r)], [l, r])
  const off = useRef(0)
  const ins = INSIDE[icon]
  useFrame((_, dt) => {
    off.current += (spread - off.current) * Math.min(1, dt * 10)
    planes[0].constant = -(l + off.current)
    planes[1].constant = r + off.current
    if (g.current) g.current.position.x = off.current
  })
  return (
    <group>
      <group ref={g}>
        <group scale={ITEM_SCALE}>
          <Ingredient icon={icon} clip={planes} />
        </group>
        {/* the inside, on the cut faces */}
        {ins &&
          [l, r].map((x, k) =>
            Math.abs(x) < HALF - 0.01 ? (
              <group key={k} position={[x, ins.y * ITEM_SCALE, 0]} rotation={[0, (k ? 1 : -1) * (Math.PI / 2), 0]}>
                <mesh position={[0, 0, 0.002]}>
                  <circleGeometry args={[Math.max(0.02, ins.r(x / ITEM_SCALE) * ITEM_SCALE), 28]} />
                  <meshStandardMaterial color={ins.flesh} roughness={0.5} />
                </mesh>
                {ins.seeds &&
                  [0, 1, 2, 3, 4].map((s) => (
                    <mesh key={s} position={[Math.cos(s * 1.26) * ins.r(x / ITEM_SCALE) * 0.9, Math.sin(s * 1.26) * ins.r(x / ITEM_SCALE) * 0.9, 0.01]}>
                      <sphereGeometry args={[0.035, 6, 5]} />
                      <meshStandardMaterial color={ins.seeds} />
                    </mesh>
                  ))}
              </group>
            ) : null,
          )}
      </group>
    </group>
  )
}

/** once all cut: the rounds tumble out in a row */
function Rounds({ icon }: { icon: IconName }) {
  const ins = INSIDE[icon] ?? { flesh: '#eee', skin: '#999', r: () => 0.2, y: 0.2 }
  const r = Math.max(0.18, ins.r(0) * ITEM_SCALE * 0.85)
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const t = useRef(0)
  const mats = useMemo(() => [new THREE.MeshStandardMaterial({ color: ins.skin }), new THREE.MeshStandardMaterial({ color: ins.flesh }), new THREE.MeshStandardMaterial({ color: ins.flesh })], [ins])
  useFrame((_, dt) => {
    t.current += dt
    refs.current.forEach((m, k) => {
      if (!m) return
      const s = Math.min(1, Math.max(0, (t.current - k * 0.07) / 0.45))
      const e = 1 - (1 - s) ** 3
      m.position.set((k - 1.5) * r * 2.3, 1.6 * (1 - e) + 0.06 + Math.sin(s * Math.PI) * 0.4, 0)
      m.rotation.set((1 - e) * 4 + 0.12, 0, (k - 1.5) * 0.15)
    })
  })
  return (
    <group>
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} ref={(m) => void (refs.current[k] = m)} material={mats} castShadow>
          <cylinderGeometry args={[r, r, 0.12, 28]} />
        </mesh>
      ))}
    </group>
  )
}

/** a white flash and drops of juice where the knife went */
function Cut({ x, color }: { x: number; color: string }) {
  const t = useRef(0)
  const flash = useRef<THREE.Mesh>(null)
  const drops = useRef<(THREE.Mesh | null)[]>([])
  const v = useMemo(() => Array.from({ length: 10 }, (_, k) => new THREE.Vector3(Math.cos(k * 2.1) * 1.4, 2 + (k % 4) * 0.6, Math.sin(k * 2.1) * 1.4)), [])
  useFrame((_, dt) => {
    t.current += dt
    const k = t.current
    if (flash.current) {
      ;(flash.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - k * 2.5)
      flash.current.scale.y = Math.min(1, k * 8)
    }
    drops.current.forEach((d, i) => {
      if (!d) return
      d.visible = k < 0.8
      d.position.set(x + v[i].x * k, 1 + v[i].y * k - 6 * k * k, v[i].z * k)
    })
  })
  return (
    <group>
      <mesh ref={flash} position={[x, 1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.6, 2.2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {v.map((_, i) => (
        <mesh key={i} ref={(m) => void (drops.current[i] = m)}>
          <sphereGeometry args={[0.05, 6, 5]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  )
}

function Knife() {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    const k = useKitchen.getState().knife
    if (!g.current) return
    g.current.visible = !!k
    if (k) g.current.position.lerp(new THREE.Vector3(k[0], 1.3, k[1]), 0.6)
  })
  return (
    <group ref={g} visible={false} rotation={[0.2, 0.25, -0.15]}>
      {/* the blade, edge down, along z */}
      <mesh position={[0, 0, 0.9]} castShadow>
        <boxGeometry args={[0.04, 0.45, 1.6]} />
        <meshStandardMaterial color="#dfe6e9" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, -0.18, 0.9]}>
        <boxGeometry args={[0.045, 0.08, 1.6]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.05} />
      </mesh>
      <RoundedBox args={[0.14, 0.24, 0.9]} radius={0.05} position={[0, 0.05, -0.3]} castShadow>
        <meshStandardMaterial color="#5d3a22" roughness={0.6} />
      </RoundedBox>
      {[-0.55, -0.1].map((z) => (
        <mesh key={z} position={[0.075, 0.05, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 8]} />
          <meshStandardMaterial color="#ffe082" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

function CutScene() {
  const item = useKitchen((s) => s.item)
  const cuts = useKitchen((s) => s.cuts)
  const used = useKitchen((s) => s.used)
  const flashes = useKitchen((s) => s.flashes)
  const finished = useKitchen((s) => s.finished)
  if (!item) return null
  const sorted = [...cuts].sort((a, b) => a - b)
  const edges = [-5, ...sorted, 5]
  return (
    <group>
      {/* the chopping board */}
      <RoundedBox args={[3.6, 0.18, 3.0]} radius={0.12} position={[0, 0.09, 0.1]} castShadow receiveShadow>
        <meshStandardMaterial color="#d9a066" roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, 0.185, -1.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 20]} />
        <meshStandardMaterial color="#7a4f27" />
      </mesh>
      <group position={[0, 0.18, 0]}>
        {/* the guides: dashed white lines on the board */}
        {GUIDE_X.map((x, i) =>
          used[i] ? null : (
            <group key={i}>
              {Array.from({ length: 12 }, (_, k) => (
                <mesh key={k} position={[x, 1.2, -1.25 + k * 0.23]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
                  <planeGeometry args={[0.05, 0.12]} />
                  {/* drawn over the ingredient, so you always see where to cut */}
                  <meshBasicMaterial color="#ffffff" depthTest={false} transparent opacity={0.95} />
                </mesh>
              ))}
            </group>
          ),
        )}
        {!finished && edges.slice(0, -1).map((l, i) => <Slice key={`${item}-${i}-${edges.length}`} icon={item} l={l} r={edges[i + 1]} spread={(i - (edges.length - 2) / 2) * 0.12} />)}
        {finished && <Rounds key={item} icon={item} />}
        {flashes.map((f) => (
          <Cut key={f.id} x={f.x} color={INSIDE[item]?.flesh ?? '#ffe082'} />
        ))}
      </group>
      <Knife />
    </group>
  )
}

// ---------------------------------------------------------------- 2. cook
function Flames() {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((m, k) => {
      if (!m) return
      const s = 0.8 + Math.sin(t * 22 + k * 1.7) * 0.18 + Math.sin(t * 13 + k) * 0.1
      m.scale.set(1, s, 1)
    })
  })
  return (
    <group>
      {Array.from({ length: 22 }, (_, k) => {
        const a = (k / 22) * Math.PI * 2
        return (
          <mesh key={k} ref={(m) => void (refs.current[k] = m)} position={[Math.cos(a) * 1.45, 0.55, Math.sin(a) * 1.45]}>
            <coneGeometry args={[0.13, 0.6, 8]} />
            <meshBasicMaterial color={k % 2 ? '#4dabf7' : '#ff922b'} transparent opacity={0.9} />
          </mesh>
        )
      })}
      <pointLight position={[0, 0.5, 0]} color="#ff9a3c" intensity={4} distance={4} />
    </group>
  )
}

const panProfile = [new THREE.Vector2(0.01, 0), new THREE.Vector2(1.25, 0), new THREE.Vector2(1.4, 0.05), new THREE.Vector2(1.5, 0.32), new THREE.Vector2(1.44, 0.32), new THREE.Vector2(1.34, 0.08), new THREE.Vector2(0.01, 0.06)]
const potProfile = [new THREE.Vector2(0.01, 0), new THREE.Vector2(1.1, 0), new THREE.Vector2(1.25, 0.2), new THREE.Vector2(1.3, 1.1), new THREE.Vector2(1.22, 1.1), new THREE.Vector2(1.17, 0.22), new THREE.Vector2(0.01, 0.08)]

function Steam({ dark = false }: { dark?: boolean }) {
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((s, k) => {
      if (!s) return
      const p = (t * 0.45 + k / 5) % 1
      s.position.set(Math.sin(k * 2 + t) * 0.5, 0.8 + p * 2.6, Math.cos(k * 3) * 0.4)
      s.scale.setScalar(0.6 + p * 1.6)
      ;(s.material as THREE.SpriteMaterial).opacity = (dark ? 0.55 : 0.35) * Math.sin(p * Math.PI)
    })
  })
  return (
    <group>
      {[0, 1, 2, 3, 4].map((k) => (
        <sprite key={k} ref={(s) => void (refs.current[k] = s)}>
          <spriteMaterial map={puff()} color={dark ? '#3b3b3b' : '#ffffff'} transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

function Spatter() {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((m, k) => {
      if (!m) return
      const p = (t * 1.3 + k * 0.37) % 1
      const a = k * 2.3
      m.visible = !cookLive.done && p < 0.5
      m.position.set(Math.cos(a) * (0.3 + p * 1.6), 0.4 + Math.sin(p * Math.PI * 2) * 0.5, Math.sin(a) * (0.3 + p * 1.6))
    })
  })
  return (
    <group>
      {Array.from({ length: 10 }, (_, k) => (
        <mesh key={k} ref={(m) => void (refs.current[k] = m)}>
          <sphereGeometry args={[0.03, 5, 4]} />
          <meshBasicMaterial color="#fff3bf" />
        </mesh>
      ))}
    </group>
  )
}

function CookScene() {
  const on = useKitchen((s) => s.on)
  const food = useKitchen((s) => s.food)
  const f = useRef<THREE.Group>(null)
  const oil = useRef<THREE.MeshStandardMaterial>(null)
  const sauce = useRef<THREE.MeshStandardMaterial>(null)
  const smoke = useRef<THREE.Group>(null)
  // the food's colour follows the cooking: the Ingredient reads `cook` at each render, so re-render it often
  const foodRef = useRef<{ cook: number }>({ cook: 0 })
  const [, setN] = useState(0)
  const force = () => setN((n) => n + 1)
  useFrame(({ clock }, dt) => {
    const L = cookLive
    if (f.current) {
      const lift = Math.sin(L.flip * Math.PI) * 1.4
      f.current.position.y = (on === 'pot' ? 0.55 : on === 'grill' ? 0.75 : 0.12) + lift
      f.current.rotation.x = L.side && on !== 'pot' ? (1 - L.flip) * Math.PI : 0
      if (on === 'pot') f.current.rotation.z = Math.sin(clock.elapsedTime * 3) * 0.1
    }
    if (oil.current) oil.current.emissiveIntensity = 0.25 + Math.sin(clock.elapsedTime * 3) * 0.08
    if (sauce.current) sauce.current.color.set('#d84315').lerp(new THREE.Color('#5d1f0a'), Math.max(0, L.shown - 0.7) * 1.5)
    if (smoke.current) smoke.current.visible = L.shown > 0.9
    if (Math.abs(foodRef.current.cook - L.shown) > 0.02) {
      foodRef.current.cook = L.shown
      force()
    }
    void dt
  })
  return (
    <group>
      {/* the gas ring */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.6, 1.7, 0.24, 32]} />
        <meshStandardMaterial color="#212529" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <torusGeometry args={[0.75, 0.06, 8, 32]} />
        <meshStandardMaterial color="#495057" metalness={0.8} roughness={0.3} />
      </mesh>
      <Flames />
      <group position={[0, 0.6, 0]}>
        {on === 'pan' && (
          <group>
            <mesh castShadow receiveShadow>
              <latheGeometry args={[panProfile, 40]} />
              <meshStandardMaterial color="#2b2f33" metalness={0.7} roughness={0.35} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[2.35, 0.25, 0]} rotation={[0, 0, 0.12]} castShadow>
              <boxGeometry args={[1.8, 0.14, 0.24]} />
              <meshStandardMaterial color="#4a2f1b" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[1.3, 40]} />
              <meshStandardMaterial ref={oil} color="#e3b341" emissive="#b07a10" emissiveIntensity={0.25} roughness={0.05} metalness={0.2} />
            </mesh>
          </group>
        )}
        {on === 'grill' && (
          <group>
            <RoundedBox args={[3.2, 0.5, 2.4]} radius={0.06} position={[0, 0.1, 0]} castShadow>
              <meshStandardMaterial color="#343a40" metalness={0.6} roughness={0.4} />
            </RoundedBox>
            <mesh position={[0, 0.37, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[3, 2.2]} />
              <meshStandardMaterial color="#ff6b00" emissive="#ff3d00" emissiveIntensity={1.2} />
            </mesh>
            {Array.from({ length: 9 }, (_, k) => (
              <mesh key={k} position={[-1.4 + k * 0.35, 0.5, 0]} castShadow>
                <boxGeometry args={[0.05, 0.05, 2.3]} />
                <meshStandardMaterial color="#adb5bd" metalness={0.9} roughness={0.25} />
              </mesh>
            ))}
          </group>
        )}
        {on === 'pot' && (
          <group>
            <mesh castShadow receiveShadow>
              <latheGeometry args={[potProfile, 40]} />
              <meshStandardMaterial color="#3d4247" metalness={0.6} roughness={0.35} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[1.18, 40]} />
              <meshStandardMaterial ref={sauce} color="#d84315" roughness={0.15} />
            </mesh>
            {[-1.45, 1.45].map((x) => (
              <mesh key={x} position={[x, 0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.15, 0.05, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#495057" metalness={0.8} />
              </mesh>
            ))}
          </group>
        )}
        <group ref={f}>
          <group scale={on === 'pot' ? 1.3 : 1.7}>
            <Ingredient icon={food} cook={foodRef.current.cook} />
          </group>
        </group>
        {on !== 'pot' && <Spatter />}
        <Steam />
        <group ref={smoke} visible={false}>
          <Steam dark />
        </group>
      </group>
    </group>
  )
}

// ---------------------------------------------------------------- 3. plate up
const wrapProfile = [new THREE.Vector2(0.01, 0), new THREE.Vector2(1.2, 0), new THREE.Vector2(1.7, 0.12), new THREE.Vector2(1.9, 0.2), new THREE.Vector2(1.86, 0.24), new THREE.Vector2(1.65, 0.16), new THREE.Vector2(1.1, 0.06), new THREE.Vector2(0.01, 0.06)]
function Dropped({ icon, at, big }: { icon: IconName; at: [number, number]; big: boolean }) {
  const g = useRef<THREE.Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    t.current += dt
    const k = Math.min(1, t.current / 0.55)
    // falls, then a little bounce
    const y = k < 1 ? 3 * (1 - k * k) : 0
    const b = t.current > 0.55 ? Math.max(0, Math.sin((t.current - 0.55) * 14) * 0.18 * Math.exp(-(t.current - 0.55) * 6)) : 0
    if (g.current) {
      g.current.position.set(at[0], 0.08 + y + b, at[1])
      g.current.rotation.y = (1 - k) * 2
    }
  })
  return (
    <group ref={g}>
      <group scale={big ? 1.5 : 0.95}>
        <Ingredient icon={icon} />
      </group>
    </group>
  )
}
function PlateScene({ spin = false }: { spin?: boolean }) {
  const plate = useKitchen((s) => s.plate)
  const placed = useKitchen((s) => s.placed)
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (spin && g.current) g.current.rotation.y += dt * 0.5
  })
  return (
    <group ref={g} position={[0, 0.02, 0.2]}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[wrapProfile, 48]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
      {/* the wax-print rim */}
      {Array.from({ length: 24 }, (_, k) => {
        const a = (k / 24) * Math.PI * 2
        return (
          <mesh key={k} position={[Math.cos(a) * 1.78, 0.19, Math.sin(a) * 1.78]} rotation={[-Math.PI / 2 + 0.25, 0, 0]}>
            <circleGeometry args={[0.12, 12]} />
            <meshStandardMaterial color={['#f08c00', '#2f9e44', '#ffd43b'][k % 3]} />
          </mesh>
        )
      })}
      {plate.slice(0, placed).map((icon, i) => {
        const a = (i / Math.max(1, plate.length - 1)) * Math.PI * 2 - Math.PI / 2
        const r = i === 0 ? 0 : 1.05
        return <Dropped key={i} icon={icon} at={[Math.cos(a) * r, Math.sin(a) * r]} big={i === 0} />
      })}
    </group>
  )
}

// ---------------------------------------------------------------- the camera and the canvas
const VIEWS: [number, number, number, number, number, number][] = [
  [0, 6.4, 4.4, 0, 0.3, 0.3],
  [0, 6.0, 5.2, 0, 0.6, 0],
  [0, 6.8, 4.6, 0, 0, 0.4],
  [0, 5.6, 5.0, 0, 0.4, 0.2],
]
function Rig({ step }: { step: number }) {
  const { camera, gl, size } = useThree()
  const look = useRef(new THREE.Vector3(0, 0, 0))
  useEffect(() => {
    cam.camera = camera
    cam.el = gl.domElement
    gl.localClippingEnabled = true
    return () => {
      cam.camera = null
      cam.el = null
    }
  }, [camera, gl])
  useFrame((_, dt) => {
    const v = VIEWS[Math.min(step, VIEWS.length - 1)]
    const k = 1 - Math.exp(-dt * 5)
    // a narrow phone screen sees less from side to side: step back so the board / the pan fits across
    const far = THREE.MathUtils.clamp(0.95 / (size.width / size.height), 1, 2.4)
    const at = new THREE.Vector3(v[3], v[4], v[5])
    const to = new THREE.Vector3(v[0], v[1], v[2]).sub(at).multiplyScalar(far).add(at)
    camera.position.lerp(to, k)
    look.current.lerp(at, k)
    camera.lookAt(look.current)
  })
  return null
}

export function KitchenCanvas() {
  const step = useKitchen((s) => s.step)
  return (
    <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 38, position: [0, 6.4, 4.4] }} style={{ position: 'absolute', inset: 0 }}>
      <color attach="background" args={['#eef4f6']} />
      <hemisphereLight args={['#fff6e6', '#8a5a2e', 1.4]} />
      <directionalLight position={[3, 8, 4]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} />
      <Rig step={step} />
      <Room />
      {step === 0 && <CutScene />}
      {step === 1 && <CookScene />}
      {step === 2 && <PlateScene />}
      {step >= 3 && <PlateScene spin />}
    </Canvas>
  )
}
