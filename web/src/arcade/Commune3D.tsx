import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MapControls, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { signTexture } from '../three/textures'
import type { PlaceId } from './places'
import { canAttack, DISTRICTS, keyOf, useTurf } from './turf'
import { sfx } from './sfx'

// A little 3D model of the commune, in the game's style: the real outline of each district (from OpenStreetMap,
// public/assets/maps/<place>.json) as a raised block coloured by its owner, small houses, the maquis of each
// boss with its sign and flag, the key zones as landmarks, the lagoon and the forest. Tap a district to pick it.

const base = import.meta.env.BASE_URL + 'assets/maps/'
/** metres per unit: every place fills about the same space on screen (Yopougon, 9 km across: 45 m) */
const scaleOf = (geo: Geo) => {
  const [x0, y0, x1, y1] = geo.bounds
  const w = (x1 - x0) * 111320 * Math.cos((((y0 + y1) / 2) * Math.PI) / 180)
  return Math.max(14, Math.max(w, (y1 - y0) * 110540) / 200)
}
/** What is around each place: the lagoon (Abidjan), forest, mountains (Man), savanna (the north). */
const SCENERY: Record<PlaceId, { water?: boolean; forest?: 'east' | 'west'; mountains?: boolean; ground: string }> = {
  yopougon: { water: true, forest: 'east', ground: '#e9d8a6' },
  cocody: { water: true, forest: 'east', ground: '#e9d8a6' },
  abobo: { forest: 'west', ground: '#e9d8a6' },
  treichville: { water: true, ground: '#e9d8a6' },
  bouake: { ground: '#e6cf98' },
  korhogo: { ground: '#ecc98f' },
  gagnoa: { forest: 'west', ground: '#d8d9a0' },
  man: { forest: 'east', mountains: true, ground: '#d3d9a0' },
}
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
  const S = scaleOf(geo)
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
function labelTexture(text: string, w = 640) {
  if (labels.has(text)) return labels.get(text)!
  const c = document.createElement('canvas')
  c.width = w
  c.height = 128
  const g = c.getContext('2d')!
  g.font = '800 56px "Baloo 2", sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  g.lineWidth = 14
  g.strokeStyle = '#ffffff'
  g.strokeText(text, w / 2, 68)
  g.fillStyle = '#2b1a12'
  g.fillText(text, w / 2, 68)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  labels.set(text, t)
  return t
}

// each boss has a colour (like territories on a strategy map); yours is always green
const BOSS = ['#ff8787', '#ffa94d', '#fcc2d7', '#d0bfff', '#ffd43b', '#91a7ff', '#e599f7', '#99c1f2', '#ffc078', '#a5d8ff', '#f783ac', '#eebefa'] // no green: green means « yours »
const MINE = '#69db7c'
const flagOf = (i: number, mine: boolean) => (mine ? '#2f9e44' : new THREE.Color(BOSS[i % BOSS.length]).multiplyScalar(0.7).getStyle())

/** Timeline of a conquest (seconds since it started): camera flies in, the boss flag comes down,
 *  your green spreads from the maquis, your flag goes up with confetti, then the result card. */
export type ConquestClock = { t: number; idx: number }
const CQ = { flagDown: [1.0, 1.8], spread: [1.8, 3.4], flagUp: [1.9, 2.9], confetti: 1.9, done: 4.0 }
const ramp = (t: number, [a, b]: number[]) => THREE.MathUtils.clamp((t - a) / (b - a), 0, 1)
const ease = (k: number) => 1 - Math.pow(1 - k, 3)

/** A material whose colour turns from `from` to `to` inside a circle of radius uR around uC (the paint wave). */
function spreadMaterial() {
  const u = { uR: { value: 1e4 }, uC: { value: new THREE.Vector2() }, uFrom: { value: new THREE.Color() }, uTo: { value: new THREE.Color() } }
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85 })
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <project_vertex>', '#include <project_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vW; uniform float uR; uniform vec2 uC; uniform vec3 uFrom; uniform vec3 uTo;')
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'float dd = distance(vW.xz, uC); float k = smoothstep(uR - 2.5, uR, dd); vec3 col = mix(uTo, uFrom, k); col += (1.0 - smoothstep(0.0, 3.0, abs(dd - uR))) * 0.45 * step(uR, 9000.0); vec4 diffuseColor = vec4(col, opacity);',
      )
  }
  m.customProgramCacheKey = () => 'spread'
  return { m, u }
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

type DistrictGeo = { i: number; ring: THREE.Vector2[]; poly: THREE.Vector2[]; label: THREE.Vector2; shape: THREE.Shape; road: THREE.Shape; houses: { x: number; z: number; w: number; d: number; h: number; c: string; r: number }[]; trees: { x: number; z: number; s: number; palm: boolean }[] }

function buildDistricts(geo: Geo): DistrictGeo[] {
  const P = projector(geo)
  return geo.features.map((f) => {
    const ring = f.geometry.coordinates[0].map(([lng, lat]) => P(lng, lat))
    // shrink a little towards the centre so the streets between districts show
    const c = ring.reduce((a, p) => a.add(p), new THREE.Vector2()).divideScalar(ring.length)
    const poly = ring.map((p) => p.clone().sub(c).multiplyScalar(0.95).add(c))
    const shape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.y)))
    // the full outline, flat and grey: what shows between two districts is the street
    const road = new THREE.Shape(ring.map((p) => new THREE.Vector2(p.x, -p.y)))
    const label = P(f.properties.label[0], f.properties.label[1])
    // houses scattered inside the district
    const r = rng(1000 + f.properties.i * 77)
    const min = poly.reduce((a, p) => a.min(p), poly[0].clone())
    const max = poly.reduce((a, p) => a.max(p), poly[0].clone())
    // a few taller buildings in the busy central districts
    const houses: DistrictGeo['houses'] = []
    for (let k = 0; k < 900 && houses.length < 22; k++) {
      const p = new THREE.Vector2(min.x + r() * (max.x - min.x), min.y + r() * (max.y - min.y))
      if (!inside(p, poly) || p.distanceTo(label) < 12 || houses.some((o) => Math.hypot(o.x - p.x, o.z - p.y) < 5)) continue
      houses.push({ x: p.x, z: p.y, w: 1.6 + r() * 1.4, d: 1.6 + r() * 1.2, h: 0.9 + r() * (r() < (f.properties.i < 6 ? 0.3 : 0.1) ? 4 : 1.2), c: WALLS[Math.floor(r() * WALLS.length)], r: r() * Math.PI })
    }
    const trees: DistrictGeo['trees'] = []
    for (let k = 0; k < 600 && trees.length < 9; k++) {
      const p = new THREE.Vector2(min.x + r() * (max.x - min.x), min.y + r() * (max.y - min.y))
      if (!inside(p, poly) || p.distanceTo(label) < 10 || houses.some((o) => Math.hypot(o.x - p.x, o.z - p.y) < 3.5)) continue
      trees.push({ x: p.x, z: p.y, s: 0.9 + r() * 0.8, palm: r() < 0.6 })
    }
    return { i: f.properties.i, ring, poly, label, shape, road, houses, trees }
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
function Maquis({ name, mine, home, color, oldColor, cq }: { name: string; mine: boolean; home: boolean; color: string; oldColor?: string; cq?: ConquestClock }) {
  const flag = useRef<THREE.Mesh>(null)
  const fm = useRef<THREE.MeshStandardMaterial>(null)
  // during a conquest the maquis keeps the boss's colours until your flag starts going up
  const [swapped, setSwapped] = useState(!cq || !oldColor)
  const look = swapped ? color : oldColor!
  useFrame(({ clock }) => {
    if (!swapped && cq && cq.t >= CQ.flagUp[0]) setSwapped(true)
    const f = flag.current
    if (!f) return
    f.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.25
    if (!cq || !oldColor) return
    // the boss's flag comes down, then yours goes up
    const down = ease(ramp(cq.t, CQ.flagDown))
    const upk = ease(ramp(cq.t, CQ.flagUp))
    const raised = cq.t < CQ.flagUp[0]
    f.position.y = 1.2 + 2 + 6.2 * (raised ? 1 - down : upk)
    fm.current?.color.set(raised ? oldColor : color)
  })
  return (
    <group>
      <RoundedBox args={[6, 3.4, 4.5]} radius={0.3} position={[0, 1.2 + 1.7, 0]} castShadow>
        <meshStandardMaterial color={home ? '#ff922b' : '#ffe066'} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 1.2 + 3.6, 0]} castShadow>
        <boxGeometry args={[6.6, 0.4, 5.1]} />
        <meshStandardMaterial color={look} roughness={0.6} />
      </mesh>
      {/* striped awning */}
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <mesh key={k} position={[-2.5 + k, 1.2 + 2.5, 2.6]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[1, 0.08, 1.2]} />
          <meshStandardMaterial color={k % 2 ? '#ffffff' : look} />
        </mesh>
      ))}
      <mesh position={[0, 1.2 + 4.6, 2.2]}>
        <planeGeometry args={[6, 1.4]} />
        <meshBasicMaterial map={signTexture(name.toUpperCase(), look, '#fff', 512, 120)} toneMapped={false} side={2} />
      </mesh>
      {/* flag of the owner */}
      <mesh position={[3.6, 1.2 + 4.5, -1.5]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 9, 8]} />
        <meshStandardMaterial color="#868e96" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={flag} position={[3.6, 1.2 + 8.2, -1.5]}>
        <boxGeometry args={[3, 1.8, 0.08]} />
        <meshStandardMaterial ref={fm} color={cq && oldColor ? oldColor : color} />
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

function DistrictBlock({ d, place, owner, owners, selected, onPick, cq }: { d: DistrictGeo; place: PlaceId; owner: 'me' | 'boss'; owners: ('me' | 'boss')[]; selected: boolean; onPick: () => void; cq?: ConquestClock }) {
  const shielded = useTurf((s) => (s.shields[keyOf(place, d.i)] ?? 0) > 0)
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
  // the ground colour, with the paint wave of a conquest
  const paint = useMemo(() => spreadMaterial(), [])
  const reach = useMemo(() => d.poly.reduce((r, p) => Math.max(r, p.distanceTo(d.label)), 0) + 4, [d])
  useEffect(() => {
    paint.u.uTo.value.set(mine ? MINE : BOSS[d.i % BOSS.length])
    paint.u.uFrom.value.set(BOSS[d.i % BOSS.length])
    paint.u.uC.value.copy(d.label)
  }, [mine, paint, d])
  useFrame(() => {
    paint.u.uR.value = cq ? reach * ease(ramp(cq.t, CQ.spread)) : 1e4
  })
  const roadGeom = useMemo(() => new THREE.ShapeGeometry(d.road), [d.road])
  const marker = useRef<THREE.Sprite>(null)
  useFrame(({ clock }) => {
    if (marker.current) marker.current.position.y = 34 + Math.sin(clock.elapsedTime * 3 + d.i) * 1.5
  })
  return (
    <>
    <mesh geometry={roadGeom} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
      <meshStandardMaterial color="#868e96" roughness={0.9} />
    </mesh>
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
        <primitive object={paint.m} attach="material" />
      </mesh>
      {selected && (
        <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={[1, 1, 1.15]}>
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
        </mesh>
      )}
      <Houses list={d.houses} />
      <Trees list={d.trees} />
      <group position={[d.label.x, 0, d.label.y]}>
        <group scale={1.7}>
        <Maquis name={info.name} mine={mine} home={d.i === 0} color={flagOf(d.i, mine)} oldColor={cq ? flagOf(d.i, false) : undefined} cq={cq} />
        {info.bonus && <Landmark kind={info.bonus.icon} />}
        </group>
        {(open || mine) && (
          <sprite ref={marker} position={[0, 34, 0]} scale={[7, 7, 1]}>
            <spriteMaterial map={labelTexture(mine ? '👑' : '⚔️', 128)} depthTest={false} transparent />
          </sprite>
        )}
        <sprite position={[0, 24, 0]} scale={[46, 9.2, 1]}>
          <spriteMaterial map={labelTexture(`${shielded ? '🛡️ ' : ''}${d.i === 0 ? '📍 ' : ''}${info.bonus ? `${info.bonus.icon} ` : ''}${mine ? '👑 ' : open ? (d.i === 0 ? '🗡️ ' : '⚔️ ') : ''}${info.name}`)} depthTest={false} transparent />
        </sprite>
      </group>
    </group>
    </>
  )
}

/** Palms and round trees between the houses. */
function Trees({ list }: { list: DistrictGeo['trees'] }) {
  return (
    <>
      {list.map((t, k) => (
        <group key={k} position={[t.x, 1.2, t.z]} scale={t.s}>
          <mesh position={[0, 2, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.26, 4, 6]} />
            <meshStandardMaterial color="#a07f5c" />
          </mesh>
          {t.palm ? (
            [0, 1, 2, 3, 4].map((j) => (
              <mesh key={j} position={[Math.cos(j * 1.256) * 1, 4.1, Math.sin(j * 1.256) * 1]} rotation={[0, -j * 1.256, -0.5]} scale={[1, 0.12, 0.4]} castShadow>
                <icosahedronGeometry args={[1.3, 0]} />
                <meshStandardMaterial color={j % 2 ? '#2f9e44' : '#40c057'} flatShading />
              </mesh>
            ))
          ) : (
            <mesh position={[0, 4.4, 0]} castShadow>
              <icosahedronGeometry args={[1.7, 0]} />
              <meshStandardMaterial color="#37b24d" flatShading />
            </mesh>
          )}
        </group>
      ))}
    </>
  )
}

/** Gbakas and taxis going round the streets (the outlines of the districts). */
function Traffic({ ds }: { ds: DistrictGeo[] }) {
  const cars = useMemo(() => {
    const r = rng(7)
    return Array.from({ length: 16 }, (_, k) => {
      const d = ds[k % ds.length]
      return { ring: d.ring, t: r(), speed: 0.006 + r() * 0.006, color: ['#fcc419', '#f08c00', '#40c057', '#1c7ed6'][k % 4], big: k % 2 === 0 }
    })
  }, [ds])
  const refs = useRef<(THREE.Group | null)[]>([])
  const a = useMemo(() => new THREE.Vector2(), [])
  useFrame((_, dt) => {
    cars.forEach((c, k) => {
      const g = refs.current[k]
      if (!g) return
      c.t = (c.t + dt * c.speed) % 1
      const n = c.ring.length - 1
      const f = c.t * n
      const i = Math.floor(f)
      const p0 = c.ring[i]
      const p1 = c.ring[(i + 1) % n]
      a.lerpVectors(p0, p1, f - i)
      g.position.set(a.x, 0.6, a.y)
      g.rotation.y = Math.atan2(p1.x - p0.x, p1.y - p0.y)
    })
  })
  return (
    <>
      {cars.map((c, k) => (
        <group key={k} ref={(el) => void (refs.current[k] = el)}>
          <RoundedBox args={[1.4, 1.2, c.big ? 3.4 : 2.4]} radius={0.3} castShadow>
            <meshStandardMaterial color={c.color} />
          </RoundedBox>
        </group>
      ))}
    </>
  )
}

/** A few clouds drifting over the city (their shadows move on the ground). */
function Clouds({ c }: { c: THREE.Vector2 }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!g.current) return
    g.current.position.x += dt * 1.6
    if (g.current.position.x > 120) g.current.position.x = -120
  })
  const puffs = useMemo(() => {
    const r = rng(99)
    return Array.from({ length: 5 }, () => ({ x: c.x + (r() - 0.5) * 260, z: c.y + (r() - 0.5) * 220, s: 2.5 + r() * 2.5 }))
  }, [c])
  return (
    <group ref={g}>
      {puffs.map((p, k) => (
        <group key={k} position={[p.x, 115, p.z]}>
          {[-1, 0, 1].map((j) => (
            <mesh key={j} position={[j * p.s * 0.9, Math.abs(j) * -1, 0]} castShadow>
              <sphereGeometry args={[p.s * (j === 0 ? 1.2 : 0.9), 12, 10]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/** The camera flies down from the sky onto your district when the screen opens. */
function FlyIn({ to, close = false }: { to: THREE.Vector3; close?: boolean }) {
  const t = useRef(0)
  useFrame(({ camera }, dt) => {
    if (t.current >= 1) return
    t.current = Math.min(1, t.current + dt / (close ? 1.6 : 2.2))
    const k = 1 - Math.pow(1 - t.current, 3)
    const [ox, oy, oz] = close ? [45, 105, 85] : [70, 175, 150]
    camera.position.set(to.x + ox * k, 420 - (420 - oy) * k, to.z + 40 + (oz - 40) * k)
    camera.lookAt(to.x, 0, to.z)
  })
  return null
}

/** Advances the conquest clock, fires the confetti and the fanfare, and says when it is over. */
function ConquestRun({ cq, at, onDone }: { cq: ConquestClock; at: THREE.Vector2; onDone: () => void }) {
  const bits = useRef<THREE.InstancedMesh>(null)
  const parts = useMemo(() => {
    const r = rng(5)
    return Array.from({ length: 120 }, () => {
      const a = r() * Math.PI * 2
      const sp = 6 + r() * 14
      return { p: new THREE.Vector3(), v: new THREE.Vector3(Math.cos(a) * sp, 18 + r() * 22, Math.sin(a) * sp), c: ['#ff6b6b', '#fcc419', '#51cf66', '#339af0', '#cc5de8', '#ffffff'][Math.floor(r() * 6)], rot: r() * 6 }
    })
  }, [])
  const fired = useRef(false)
  const done = useRef(false)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    const m = bits.current
    if (!m) return
    const col = new THREE.Color()
    parts.forEach((q, k) => m.setColorAt(k, col.set(q.c)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [parts])
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    cq.t += dt
    if (!fired.current && cq.t >= CQ.confetti) {
      fired.current = true
      parts.forEach((q) => q.p.set(at.x, 16, at.y))
      sfx.unlock()
    }
    const m = bits.current
    if (m) {
      parts.forEach((q, k) => {
        if (fired.current) {
          q.v.y -= 30 * dt
          q.p.addScaledVector(q.v, dt)
          q.rot += dt * 8
        }
        dummy.position.copy(fired.current && q.p.y > 0 ? q.p : new THREE.Vector3(0, -50, 0))
        dummy.rotation.set(q.rot, q.rot * 0.7, 0)
        dummy.updateMatrix()
        m.setMatrixAt(k, dummy.matrix)
      })
      m.instanceMatrix.needsUpdate = true
    }
    if (!done.current && cq.t >= CQ.done) {
      done.current = true
      onDone()
    }
  })
  return (
    <instancedMesh ref={bits} args={[undefined, undefined, parts.length]} frustumCulled={false}>
      <boxGeometry args={[0.9, 0.2, 1.4]} />
      <meshBasicMaterial />
    </instancedMesh>
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

/** The mountains around Man (the Dent de Man to the north-west). */
function Mountains({ c, size }: { c: THREE.Vector2; size: THREE.Vector2 }) {
  const peaks = useMemo(() => {
    const r = rng(7)
    const out: { x: number; z: number; h: number; w: number }[] = [{ x: c.x - size.x * 0.55, z: c.y - size.y * 0.95, h: 42, w: 22 }]
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.85 + (k / 8) * 0.9) // from the west round to the north
      out.push({ x: c.x + Math.cos(a) * size.x * (0.9 + r() * 0.25), z: c.y - Math.abs(Math.sin(a)) * size.y * (0.9 + r() * 0.25), h: 16 + r() * 18, w: 14 + r() * 10 })
    }
    return out
  }, [c, size])
  return (
    <group>
      {peaks.map((p, k) => (
        <group key={k} position={[p.x, 0, p.z]}>
          <mesh position={[0, p.h / 2, 0]} castShadow>
            <coneGeometry args={[p.w, p.h, 7]} />
            <meshStandardMaterial color={k ? '#5c8f3a' : '#6d8a5a'} flatShading />
          </mesh>
          <mesh position={[0, p.h * 0.86, 0]}>
            <coneGeometry args={[p.w * 0.29, p.h * 0.29, 7]} />
            <meshStandardMaterial color="#8d8270" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Commune3D({ place, owners, selected, onPick, conquer = -1, onConquestDone }: { place: PlaceId; owners: ('me' | 'boss')[]; selected: number; onPick: (i: number) => void; conquer?: number; onConquestDone?: () => void }) {
  const cq = useMemo<ConquestClock | null>(() => (conquer >= 0 ? { t: 0, idx: conquer } : null), [conquer])
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
  const home = (cq ? ds[cq.idx]?.label : ds[0]?.label) ?? c
  const sc = SCENERY[place]
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ fov: 40, position: [home.x + 70, 175, home.y + 150], near: 1, far: 2000 }}>
      <color attach="background" args={['#bfe6ff']} />
      <fog attach="fog" args={['#bfe6ff', 250, 600]} />
      <hemisphereLight args={['#e3f4ff', '#d9b38c', 1.3]} />
      <directionalLight castShadow position={[c.x + 80, 160, c.y + 60]} intensity={2} shadow-mapSize={[2048, 2048]} shadow-camera-left={-150} shadow-camera-right={150} shadow-camera-top={150} shadow-camera-bottom={-150} shadow-camera-far={500} />
      {/* ground; around: the lagoon to the south (Abidjan), forest, the mountains of Man */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, -0.05, c.y]} receiveShadow>
        <planeGeometry args={[size.x * 3, size.y * 3]} />
        <meshStandardMaterial color={sc.ground} />
      </mesh>
      {sc.water && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 0.02, box.max.y + 40]}>
          <planeGeometry args={[size.x * 3, 80]} />
          <meshStandardMaterial color="#4dabf7" roughness={0.15} metalness={0.2} />
        </mesh>
      )}
      {sc.forest && <Forest center={new THREE.Vector2(sc.forest === 'east' ? box.max.x + 28 : box.min.x - 28, c.y - size.y * 0.15)} />}
      {sc.mountains && <Mountains c={c} size={size} />}
      {ds.map((d) => (
        <DistrictBlock key={d.i} d={d} place={place} owner={owners[d.i]} owners={owners} selected={selected === d.i} onPick={() => onPick(d.i)} cq={cq && cq.idx === d.i ? cq : undefined} />
      ))}
      <Traffic ds={ds} />
      <Clouds c={c} />
      <FlyIn to={new THREE.Vector3(home.x, 0, home.y)} close={!!cq} />
      {cq && <ConquestRun cq={cq} at={home} onDone={() => onConquestDone?.()} />}
      <MapControls target={[home.x, 0, home.y]} maxPolarAngle={1.2} minDistance={40} maxDistance={420} enableDamping />
    </Canvas>
  )
}
