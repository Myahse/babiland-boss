import { useEffect, useMemo, useState } from 'react'
import { createPortal } from '@react-three/fiber'
import * as THREE from 'three'
import { gold } from './LookModels'
import { patternTexture, tier } from './looks'

// The ten outfits of the team and of your character (the ten looks of looks.ts): the people are one mesh with one
// texture, so the clothes can't be repainted; instead things are put on them, held by their skeleton so they follow
// every move: an apron, a scarf, the chef's hat, a bow tie, glasses, a gold chain, a crown.
//   1 nothing · 2 an apron · 3 a painted apron and a scarf · 4 the white apron and the chef's hat · 5 grey, with a
//   bow tie · 6 the colours of the country · 7 wax · 8 leather, glasses · 9 black and gold, the chain · 10 the crown
//
// Each piece is made in « head units » (1 = the height of the head of that person), on a frame turned to face the
// way the face looks (the rig's `headfront` bone), so it fits every character without measuring them by hand.

type Mount = { group: THREE.Group }

function findBone(root: THREE.Object3D, name: string) {
  let b: THREE.Object3D | null = null
  root.traverse((o) => {
    if (!b && (o as THREE.Bone).isBone && o.name.toLowerCase() === name.toLowerCase()) b = o
  })
  return b as THREE.Object3D | null
}

/** A frame held by `boneName`: origin on the bone, +Y up, +Z where the face looks, 1 unit = the head's height. */
function mount(model: THREE.Object3D, boneName: string): Mount | null {
  const b = findBone(model, boneName)
  const head = findBone(model, 'Head')
  const front = findBone(model, 'headfront')
  const end = findBone(model, 'head_end')
  if (!b || !head || !front || !end) return null
  // the model is not in the scene yet: its world matrices are in the model's own space, in the bind pose
  model.updateMatrixWorld(true)
  const hp = head.getWorldPosition(new THREE.Vector3())
  // the height of the head (one rig has its head-top bone almost on the head bone: then the usual height)
  const measured = end.getWorldPosition(new THREE.Vector3()).distanceTo(hp)
  const unit = measured > 0.2 ? measured : 0.37
  const fwd = front.getWorldPosition(new THREE.Vector3()).sub(hp).setY(0).normalize()
  const up = new THREE.Vector3(0, 1, 0)
  const side = new THREE.Vector3().crossVectors(up, fwd).normalize()
  // the wanted frame in model space, then brought into the bone's space
  const want = new THREE.Matrix4().makeBasis(side, up, fwd).scale(new THREE.Vector3(unit, unit, unit))
  want.setPosition(b.getWorldPosition(new THREE.Vector3()))
  const local = new THREE.Matrix4().copy(b.matrixWorld).invert().multiply(want)
  const group = new THREE.Group()
  group.matrixAutoUpdate = false
  group.matrix.copy(local)
  b.add(group)
  return { group }
}

const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra })
const MATS = new Map<string, THREE.MeshStandardMaterial>()
const m = (key: string, make: () => THREE.MeshStandardMaterial) => {
  let x = MATS.get(key)
  if (!x) MATS.set(key, (x = make()))
  return x
}
const white = m('white', () => mat('#ffffff', { roughness: 0.5 }))
const black = m('black', () => mat('#1a1a1a', { roughness: 0.3 }))
const lens = m('lens', () => mat('#101418', { roughness: 0.1, metalness: 0.3 }))

/** The apron of a level: its cloth (a colour or a pattern) and its trim. */
function apronMat(level: number) {
  return m(`apron${level}`, () => {
    const t = tier(level)
    const colour = level === 4 ? '#ffffff' : level === 5 ? '#ced4da' : level === 8 ? '#7b4a22' : level === 10 ? '#fffaf0' : t.front
    const map = level === 6 || level === 7 ? patternTexture(t, colour, level === 7 ? [1.5, 1.5] : [1, 1]) : null
    return mat(map ? '#ffffff' : colour, { map, roughness: level === 8 ? 0.45 : 0.75, side: THREE.DoubleSide })
  })
}

function Apron({ level }: { level: number }) {
  const cloth = apronMat(level)
  return (
    <group>
      {/* the bib and the skirt, a little in front of the body, the strap round the neck */}
      <mesh position={[0, -0.75, 0.6]} material={cloth}>
        <boxGeometry args={[0.62, 0.8, 0.04]} />
      </mesh>
      <mesh position={[0, -1.72, 0.64]} rotation={[-0.05, 0, 0]} material={cloth}>
        <boxGeometry args={[0.95, 1.2, 0.04]} />
      </mesh>
      {/* the ties round the waist */}
      <mesh position={[0, -1.15, 0.6]} material={level >= 9 ? gold : m(`tie-w${level}`, () => mat(tier(level).trim))}>
        <boxGeometry args={[1.0, 0.07, 0.05]} />
      </mesh>
      {level >= 9 && (
        <mesh position={[0, -2.31, 0.68]} material={gold}>
          <boxGeometry args={[0.97, 0.06, 0.05]} />
        </mesh>
      )}
      {level >= 3 && (
        // a pocket
        <mesh position={[0, -1.55, 0.67]} material={level >= 9 ? gold : m(`pocket${level}`, () => mat(tier(level).trim))}>
          <boxGeometry args={[0.42, 0.26, 0.03]} />
        </mesh>
      )}
    </group>
  )
}

function ChefHat({ level }: { level: number }) {
  const band = level >= 9 ? gold : level === 6 ? m('green', () => mat('#009e60')) : level === 7 ? apronMat(7) : white
  const top = level === 9 ? black : level === 7 ? apronMat(7) : white
  return (
    <group position={[0, 1.0, -0.05]}>
      <mesh position={[0, 0.1, 0]} material={band}>
        <cylinderGeometry args={[0.52, 0.52, 0.22, 18]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={top}>
        <cylinderGeometry args={[0.62, 0.5, 0.6, 18]} />
      </mesh>
      <mesh position={[0, 0.82, 0]} scale={[1, 0.55, 1]} material={top}>
        <sphereGeometry args={[0.64, 18, 10]} />
      </mesh>
    </group>
  )
}

function Crown() {
  return (
    <group position={[0, 1.02, 0]}>
      <mesh position={[0, 0.12, 0]} material={gold}>
        <cylinderGeometry args={[0.5, 0.48, 0.26, 16, 1, true]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.sin(a) * 0.48, 0.38, Math.cos(a) * 0.48]} material={gold}>
            <coneGeometry args={[0.1, 0.3, 6]} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.16, 0.5]} material={m('ruby', () => mat('#e03131', { emissive: '#7a0000', emissiveIntensity: 0.5 }))}>
        <sphereGeometry args={[0.08, 10, 8]} />
      </mesh>
    </group>
  )
}

function Glasses() {
  return (
    <group position={[0, 0.48, 0.62]}>
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={lens}>
          <cylinderGeometry args={[0.17, 0.17, 0.04, 14]} />
        </mesh>
      ))}
      <mesh material={black}>
        <boxGeometry args={[0.66, 0.05, 0.05]} />
      </mesh>
    </group>
  )
}

function BowTie({ level }: { level: number }) {
  const c = level >= 9 ? gold : level === 6 ? m('orange', () => mat('#f77f00')) : m(`tie${level}`, () => mat(level === 5 ? '#c92a2a' : tier(level).trim))
  return (
    <group position={[0, -0.05, 0.55]}>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.14, 0, 0]} rotation={[0, 0, (s * Math.PI) / 2]} material={c}>
          <coneGeometry args={[0.12, 0.24, 4]} />
        </mesh>
      ))}
      <mesh material={c}>
        <sphereGeometry args={[0.07, 8, 6]} />
      </mesh>
    </group>
  )
}

function Scarf({ level }: { level: number }) {
  const c = level === 6 ? m('flagscarf', () => mat('#009e60')) : m(`scarf${level}`, () => mat(tier(level).trim))
  return (
    <mesh position={[0, -0.12, 0.05]} rotation={[Math.PI / 2, 0, 0]} material={c}>
      <torusGeometry args={[0.42, 0.1, 8, 18]} />
    </mesh>
  )
}

function Chain() {
  return (
    <group position={[0, -0.45, 0.5]}>
      <mesh rotation={[Math.PI / 2 - 0.35, 0, 0]} material={gold}>
        <torusGeometry args={[0.45, 0.035, 6, 24, Math.PI]} />
      </mesh>
      <mesh position={[0, -0.42, 0.12]} material={gold}>
        <cylinderGeometry args={[0.13, 0.13, 0.04, 12]} />
      </mesh>
    </group>
  )
}

/**
 * Put the outfit of `level` (1..10) on a person's model. Returns the pieces to render (portals into the bones).
 * `kind`: 'cook' wears the chef's hat; 'boss' (your own character) wears the crown at the top level.
 */
export function useOutfit(model: THREE.Object3D, level: number, kind: 'cook' | 'boss' | 'staff' = 'staff') {
  const [mounts, setMounts] = useState<{ head: Mount | null; neck: Mount | null } | null>(null)
  useEffect(() => {
    if (level <= 1) return
    const head = mount(model, 'Head')
    const neck = mount(model, 'neck')
    setMounts({ head, neck })
    return () => {
      head?.group.removeFromParent()
      neck?.group.removeFromParent()
      setMounts(null)
    }
  }, [model, level >= 2])
  return useMemo(() => {
    if (!mounts || level <= 1) return null
    const L = Math.min(10, level)
    // your own character wears the crown at the top; everyone else (and you before that) the chef's hat
    const crown = kind === 'boss' && L === 10
    const hat = L >= 4 && !crown
    return (
      <>
        {mounts.head &&
          createPortal(
            <>
              {crown ? <Crown /> : hat ? <ChefHat level={L} /> : null}
              {L >= 8 && <Glasses />}
            </>,
            mounts.head.group,
          )}
        {mounts.neck &&
          createPortal(
            <>
              <Apron level={L} />
              {(L === 3 || L === 6) && <Scarf level={L} />}
              {L >= 5 && L !== 6 && <BowTie level={L} />}
              {L >= 9 && <Chain />}
            </>,
            mounts.neck.group,
          )}
      </>
    )
  }, [mounts, level, kind])
}
