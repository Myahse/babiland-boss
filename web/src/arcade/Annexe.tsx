import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { Html, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { signTexture } from '../three/textures'
import { HUB, KITCHEN, PARK_SPOTS, VITRINE, VITRINE_DROP, VITRINE_MAX, S, sc } from './layout'
import { has } from './items'
import { Flat, PlateStack } from './Props'
import { asphalt } from './StreetDecor'
import { useArcade } from './store'
import { ToonPerson } from './ToonPerson'
import { Icon } from './Icons'
import { placeDishes, PLACES } from './places'

// The zones bought in « Aménager » (items.ts, kind 'zone'): the kitchen around the stoves inside, and across the
// side street the annexe: the takeaway window, the delivery point, the parking where customers leave their car.

/** People getting out of a car that has just parked: Sim takes them and sends them to the queue. */
export const arrivals: THREE.Vector3[] = []

export function Zones({ player }: { player: { pos: THREE.Vector3 } }) {
  const place = useArcade((s) => s.current)
  const items = useArcade((s) => s.items)
  const stage = useArcade((s) => s.stage)
  const on = (id: 'cuisine' | 'vitrine' | 'parking' | 'livraison') => items.includes(id)
  return (
    <>
      {on('cuisine') && <Kitchen />}
      <group scale={[S, 1, S]}>
        <AnnexLot />
      </group>
      {on('vitrine') ? <Vitrine player={player} /> : stage >= 1 && <ForSale at={VITRINE} w={2.2} d={1.6} label="VITRINE" />}
      {on('livraison') ? <DeliveryHub /> : stage >= 1 && <ForSale at={HUB} w={2.6} d={1.8} label="LIVRAISON" />}
      {on('parking') ? <Parking key={place} /> : stage >= 1 && <ForSale at={new THREE.Vector3(sc(15), 0, sc(1.3))} w={sc(2.8)} d={sc(6.6)} label="PARKING" />}
    </>
  )
}

// ------------------------------------------------------------------ the kitchen
const tiles = (() => {
  let t: THREE.CanvasTexture | null = null
  return () => {
    if (t) return t
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        g.fillStyle = (x + y) % 2 ? '#f1f3f5' : '#dee2e6'
        g.fillRect(x * 32, y * 32, 32, 32)
      }
    g.strokeStyle = '#adb5bd'
    g.lineWidth = 2
    for (let i = 0; i <= 4; i++) {
      g.beginPath()
      g.moveTo(i * 32, 0)
      g.lineTo(i * 32, 128)
      g.moveTo(0, i * 32)
      g.lineTo(128, i * 32)
      g.stroke()
    }
    t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(8, 2)
    return t
  }
})()

/** A real kitchen: a tiled floor under the stoves, a half wall at each end, one long stainless hood, the sign. */
function Kitchen() {
  const k = KITCHEN
  const w = k.maxX - k.minX
  const cx = (k.minX + k.maxX) / 2
  const sign = useMemo(() => signTexture('CUISINE', '#212529', '#ffffff', 384, 96), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.02, (k.minZ + k.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[w, k.maxZ - k.minZ]} />
        <meshStandardMaterial map={tiles()} roughness={0.4} />
      </mesh>
      {/* a red line on the floor where the kitchen starts */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.025, k.maxZ]}>
        <planeGeometry args={[w, 0.06]} />
        <meshBasicMaterial color="#e03131" />
      </mesh>
      {/* the half wall at the right end, with the pass (a shelf where plates come out) */}
      <mesh position={[k.maxX + 0.08, 0.6, (k.minZ + k.maxZ) / 2]} castShadow>
        <boxGeometry args={[0.16, 1.2, k.maxZ - k.minZ]} />
        <Flat color="#e9ecef" />
      </mesh>
      <mesh position={[k.maxX + 0.08, 1.24, (k.minZ + k.maxZ) / 2]}>
        <boxGeometry args={[0.36, 0.06, k.maxZ - k.minZ + 0.1]} />
        <meshStandardMaterial color="#adb5bd" metalness={0.3} roughness={0.3} />
      </mesh>
      {/* the long hood over all the stoves */}
      <mesh position={[cx, 2.35, k.minZ + 0.35]} castShadow>
        <boxGeometry args={[w - 0.1, 0.35, 0.9]} />
        <meshStandardMaterial color="#ced4da" metalness={0.3} roughness={0.3} />
      </mesh>
      <mesh position={[cx, 2.36, k.minZ + 0.81]}>
        <planeGeometry args={[1.6, 0.4]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {/* heat lamps on the pass */}
      {[-0.35, 0.35].map((z) => (
        <mesh key={z} position={[k.maxX + 0.08, 1.75, (k.minZ + k.maxZ) / 2 + z]}>
          <coneGeometry args={[0.12, 0.16, 12, 1, true]} />
          <meshStandardMaterial color="#ffd8a8" emissive="#ff922b" emissiveIntensity={1.2} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// ------------------------------------------------------------------ the annexe
/** The plot across the side street: packed earth with a low kerb, and the parking's asphalt. */
function AnnexLot() {
  const tex = useMemo(() => asphalt([2, 4]), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[13.2, 0.008, 1.2]} receiveShadow>
        <planeGeometry args={[6.4, 7.2]} />
        <meshStandardMaterial color="#d9b88f" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15, 0.012, 1.3]} receiveShadow>
        <planeGeometry args={[3.0, 7.0]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
    </group>
  )
}

const forSaleTex = new Map<string, THREE.Texture>()
/** A zone not bought yet: a dashed outline on the ground and its name, « à aménager ». */
function ForSale({ at, w, d, label }: { at: THREE.Vector3; w: number; d: number; label: string }) {
  const tex = useMemo(() => {
    let t = forSaleTex.get(label)
    if (t) return t
    const c = document.createElement('canvas')
    c.width = 256
    c.height = Math.round((256 * d) / w)
    const g = c.getContext('2d')!
    g.strokeStyle = '#ffffff'
    g.lineWidth = 8
    g.setLineDash([18, 12])
    g.strokeRect(6, 6, c.width - 12, c.height - 12)
    g.fillStyle = 'rgba(255,255,255,.9)'
    g.font = '800 34px "Baloo 2", sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(label, c.width / 2, c.height / 2 - 14)
    g.font = '700 22px "Baloo 2", sans-serif'
    g.fillText('à aménager', c.width / 2, c.height / 2 + 20)
    t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    forSaleTex.set(label, t)
    return t
  }, [label, w, d])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[at.x, 0.03, at.z]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={tex} transparent opacity={0.85} />
    </mesh>
  )
}

/** The takeaway window: a glass kiosk with the plates in it; fill it from its side, the passers-by buy. */
function Vitrine({ player }: { player: { pos: THREE.Vector3 } }) {
  const n = useArcade((s) => s.vitrine)
  const current = useArcade((s) => s.current)
  const dishes = useMemo(() => placeDishes(PLACES[current]), [current])
  const sign = useMemo(() => signTexture('À EMPORTER', '#e8590c', '#ffffff', 384, 96), [])
  const near = useRef(false)
  const hint = useRef<HTMLDivElement>(null)
  useFrame(() => {
    const v = player.pos.distanceTo(VITRINE_DROP) < 1.3
    if (v !== near.current && hint.current) hint.current.style.display = v ? 'block' : 'none'
    near.current = v
  })
  return (
    <group position={VITRINE}>
      <RoundedBox args={[1.9, 0.8, 1.1]} radius={0.04} position={[0, 0.4, 0]} castShadow receiveShadow>
        <Flat color="#e8590c" />
      </RoundedBox>
      {/* the glass case and what is in it */}
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[1.8, 0.7, 1.0]} />
        <meshStandardMaterial color="#d0ebff" transparent opacity={0.28} roughness={0.05} />
      </mesh>
      <mesh position={[0, 1.52, 0]} castShadow>
        <boxGeometry args={[1.86, 0.06, 1.06]} />
        <Flat color="#495057" />
      </mesh>
      {[0, 1, 2, 3].map((k) => {
        const c = Math.max(0, Math.min(4, n - k * 4))
        return c > 0 ? <PlateStack key={k} count={c} dish={dishes[k % dishes.length]} position={[-0.6 + k * 0.4, 0.82, 0.05]} /> : null
      })}
      {/* the parasol and the sign */}
      <mesh position={[0.8, 1.6, -0.45]}>
        <cylinderGeometry args={[0.03, 0.03, 1.9, 6]} />
        <Flat color="#868e96" />
      </mesh>
      <mesh position={[0.8, 2.55, -0.45]} castShadow>
        <coneGeometry args={[1.1, 0.45, 8]} />
        <Flat color="#ffd43b" />
      </mesh>
      <mesh position={[0, 1.9, 0.3]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[1.5, 0.38]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      {/* where you stand to fill it */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[VITRINE_DROP.x - VITRINE.x, 0.03, 0]}>
        <ringGeometry args={[0.35, 0.45, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      <Html position={[-1.05, 1.4, 0]} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={hint} style={{ display: 'none' }} className="pop w-48 rounded-2xl border-[3px] border-[var(--color-ink)] bg-white px-2.5 py-1.5 text-center shadow-lg">
          <div className="flex items-center justify-center gap-1 text-sm font-extrabold">
            <Icon name="box" size={18} /> Vitrine {n}/{VITRINE_MAX}
          </div>
          <div className="text-[11px] font-semibold leading-snug">Pose tes plats ici : les passants les achètent tout seuls, 20 % plus cher.</div>
        </div>
      </Html>
      {/* the seller */}
      <ToonPerson who="awa" moving={false} position={[0.2, 0, -0.95]} rotation={[0, 0, 0]} scale={1.1} />
    </group>
  )
}

/** The delivery point: a shed, its sign, two motos waiting. */
function DeliveryHub() {
  const sign = useMemo(() => signTexture('LIVRAISON EXPRESS', '#1c7ed6', '#ffffff', 512, 96), [])
  return (
    <group>
      <group position={HUB}>
        <mesh position={[0, 1.1, -0.6]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 2.2, 0.6]} />
          <Flat color="#1c7ed6" />
        </mesh>
        <mesh position={[0, 2.25, 0.05]} rotation={[0.25, 0, 0]} castShadow>
          <boxGeometry args={[2.9, 0.08, 1.9]} />
          <Flat color="#ced4da" />
        </mesh>
        {[-1.3, 1.3].map((x) => (
          <mesh key={x} position={[x, 1.05, 0.85]}>
            <cylinderGeometry args={[0.05, 0.05, 2.1, 6]} />
            <Flat color="#868e96" />
          </mesh>
        ))}
        <mesh position={[0, 1.75, -0.29]}>
          <planeGeometry args={[2.3, 0.42]} />
          <meshBasicMaterial map={sign} toneMapped={false} />
        </mesh>
        {[-0.65, 0.65].map((x, i) => (
          <ParkedMoto key={x} position={[x, 0, 0.2]} color={['#e03131', '#f59f00'][i]} />
        ))}
      </group>
    </group>
  )
}

function ParkedMoto({ color, ...props }: { color: string } & ThreeElements['group']) {
  return (
    <group {...props}>
      {[-0.45, 0.45].map((z) => (
        <mesh key={z} position={[0, 0.22, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.2, 0.07, 8, 16]} />
          <Flat color="#212529" />
        </mesh>
      ))}
      <RoundedBox args={[0.28, 0.32, 0.9]} radius={0.08} position={[0, 0.5, 0]} castShadow>
        <Flat color={color} />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.36, 0.42]} radius={0.04} position={[0, 0.85, -0.35]} castShadow>
        <Flat color="#ffd43b" />
      </RoundedBox>
    </group>
  )
}

// ------------------------------------------------------------------ the parking
type Spot = { state: 'empty' | 'in' | 'parked' | 'out'; t: number; wait: number; color: string }
const CAR_COLOURS = ['#e03131', '#1c7ed6', '#f8f9fa', '#2b8a3e', '#fab005', '#495057', '#ffd43b']

/** Four places; cars come in from the front road, park, someone gets out and goes to queue, the car leaves. */
function Parking() {
  const spots = useRef<Spot[]>(PARK_SPOTS.map((_, i) => ({ state: 'empty', t: 0, wait: 2 + i * 4, color: CAR_COLOURS[i] })))
  const cars = useRef<(THREE.Group | null)[]>([])
  const lines = useMemo(() => PARK_SPOTS.map((p) => p.z - 0.85).concat([PARK_SPOTS[3].z + 0.85]), [])
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1)
    spots.current.forEach((s, i) => {
      const g = cars.current[i]
      const p = PARK_SPOTS[i]
      const road = new THREE.Vector3(p.x - 1.2, 0, sc(6.6))
      s.t += dt
      if (s.state === 'empty' && s.t > s.wait) {
        s.state = 'in'
        s.t = 0
        s.color = CAR_COLOURS[Math.floor(Math.random() * CAR_COLOURS.length)]
      } else if (s.state === 'in' && s.t > 2.2) {
        s.state = 'parked'
        s.t = 0
        s.wait = 18 + Math.random() * 14
        // the driver gets out and goes to queue
        arrivals.push(p.clone().add(new THREE.Vector3(-1.1, 0, 0)))
      } else if (s.state === 'parked' && s.t > s.wait) {
        s.state = 'out'
        s.t = 0
      } else if (s.state === 'out' && s.t > 2.2) {
        s.state = 'empty'
        s.t = 0
        s.wait = 4 + Math.random() * 8
      }
      if (!g) return
      g.visible = s.state !== 'empty'
      const k = s.state === 'in' ? Math.min(1, s.t / 2.2) : s.state === 'out' ? 1 - Math.min(1, s.t / 2.2) : 1
      // a smooth curve from the road into the place, the nose toward the building
      const e = k * k * (3 - 2 * k)
      g.position.set(THREE.MathUtils.lerp(road.x, p.x, e), 0, THREE.MathUtils.lerp(road.z, p.z, e))
      g.rotation.y = THREE.MathUtils.lerp(Math.PI, Math.PI / 2, Math.min(1, e * 1.4))
      const body = g.children[0] as THREE.Mesh
      ;(body.material as THREE.MeshStandardMaterial).color.set(s.color)
    })
  })
  const sign = useMemo(() => signTexture('P · PARKING CLIENTS', '#1c7ed6', '#ffffff', 512, 96), [])
  return (
    <group>
      {lines.map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[PARK_SPOTS[0].x + 0.2, 0.02, z]}>
          <planeGeometry args={[2.2, 0.08]} />
          <meshBasicMaterial color="#f8f9fa" />
        </mesh>
      ))}
      <group position={[sc(16.4), 0, sc(-2.4)]}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2.4, 6]} />
          <Flat color="#868e96" />
        </mesh>
        <mesh position={[-0.01, 2.3, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.8, 0.34]} />
          <meshBasicMaterial map={sign} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {PARK_SPOTS.map((_, i) => (
        <group key={i} ref={(g) => void (cars.current[i] = g)} visible={false}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[1.0, 0.5, 1.9]} />
            <meshStandardMaterial color={CAR_COLOURS[i]} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.88, -0.1]} castShadow>
            <boxGeometry args={[0.86, 0.38, 1.0]} />
            <meshStandardMaterial color="#a5d8ff" roughness={0.1} />
          </mesh>
          {[
            [-0.48, -0.6],
            [0.48, -0.6],
            [-0.48, 0.6],
            [0.48, 0.6],
          ].map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x, 0.22, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.2, 0.2, 0.14, 12]} />
              <Flat color="#212529" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/** For the HUD: is this zone bought in the current place. */
export const zoneOn = (id: 'cuisine' | 'vitrine' | 'parking' | 'livraison') => has(useArcade.getState().current, id)
