import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MapControls, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { signTexture } from '../three/textures'
import type { PlaceId } from './places'
import { canAttack, DISTRICTS } from './turf'

// A little 3D model of the commune, in the game's style: the real outline of each district (from OpenStreetMap,
// public/assets/maps/<place>.json) as a raised block coloured by its owner, small houses, the maquis of each
// boss with its sign and flag, the key zones as landmarks, the lagoon and the forest. Tap a district to pick it.

const base = import.meta.env.BASE_URL + 'assets/maps/'
const S = 45 // metres per unit
type Geo = { bounds: [number, number, number, number]; features: { properties: { i: number; label: [number, number] }; geometry: { coordinates: number[][][] } }[] }

function useGeo(place: PlaceId) {
  const [geo, setGeo] = useState<Geo | null>(null)
  useEffect(() => {
    fetch(`${base}${place}.json`).then((r) => r.json()).then(setGeo).catch(() => setGeo(null))
  }, [place])
  return geo
}

/** lng/lat → local x/z in units (north = -z). */
function projector(geo: Geo) {
  const [x0, y0, x1, y1] = geo.bounds
  const lng0 = (x0 + x1) / 2
  const lat0 = (y0 + y1) / 2
  const kx = (111320 * Math.cos((lat0 * Math.PI) / 180)) / S
  const kz = 110540 / S
  return (lng: number, lat: number) => new THREE.Vector2((lng - lng0) * kx, -(lat - lat0) * kz)
}

/** deterministic random, so the houses stay in the same place */
function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

/** A name label drawn on a canvas, shown as a sprite that always faces the camera. */
const labels = new Map<string, THREE.CanvasTexture>()
function labelTexture(text: string) {
  if (labels.has(text)) return labels.get(text)!
  const c = document.createElement('canvas')
  c.width = 640
  c.height = 128
  const g = c.getContext('2d')!
  g.font = '800 56px "Baloo 2", sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  g.lineWidth = 14
  g.strokeStyle = '#ffffff'
  g.strokeText(text, 320, 68)
  g.fillStyle = '#2b1a12'
  g.fillText(text, 320, 68)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  labels.set(text, t)
  return t
}

const WALLS = ['#ffd8a8', '#a5d8ff', '#ffc9c9', '#d3f9d8', '#fff3bf', '#e5dbff', '#ffe8cc', '#c5f6fa']
const ROOF = '#c3c9cf' // tin roofs

function inside(p: THREE.Vector2, poly: THREE.Vector2[]) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c
  }
  return c
}

type DistrictGeo = { i: number; poly: THREE.Vector2[]; label: THREE.Vector2; shape: THREE.Shape; houses: { x: number; z: number; w: number; d: number; h: number; c: string; r: number }[] }

function buildDistricts(geo: Geo): DistrictGeo[] {
  const P = projector(geo)
  return geo.features.map((f) => {
    const ring = f.geometry.coordinates[0].map(([lng, lat]) => P(lng, lat))
    // shrink a little towards the centre so the streets between districts show
    const c = ring.reduce((a, p) => a.add(p), new THREE.Vector2()).divideScalar(ring.length)
    const poly = ring.map((p) => p.clone().sub(c).multiplyScalar(0.97).add(c))
    const shape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.y)))
    const label = P(f.properties.label[0], f.properties.label[1])
    // houses scattered inside the district
    const r = rng(1000 + f.properties.i * 77)
    const min = poly.reduce((a, p) => a.min(p), poly[0].clone())
    const max = poly.reduce((a, p) => a.max(p), poly[0].clone())
    const houses: DistrictGeo['houses'] = []
    for (let k = 0; k < 900 && houses.length < 22; k++) {
      const p = new THREE.Vector2(min.x + r() * (max.x - min.x), min.y + r() * (max.y - min.y))
      if (!inside(p, poly) || p.distanceTo(label) < 12 || houses.some((o) => Math.hypot(o.x - p.x, o.z - p.y) < 5)) continue
      houses.push({ x: p.x, z: p.y, w: 1.6 + r() * 1.4, d: 1.6 + r() * 1.2, h: 0.9 + r() * (r() < 0.15 ? 3 : 1.2), c: WALLS[Math.floor(r() * WALLS.length)], r: r() * Math.PI })
    }
    return { i: f.properties.i, poly, label, shape, houses }
  })
}

function Houses({ list }: { list: DistrictGeo['houses'] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const roofs = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const m = new THREE.Object3D()
    const col = new THREE.Color()
    list.forEach((h, k) => {
      m.position.set(h.x, 1.2 + h.h / 2, h.z)
      m.rotation.set(0, h.r, 0)
      m.scale.set(h.w, h.h, h.d)
      m.updateMatrix()
      ref.current!.setMatrixAt(k, m.matrix)
      ref.current!.setColorAt(k, col.set(h.c))
      m.position.y = 1.2 + h.h + 0.08
      m.scale.set(h.w + 0.3, 0.16, h.d + 0.3)
      m.updateMatrix()
      roofs.current!.setMatrixAt(k, m.matrix)
    })
    ref.current!.instanceMatrix.needsUpdate = true
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true
    roofs.current!.instanceMatrix.needsUpdate = true
  }, [list])
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, list.length]} castShadow>
        <boxGeometry />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[undefined, undefined, list.length]} castShadow>
        <boxGeometry />
        <meshStandardMaterial color={ROOF} roughness={0.6} metalness={0.2} />
      </instancedMesh>
    </>
  )
}

/** The boss's maquis (or yours) with its sign and flag. */
function Maquis({ name, mine, home }: { name: string; mine: boolean; home: boolean }) {
  const flag = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (flag.current) flag.current.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.25
  })
  const color = mine ? '#2f9e44' : '#c92a2a'
  return (
    <group>
      <RoundedBox args={[6, 3.4, 4.5]} radius={0.3} position={[0, 1.2 + 1.7, 0]} castShadow>
        <meshStandardMaterial color={home ? '#ff922b' : '#ffe066'} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 1.2 + 3.6, 0]} castShadow>
        <boxGeometry args={[6.6, 0.4, 5.1]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* striped awning */}
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <mesh key={k} position={[-2.5 + k, 1.2 + 2.5, 2.6]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[1, 0.08, 1.2]} />
          <meshStandardMaterial color={k % 2 ? '#ffffff' : color} />
        </mesh>
      ))}
      <mesh position={[0, 1.2 + 4.6, 2.2]}>
        <planeGeometry args={[6, 1.4]} />
        <meshBasicMaterial map={signTexture(name.toUpperCase(), color, '#fff', 512, 120)} toneMapped={false} side={2} />
      </mesh>
      {/* flag of the owner */}
      <mesh position={[3.6, 1.2 + 4.5, -1.5]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 9, 8]} />
        <meshStandardMaterial color="#868e96" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={flag} position={[3.6, 1.2 + 8.2, -1.5]}>
        <boxGeometry args={[3, 1.8, 0.08]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

/** The landmark of a key zone. */
function Landmark({ kind }: { kind: string }) {
  if (kind === '🏭')
    return (
      <group position={[-9, 1.2, -4]}>
        <RoundedBox args={[10, 4, 6]} radius={0.2} position={[0, 2, 0]} castShadow>
          <meshStandardMaterial color="#ced4da" />
        </RoundedBox>
        {[-3, 0, 3].map((x) => (
          <mesh key={x} position={[x, 6, -1]} castShadow>
            <cylinderGeometry args={[0.6, 0.8, 5, 12]} />
            <meshStandardMaterial color="#868e96" />
          </mesh>
        ))}
        {[-3, 0, 3].map((x) => (
          <mesh key={`s${x}`} position={[x, 9.5, -1]}>
            <sphereGeometry args={[1.1, 10, 8]} />
            <meshStandardMaterial color="#e9ecef" transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
    )
  if (kind === '🚌')
    return (
      <group position={[-9, 1.2, 3]}>
        {[0, 1, 2].map((k) => (
          <RoundedBox key={k} args={[2.2, 2.2, 5.5]} radius={0.4} position={[k * 3, 1.1, 0]} castShadow>
            <meshStandardMaterial color={['#fcc419', '#40c057', '#4dabf7'][k]} />
          </RoundedBox>
        ))}
      </group>
    )
  if (kind === '🧺')
    return (
      <group position={[-9, 1.2, 3]}>
        {[0, 1, 2, 3].map((k) => (
          <group key={k} position={[(k % 2) * 4, 0, Math.floor(k / 2) * 4]}>
            <mesh position={[0, 0.6, 0]}>
              <boxGeometry args={[2.4, 1.2, 1.6]} />
              <meshStandardMaterial color="#a0522d" />
            </mesh>
            <mesh position={[0, 3, 0]} castShadow>
              <coneGeometry args={[2, 1, 8]} />
              <meshStandardMaterial color={k % 2 ? '#ff6b6b' : '#ffd43b'} />
            </mesh>
            <mesh position={[0, 1.8, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 2.4, 6]} />
              <meshStandardMaterial color="#868e96" />
            </mesh>
          </group>
        ))}
      </group>
    )
  if (kind === '🌙')
    return (
      <group position={[-8, 1.2, 3]}>
        {Array.from({ length: 14 }, (_, k) => (
          <mesh key={k} position={[(k % 7) * 1.6 - 5, 3.5 + Math.sin(k) * 0.3, Math.floor(k / 7) * 4]}>
            <sphereGeometry args={[0.3, 8, 6]} />
            <meshStandardMaterial color="#fff3bf" emissive="#ffd43b" emissiveIntensity={1.4} />
          </mesh>
        ))}
        {[0, 1, 2].map((k) => (
          <mesh key={`t${k}`} position={[k * 3 - 3, 0.8, 2]} castShadow>
            <boxGeometry args={[2.2, 1.6, 1.4]} />
            <meshStandardMaterial color="#5f3dc4" />
          </mesh>
        ))}
      </group>
    )
  return null
}

function DistrictBlock({ d, place, owner, owners, selected, onPick }: { d: DistrictGeo; place: PlaceId; owner: 'me' | 'boss'; owners: ('me' | 'boss')[]; selected: boolean; onPick: () => void }) {
  const info = DISTRICTS[place][d.i]
  const mine = owner === 'me'
  const g = useRef<THREE.Group>(null)
  const geom = useMemo(() => new THREE.ExtrudeGeometry(d.shape, { depth: 1.2, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.3, bevelSegments: 2 }), [d.shape])
  useFrame((_, dt) => {
    if (!g.current) return
    // the district you tapped rises
    g.current.position.y += ((selected ? 3 : 0) - g.current.position.y) * Math.min(1, dt * 6)
  })
  const open = d.i === 0 ? !mine : canAttack(place, d.i, owners)
  return (
    <group ref={g}>
      <mesh
        geometry={geom}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          onPick()
        }}
      >
        <meshStandardMaterial color={mine ? '#8ce99a' : '#ffa8a8'} roughness={0.85} />
      </mesh>
      <Houses list={d.houses} />
      <group position={[d.label.x, 0, d.label.y]}>
        <group scale={1.7}>
        <Maquis name={info.name} mine={mine} home={d.i === 0} />
        {info.bonus && <Landmark kind={info.bonus.icon} />}
        </group>
        <sprite position={[0, 24, 0]} scale={[46, 9.2, 1]}>
          <spriteMaterial map={labelTexture(`${d.i === 0 ? '📍 ' : ''}${info.bonus ? `${info.bonus.icon} ` : ''}${mine ? '👑 ' : open ? (d.i === 0 ? '🗡️ ' : '⚔️ ') : ''}${info.name}`)} depthTest={false} transparent />
        </sprite>
      </group>
    </group>
  )
}

function Forest({ center }: { center: THREE.Vector2 }) {
  const trees = useMemo(() => {
    const r = rng(42)
    return Array.from({ length: 70 }, () => ({ x: center.x + (r() - 0.5) * 50, z: center.y + (r() - 0.5) * 60, s: 1.5 + r() * 2 }))
  }, [center])
  return (
    <group>
      {trees.map((t, k) => (
        <group key={k} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.s * 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.4, t.s * 1.2, 6]} />
            <meshStandardMaterial color="#8d6e4f" />
          </mesh>
          <mesh position={[0, t.s * 1.6, 0]} castShadow>
            <icosahedronGeometry args={[t.s, 0]} />
            <meshStandardMaterial color={k % 3 ? '#2f9e44' : '#37b24d'} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Commune3D({ place, owners, selected, onPick }: { place: PlaceId; owners: ('me' | 'boss')[]; selected: number; onPick: (i: number) => void }) {
  const geo = useGeo(place)
  const ds = useMemo(() => (geo ? buildDistricts(geo) : []), [geo])
  const box = useMemo(() => {
    const b = new THREE.Box2()
    ds.forEach((d) => d.poly.forEach((p) => b.expandByPoint(p)))
    return b
  }, [ds])
  if (!geo) return <div className="grid h-full w-full place-items-center text-sm font-bold">Chargement de la commune…</div>
  const c = box.getCenter(new THREE.Vector2())
  const size = box.getSize(new THREE.Vector2())
  const home = ds[0]?.label ?? c
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 40, position: [home.x + 70, 175, home.y + 150], near: 1, far: 2000 }}>
      <color attach="background" args={['#bfe6ff']} />
      <fog attach="fog" args={['#bfe6ff', 250, 600]} />
      <hemisphereLight args={['#e3f4ff', '#d9b38c', 1.4]} />
      <directionalLight castShadow position={[c.x + 80, 160, c.y + 60]} intensity={2} shadow-mapSize={[2048, 2048]} shadow-camera-left={-150} shadow-camera-right={150} shadow-camera-top={150} shadow-camera-bottom={-150} shadow-camera-far={500} />
      {/* ground, lagoon to the south, forest to the east */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, -0.05, c.y]} receiveShadow>
        <planeGeometry args={[size.x * 3, size.y * 3]} />
        <meshStandardMaterial color="#e9d8a6" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 0.02, box.max.y + 40]}>
        <planeGeometry args={[size.x * 3, 80]} />
        <meshStandardMaterial color="#4dabf7" roughness={0.15} metalness={0.2} />
      </mesh>
      <Forest center={new THREE.Vector2(box.max.x + 28, c.y - size.y * 0.15)} />
      {ds.map((d) => (
        <DistrictBlock key={d.i} d={d} place={place} owner={owners[d.i]} owners={owners} selected={selected === d.i} onPick={() => onPick(d.i)} />
      ))}
      <MapControls target={[home.x, 0, home.y]} maxPolarAngle={1.2} minDistance={40} maxDistance={420} enableDamping />
    </Canvas>
  )
}
