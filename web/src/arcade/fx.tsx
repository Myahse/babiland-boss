import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Plate } from './Props'

// "Juice": what makes shop games feel good. Plates and bills fly in an arc from where they are
// to where they go, and a burst of confetti pops when something is unlocked.
// Everything is drawn from small pools of objects created once (cheap on phones).

type Flight = { kind: 'plate' | 'cash'; from: THREE.Vector3; to: THREE.Vector3 | (() => THREE.Vector3); t: number; dur: number; delay: number }
const flights: Flight[] = []
type Bit = { pos: THREE.Vector3; vel: THREE.Vector3; rot: number; life: number; color: number }
const bits: Bit[] = []

/** Send a plate or a bill flying from `from` to `to` (a point, or a function for a moving target). */
export function fly(kind: Flight['kind'], from: THREE.Vector3, to: Flight['to'], delay = 0, dur = 0.3) {
  if (flights.length > 60) flights.shift()
  flights.push({ kind, from: from.clone(), to, t: 0, dur, delay })
}

const CONFETTI = [0xff6b6b, 0xfcc419, 0x51cf66, 0x339af0, 0xcc5de8, 0xffffff]
/** A burst of confetti at a point (unlocks, level up). */
export function burst(at: THREE.Vector3, n = 40) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const sp = 1.5 + Math.random() * 2.5
    bits.push({ pos: at.clone().add(new THREE.Vector3(0, 0.3, 0)), vel: new THREE.Vector3(Math.cos(a) * sp, 3 + Math.random() * 3, Math.sin(a) * sp), rot: Math.random() * 6, life: 1.6, color: CONFETTI[i % CONFETTI.length] })
  }
  if (bits.length > 200) bits.splice(0, bits.length - 200)
}

/** Words and faces floating up from someone: « +1 000 » when a customer pays, 😋 served, 😤 gone. */
type Float = { text: string; color: string; pos: THREE.Vector3; t: number; big: boolean }
const floats: Float[] = []
export function floatText(at: THREE.Vector3, text: string, color = '#2b8a3e', big = false) {
  if (floats.length > 10) floats.shift()
  floats.push({ text, color, pos: at.clone(), t: 0, big })
}
/** a few small sparks of colour (a customer happy with his plate) */
export function sparks(at: THREE.Vector3, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const sp = 0.6 + Math.random() * 0.9
    bits.push({ pos: at.clone(), vel: new THREE.Vector3(Math.cos(a) * sp, 1.6 + Math.random() * 1.4, Math.sin(a) * sp), rot: Math.random() * 6, life: 0.8, color: CONFETTI[i % 4] })
  }
  if (bits.length > 200) bits.splice(0, bits.length - 200)
}
const floatTex = new Map<string, THREE.CanvasTexture>()
function floatTexture(text: string, color: string) {
  const key = text + color
  if (floatTex.has(key)) return floatTex.get(key)!
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')!
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  if (color) {
    g.font = '800 64px "Baloo 2", sans-serif'
    g.lineWidth = 12
    g.strokeStyle = '#ffffff'
    g.strokeText(text, 128, 66)
    g.fillStyle = color
    g.fillText(text, 128, 66)
  } else {
    g.font = '86px sans-serif'
    g.fillText(text, 128, 70)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  floatTex.set(key, t)
  return t
}
const FLOATS = 10

const PLATES = 24
const CASH = 24

export function FX() {
  const plates = useRef<(THREE.Group | null)[]>([])
  const cash = useRef<(THREE.Mesh | null)[]>([])
  const conf = useRef<THREE.InstancedMesh>(null)
  const words = useRef<(THREE.Sprite | null)[]>([])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const col = useMemo(() => new THREE.Color(), [])
  const p = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    let pi = 0
    let ci = 0
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i]
      if (f.delay > 0) {
        f.delay -= dt
        continue
      }
      f.t += dt / f.dur
      if (f.t >= 1) {
        flights.splice(i, 1)
        continue
      }
      const to = typeof f.to === 'function' ? f.to() : f.to
      p.lerpVectors(f.from, to, f.t)
      p.y += Math.sin(f.t * Math.PI) * 0.7
      const o = f.kind === 'plate' ? plates.current[pi++] : cash.current[ci++]
      if (!o) continue
      o.visible = true
      o.position.copy(p)
      o.rotation.set(f.t * 3, f.t * 5, 0)
      o.scale.setScalar(1 - f.t * 0.15)
    }
    for (; pi < PLATES; pi++) if (plates.current[pi]) plates.current[pi]!.visible = false
    for (; ci < CASH; ci++) if (cash.current[ci]) cash.current[ci]!.visible = false

    // the floating words and faces: up, a little bigger, then fade
    for (let i = floats.length - 1; i >= 0; i--) {
      floats[i].t += dt / 1.3
      if (floats[i].t >= 1) floats.splice(i, 1)
    }
    words.current.forEach((sp, i) => {
      if (!sp) return
      const f = floats[i]
      sp.visible = !!f
      if (!f) return
      const mat = sp.material as THREE.SpriteMaterial
      const tex = floatTexture(f.text, f.color)
      if (mat.map !== tex) {
        mat.map = tex
        mat.needsUpdate = true
      }
      const pop = Math.min(1, f.t * 6)
      sp.position.copy(f.pos).add(new THREE.Vector3(0, 1.9 + f.t * 0.9, 0))
      const s = (f.big ? 0.75 : 0.95) * (0.6 + 0.4 * pop)
      sp.scale.set(s * 2, s, 1)
      mat.opacity = f.t < 0.7 ? 1 : 1 - (f.t - 0.7) / 0.3
    })

    const m = conf.current
    if (m) {
      let k = 0
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i]
        b.life -= dt
        if (b.life <= 0 || b.pos.y < 0) {
          bits.splice(i, 1)
          continue
        }
        b.vel.y -= 9 * dt
        b.pos.addScaledVector(b.vel, dt)
        b.rot += dt * 8
        if (k >= 200) continue
        dummy.position.copy(b.pos)
        dummy.rotation.set(b.rot, b.rot * 0.7, 0)
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        m.setMatrixAt(k, dummy.matrix)
        m.setColorAt(k, col.setHex(b.color))
        k++
      }
      m.count = k
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  })

  return (
    <>
      {Array.from({ length: PLATES }, (_, i) => (
        <group key={i} ref={(el) => void (plates.current[i] = el)} visible={false}>
          <Plate />
        </group>
      ))}
      {Array.from({ length: CASH }, (_, i) => (
        <mesh key={i} ref={(el) => void (cash.current[i] = el)} visible={false} castShadow>
          <boxGeometry args={[0.3, 0.14, 0.17]} />
          <meshStandardMaterial color="#69db3c" roughness={0.45} />
        </mesh>
      ))}
      {Array.from({ length: FLOATS }, (_, i) => (
        <sprite key={`w${i}`} ref={(el) => void (words.current[i] = el)} visible={false} renderOrder={10}>
          <spriteMaterial transparent depthTest={false} />
        </sprite>
      ))}
      <instancedMesh ref={conf} args={[undefined, undefined, 200]} frustumCulled={false}>
        <boxGeometry args={[0.08, 0.02, 0.12]} />
        <meshBasicMaterial />
      </instancedMesh>
    </>
  )
}
