import { useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeElements } from '@react-three/fiber'
import { glowing } from './daynight'

// What makes the street look like a street of Abidjan: asphalt with its patches, the red laterite, the kerbs
// painted red and white, street lamps, wooden electricity poles with their sagging wires, plants in clay pots.

function tex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat: [number, number]) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  t.anisotropy = 4
  return t
}
let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

/** Asphalt: grey with grain, darker patches and a few cracks. */
export const asphalt = (repeat: [number, number]) =>
  tex(
    256,
    256,
    (g) => {
      g.fillStyle = '#4a5057'
      g.fillRect(0, 0, 256, 256)
      for (let i = 0; i < 9000; i++) {
        const v = 60 + rnd() * 40
        g.fillStyle = `rgb(${v},${v + 3},${v + 8})`
        g.fillRect(rnd() * 256, rnd() * 256, 1.5, 1.5)
      }
      for (let i = 0; i < 6; i++) {
        g.fillStyle = 'rgba(30,32,36,.12)'
        g.beginPath()
        g.ellipse(rnd() * 256, rnd() * 256, 18 + rnd() * 30, 10 + rnd() * 18, rnd() * 3, 0, Math.PI * 2)
        g.fill()
      }
      g.strokeStyle = 'rgba(25,25,28,.3)'
      g.lineWidth = 1.2
      for (let i = 0; i < 5; i++) {
        let x = rnd() * 256
        let y = rnd() * 256
        g.beginPath()
        g.moveTo(x, y)
        for (let k = 0; k < 6; k++) g.lineTo((x += (rnd() - 0.5) * 30), (y += (rnd() - 0.5) * 30))
        g.stroke()
      }
    },
    repeat,
  )

/** Laterite: the red-orange earth of Abidjan, with darker and lighter patches. */
export const laterite = (repeat: [number, number]) =>
  tex(
    256,
    256,
    (g) => {
      g.fillStyle = '#d9773f'
      g.fillRect(0, 0, 256, 256)
      for (let i = 0; i < 40; i++) {
        g.fillStyle = rnd() < 0.5 ? 'rgba(160,70,30,.18)' : 'rgba(245,170,110,.18)'
        g.beginPath()
        g.ellipse(rnd() * 256, rnd() * 256, 10 + rnd() * 40, 8 + rnd() * 26, rnd() * 3, 0, Math.PI * 2)
        g.fill()
      }
      for (let i = 0; i < 5000; i++) {
        g.fillStyle = rnd() < 0.5 ? 'rgba(120,50,20,.35)' : 'rgba(255,210,170,.3)'
        g.fillRect(rnd() * 256, rnd() * 256, 1.4, 1.4)
      }
    },
    repeat,
  )

/** Kerb stripes, red and white. */
export const kerb = (n: number) =>
  tex(
    64,
    16,
    (g) => {
      g.fillStyle = '#f1f3f5'
      g.fillRect(0, 0, 64, 16)
      g.fillStyle = '#e03131'
      g.fillRect(0, 0, 32, 16)
    },
    [n, 1],
  )

const pole = new THREE.MeshStandardMaterial({ color: '#2f3e46', roughness: 0.5, metalness: 0.4 })
const lampGlow = new THREE.MeshStandardMaterial({ color: '#fff3bf', emissive: '#ffd43b', emissiveIntensity: 2.2 })
// lit at night (daynight.tsx)
glowing.lamps.push(lampGlow)
const wood = new THREE.MeshStandardMaterial({ color: '#7a5230', roughness: 0.9 })
const wire = new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.8 })
const insulator = new THREE.MeshStandardMaterial({ color: '#dee2e6', roughness: 0.4 })

/** A street lamp: a dark post, an arm over the road, a warm lamp (it glows). */
function Lamp({ facing = 0, ...props }: { facing?: number } & ThreeElements['group']) {
  return (
    <group {...props} rotation={[0, facing, 0]}>
      <mesh material={pole} position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 3.2, 8]} />
      </mesh>
      <mesh material={pole} position={[0, 3.15, 0.35]} rotation={[Math.PI / 2.4, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
      </mesh>
      <mesh material={pole} position={[0, 3.25, 0.72]}>
        <boxGeometry args={[0.22, 0.08, 0.38]} />
      </mesh>
      <mesh material={lampGlow} position={[0, 3.19, 0.72]}>
        <boxGeometry args={[0.16, 0.03, 0.3]} />
      </mesh>
    </group>
  )
}

/** A wooden electricity pole with its crossbar. */
function Pole({ ...props }: ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh material={wood} position={[0, 2.3, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.11, 4.6, 8]} />
      </mesh>
      <mesh material={wood} position={[0, 4.25, 0]}>
        <boxGeometry args={[1.1, 0.08, 0.08]} />
      </mesh>
      {[-0.45, 0, 0.45].map((x) => (
        <mesh key={x} material={insulator} position={[x, 4.35, 0]}>
          <cylinderGeometry args={[0.03, 0.04, 0.1, 6]} />
        </mesh>
      ))}
    </group>
  )
}

/** Wires sagging between two poles (three of them). */
function Wires({ a, b }: { a: THREE.Vector3; b: THREE.Vector3 }) {
  const geos = useMemo(
    () =>
      [-0.45, 0, 0.45].map((off) => {
        const dir = new THREE.Vector3().subVectors(b, a)
        const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(off)
        const s = a.clone().add(side).setY(4.38)
        const e = b.clone().add(side).setY(4.38)
        const pts = Array.from({ length: 13 }, (_, i) => {
          const t = i / 12
          return s.clone().lerp(e, t).add(new THREE.Vector3(0, -Math.sin(t * Math.PI) * 0.55, 0))
        })
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 4, false)
      }),
    [a, b],
  )
  return (
    <>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={wire} />
      ))}
    </>
  )
}

// on the far side of the side street, behind the shop: tall things near the camera would hide the game
const POLES = [new THREE.Vector3(9.35, 0, 1.5), new THREE.Vector3(9.35, 0, -7.5), new THREE.Vector3(9.35, 0, -16.5)]

/** A plant in a clay pot: a few broad leaves (banana, elephant ear). */
export function PottedPlant(props: ThreeElements['group']) {
  const leaves = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * Math.PI * 2 + i * 0.3, tilt: 0.5 + (i % 3) * 0.18, s: 0.85 + (i % 2) * 0.25 })), [])
  return (
    <group {...props}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.2, 0.44, 14]} />
        <meshStandardMaterial color="#c2552b" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.31, 0.31, 0.06, 14]} />
        <meshStandardMaterial color="#a8461f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.02, 12]} />
        <meshStandardMaterial color="#4a2a12" roughness={1} />
      </mesh>
      {leaves.map((l, i) => (
        <group key={i} position={[0, 0.45, 0]} rotation={[0, l.a, 0]}>
          <mesh position={[0, 0.32 * l.s, 0.17 * l.s]} rotation={[l.tilt, 0, 0]} scale={[0.16 * l.s, 0.42 * l.s, 0.03]} castShadow>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={i % 2 ? '#2f9e44' : '#37b24d'} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Lamps and poles along the street corner. */
export function StreetDecor() {
  return (
    <>
      {[-2.5, -12].map((z) => (
        <Lamp key={z} position={[9.35, 0, z]} facing={-Math.PI / 2} />
      ))}
      {POLES.map((p, i) => (
        <Pole key={i} position={p} rotation={[0, Math.PI / 2, 0]} />
      ))}
      <Wires a={POLES[0]} b={POLES[1]} />
      <Wires a={POLES[1]} b={POLES[2]} />
    </>
  )
}
