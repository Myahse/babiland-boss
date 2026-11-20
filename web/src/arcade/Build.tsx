import { useMemo, useRef } from 'react'
import { RoundButton } from './HudButton'
import { createPortal } from 'react-dom'
import { useFrame, useThree, type ThreeEvent, type ThreeElements } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { create } from 'zustand'
import { canPlace, DECOR, DEFAULT_LAYOUT, rectOf, snap, type Decor, type DecorKind, type Layout, type Piece } from './furniture'
import { BIN, COUNTER, STATIONS, TABLES, type Unlock } from './layout'
import { Flat, Palm } from './Props'
import { Lamp, PottedPlant } from './StreetDecor'
import { patternTexture, tier } from './looks'
import { gold } from './LookModels'
import { signTexture } from '../three/textures'
import { Icon } from './Icons'
import { popText, useArcade } from './store'
import { sfx } from './sfx'
import { camYaw } from './input'

// « Construire »: design your maquis yourself. Touch a piece (a stove, the counter, a table, the bin, a decoration)
// and slide it where you want; slide on the floor to move the view. Buy decorations and put them anywhere, turn
// them, take them away. A place that is taken, or where people could not get through, shows red.

const fcfa = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ')

type Build = { sel: Piece | null; ghost: { x: number; z: number; ok: boolean } | null; target: THREE.Vector3; catalogue: boolean }
export const useBuild = create<Build>(() => ({ sel: null, ghost: null, target: new THREE.Vector3(0, 0, 1), catalogue: false }))
if (import.meta.env.DEV) Object.assign(window, { useBuildDbg: useBuild })

const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const same = (a: Piece | null, b: Piece | null) => !!a && !!b && a.kind === b.kind && ('i' in a ? a.i === (b as typeof a).i : true) && ('id' in a ? a.id === (b as typeof a).id : true)

/** Every piece that can move, where it stands now (only the ones you have). */
function pieces(): { p: Piece; x: number; z: number; kind?: DecorKind }[] {
  const s = useArcade.getState()
  const out: { p: Piece; x: number; z: number; kind?: DecorKind }[] = []
  STATIONS.forEach((v, i) => {
    if (i === 0 || s.unlocks[(['pan2', 'plat1', 'plat2'] as Unlock[])[i - 1]]) out.push({ p: { kind: 'st', i }, x: v.x, z: v.z })
  })
  out.push({ p: { kind: 'counter' }, x: COUNTER.x, z: COUNTER.z })
  if (s.unlocks.table) TABLES.forEach((v, i) => out.push({ p: { kind: 'table', i }, x: v.x, z: v.z }))
  out.push({ p: { kind: 'bin' }, x: BIN.x, z: BIN.z })
  s.decor.forEach((d) => out.push({ p: { kind: 'decor', id: d.id }, x: d.x, z: d.z, kind: d.kind }))
  return out
}

const layoutNow = (): Layout => {
  const l = useArcade.getState().layout ?? DEFAULT_LAYOUT
  return { st: l.st.map((v) => [...v] as [number, number]), counter: [...l.counter] as [number, number], tables: l.tables.map((v) => [...v] as [number, number]), bin: [...l.bin] as [number, number] }
}

/** Put a piece at (x, z) in the saved design. */
function commit(p: Piece, x: number, z: number) {
  if (p.kind === 'decor') {
    useArcade.setState((s) => ({ decor: s.decor.map((d) => (d.id === p.id ? { ...d, x, z } : d)) }))
    return
  }
  const l = layoutNow()
  if (p.kind === 'st') l.st[p.i] = [x, z]
  else if (p.kind === 'counter') l.counter = [x, z]
  else if (p.kind === 'table') l.tables[p.i] = [x, z]
  else if (p.kind === 'bin') l.bin = [x, z]
  useArcade.setState({ layout: l })
}

// ------------------------------------------------------------------ in the 3D scene
/** The editor: a touch area on each piece, the floor to slide on, the red / green ghost, the camera from above. */
export function BuildEditor() {
  const building = useArcade((s) => s.building)
  const sel = useBuild((s) => s.sel)
  const ghost = useBuild((s) => s.ghost)
  useArcade((s) => s.layout)
  useArcade((s) => s.decor)
  const drag = useRef<{ p: Piece; dx: number; dz: number } | null>(null)
  const pan = useRef<{ x: number; z: number } | null>(null)
  const { camera, size } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    if (!useArcade.getState().building) return
    const t = useBuild.getState().target
    const far = size.width < size.height ? 1.45 : 1
    const k = 1 - Math.exp(-dt * 6)
    camera.position.lerp(new THREE.Vector3(t.x + 3.2 * far, 13 * far, t.z + 7.5 * far), k)
    look.lerp(t, k)
    camera.lookAt(look)
    camYaw.v = Math.atan2(3.2, 7.5)
  })
  if (!building) return null

  const all = pieces()
  const stairs = useArcade.getState().stage >= 2
  const start = (p: Piece, x: number, z: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    // where the finger points on the floor (not on top of the touch box), so the piece stays under the finger
    const g = e.ray.intersectPlane(FLOOR, new THREE.Vector3()) ?? e.point
    drag.current = { p, dx: g.x - x, dz: g.z - z }
    useBuild.setState({ sel: p, ghost: { x, z, ok: true } })
    sfx.pick()
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (drag.current) {
      const d = drag.current
      const x = snap(e.point.x - d.dx)
      const z = snap(e.point.z - d.dz)
      const others = all.filter((o) => !same(o.p, d.p))
      const kind = d.p.kind === 'decor' ? all.find((o) => same(o.p, d.p))?.kind : undefined
      useBuild.setState({ ghost: { x, z, ok: canPlace(d.p, x, z, others, stairs, kind) } })
    } else if (pan.current) {
      const t = useBuild.getState().target
      t.x = THREE.MathUtils.clamp(t.x - (e.point.x - pan.current.x) * 0.9, -5, 15)
      t.z = THREE.MathUtils.clamp(t.z - (e.point.z - pan.current.z) * 0.9, -2, 5)
    }
  }
  const end = () => {
    const d = drag.current
    const g = useBuild.getState().ghost
    if (d && g) {
      if (g.ok) {
        commit(d.p, g.x, g.z)
        sfx.drop()
      } else popText('Pas ici : la place est prise, ou les gens ne pourraient plus passer')
    }
    drag.current = null
    pan.current = null
    useBuild.setState({ ghost: null })
  }
  const selRect = (() => {
    const o = sel && all.find((a) => same(a.p, sel))
    if (!o) return null
    const g = ghost ?? { x: o.x, z: o.z, ok: true }
    return { r: rectOf(o.p, g.x, g.z, o.kind ? DECOR[o.kind].size : 0.35), ok: g.ok, moving: !!ghost }
  })()

  return (
    <group>
      {/* the floor to slide on (and to move the view) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[5, 0.02, 1]}
        onPointerDown={(e) => {
          e.stopPropagation()
          pan.current = { x: e.point.x, z: e.point.z }
          useBuild.setState({ sel: null })
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      >
        <planeGeometry args={[60, 40]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* the grid of the plot */}
      <gridHelper args={[10.5, 42, '#ffffff', '#ffffff']} position={[-0.25, 0.03, 1.05]} scale={[1, 1, 6.1 / 10.5]} material-transparent material-opacity={0.25} />
      {/* a touch area on each piece */}
      {all.map((o) => {
        const r = rectOf(o.p, o.x, o.z, o.kind ? DECOR[o.kind].size : 0.35)
        const key = o.p.kind + ('i' in o.p ? o.p.i : '') + ('id' in o.p ? o.p.id : '')
        const isSel = same(o.p, sel)
        return (
          <mesh key={key} position={[(r.x0 + r.x1) / 2, 0.6, (r.z0 + r.z1) / 2]} onPointerDown={start(o.p, o.x, o.z)} onPointerMove={move} onPointerUp={end}>
            <boxGeometry args={[r.x1 - r.x0, 1.2, r.z1 - r.z0]} />
            <meshBasicMaterial color={isSel ? '#ffd43b' : '#ffffff'} transparent opacity={isSel ? 0.18 : 0.06} depthWrite={false} />
          </mesh>
        )
      })}
      {/* where it would go: green, or red when it can't */}
      {selRect && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(selRect.r.x0 + selRect.r.x1) / 2, 0.05, (selRect.r.z0 + selRect.r.z1) / 2]}>
          <planeGeometry args={[selRect.r.x1 - selRect.r.x0, selRect.r.z1 - selRect.r.z0]} />
          <meshBasicMaterial color={selRect.ok ? '#40c057' : '#fa5252'} transparent opacity={selRect.moving ? 0.55 : 0.35} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// ------------------------------------------------------------------ the decorations
/** Your decorations, where you put them. */
export function DecorLayer() {
  const decor = useArcade((s) => s.decor)
  return (
    <>
      {decor.map((d) => (
        <group key={d.id} position={[d.x, 0, d.z]} rotation={[0, (d.rot * Math.PI) / 2, 0]}>
          <DecorModel kind={d.kind} />
        </group>
      ))}
    </>
  )
}

const waxTex = () => patternTexture(tier(7), '#ffd166', [1, 1])

/** The shape of each decoration (simple, chunky, in the colours of the game). */
export function DecorModel({ kind, ...props }: { kind: DecorKind } & ThreeElements['group']) {
  const neon = useMemo(() => (kind === 'neon' ? signTexture('MAQUIS', '#2b1a12', '#ff6bcb', 384, 128) : null), [kind])
  const fan = useRef<THREE.Group>(null)
  const water = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (fan.current) fan.current.rotation.z = clock.elapsedTime * 12
    if (water.current) water.current.scale.y = 1 + Math.sin(clock.elapsedTime * 6) * 0.1
  })
  return (
    <group {...props}>
      {kind === 'plante' && <PottedPlant />}
      {kind === 'palmier' && <Palm s={0.55} />}
      {kind === 'fleurs' && (
        <group>
          <RoundedBox args={[0.8, 0.3, 0.35]} radius={0.04} position={[0, 0.15, 0]} castShadow>
            <Flat color="#a0612a" />
          </RoundedBox>
          {[-0.28, -0.1, 0.08, 0.26].map((x, i) => (
            <group key={x} position={[x, 0.36, 0]}>
              <mesh>
                <sphereGeometry args={[0.1, 8, 6]} />
                <Flat color={['#ff6b6b', '#ffd43b', '#f783ac', '#ff922b'][i]} />
              </mesh>
              <mesh position={[0, -0.06, 0.06]}>
                <sphereGeometry args={[0.08, 6, 5]} />
                <Flat color="#40c057" />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {kind === 'banc' && (
        <group>
          <RoundedBox args={[1.1, 0.08, 0.38]} radius={0.02} position={[0, 0.45, 0]} castShadow>
            <Flat color="#a0612a" />
          </RoundedBox>
          <RoundedBox args={[1.1, 0.35, 0.06]} radius={0.02} position={[0, 0.7, -0.17]} castShadow>
            <Flat color="#a0612a" />
          </RoundedBox>
          {[-0.48, 0.48].map((x) => (
            <mesh key={x} position={[x, 0.22, 0]}>
              <boxGeometry args={[0.06, 0.44, 0.34]} />
              <Flat color="#5c3a1e" />
            </mesh>
          ))}
        </group>
      )}
      {kind === 'canape' && (
        <group>
          <RoundedBox args={[1.2, 0.3, 0.6]} radius={0.08} position={[0, 0.3, 0]} castShadow>
            <meshStandardMaterial map={waxTex()} roughness={0.8} />
          </RoundedBox>
          <RoundedBox args={[1.2, 0.5, 0.18]} radius={0.08} position={[0, 0.55, -0.24]} castShadow>
            <meshStandardMaterial map={waxTex()} roughness={0.8} />
          </RoundedBox>
          {[-0.58, 0.58].map((x) => (
            <RoundedBox key={x} args={[0.14, 0.42, 0.6]} radius={0.06} position={[x, 0.42, 0]} castShadow>
              <Flat color="#264653" />
            </RoundedBox>
          ))}
        </group>
      )}
      {kind === 'tapis' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
          <planeGeometry args={[1.4, 1.0]} />
          <meshStandardMaterial map={waxTex()} roughness={0.9} />
        </mesh>
      )}
      {(kind === 'masque' || kind === 'statue') && (
        <group>
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[0.36, 0.7, 0.36]} />
            <Flat color="#f1e3c8" />
          </mesh>
          {kind === 'masque' ? (
            <group position={[0, 1.0, 0]}>
              <mesh scale={[0.6, 1, 0.35]} castShadow>
                <sphereGeometry args={[0.28, 12, 10]} />
                <Flat color="#6b3e1f" />
              </mesh>
              {[-0.07, 0.07].map((x) => (
                <mesh key={x} position={[x, 0.06, 0.09]}>
                  <boxGeometry args={[0.08, 0.025, 0.02]} />
                  <Flat color="#f2c94c" />
                </mesh>
              ))}
              <mesh position={[0, -0.1, 0.1]}>
                <boxGeometry args={[0.03, 0.12, 0.02]} />
                <Flat color="#f2c94c" />
              </mesh>
            </group>
          ) : (
            <group position={[0, 0.7, 0]}>
              <mesh position={[0, 0.35, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.13, 0.7, 10]} />
                <Flat color="#5c3a1e" />
              </mesh>
              <mesh position={[0, 0.82, 0]} castShadow>
                <sphereGeometry args={[0.12, 10, 8]} />
                <Flat color="#5c3a1e" />
              </mesh>
            </group>
          )}
        </group>
      )}
      {kind === 'djembe' && (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 0.4, 14]} />
            <Flat color="#8b4513" />
          </mesh>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.12, 0.25, 14]} />
            <Flat color="#a0522d" />
          </mesh>
          <mesh position={[0, 0.63, 0]}>
            <cylinderGeometry args={[0.225, 0.225, 0.02, 14]} />
            <Flat color="#f1e3c8" />
          </mesh>
        </group>
      )}
      {kind === 'jarre' && (
        <group>
          <mesh position={[0, 0.3, 0]} scale={[1, 1.15, 1]} castShadow>
            <sphereGeometry args={[0.26, 14, 10]} />
            <Flat color="#c2683c" />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.12, 0.1, 0.12, 12]} />
            <Flat color="#a8552d" />
          </mesh>
        </group>
      )}
      {kind === 'tonneau' && (
        <group>
          <mesh position={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.8, 14]} />
            <Flat color="#8b5a2b" />
          </mesh>
          {[0.15, 0.65].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[0.31, 0.31, 0.05, 14]} />
              <Flat color="#495057" />
            </mesh>
          ))}
        </group>
      )}
      {kind === 'fontaine' && (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.6, 0.65, 0.4, 20]} />
            <Flat color="#e9ecef" />
          </mesh>
          <mesh position={[0, 0.39, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 0.03, 20]} />
            <meshStandardMaterial color="#4dabf7" roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.55, 10]} />
            <Flat color="#e9ecef" />
          </mesh>
          <mesh ref={water} position={[0, 1.0, 0]}>
            <sphereGeometry args={[0.14, 10, 8]} />
            <meshStandardMaterial color="#a5d8ff" transparent opacity={0.8} />
          </mesh>
        </group>
      )}
      {kind === 'lampadaire' && <Lamp scale={0.6} />}
      {kind === 'ventilo' && (
        <group>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.2, 0.22, 0.06, 14]} />
            <Flat color="#343a40" />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.15, 8]} />
            <Flat color="#868e96" />
          </mesh>
          <group position={[0, 1.2, 0.08]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.24, 0.015, 6, 20]} />
              <Flat color="#ced4da" />
            </mesh>
            <group ref={fan}>
              {[0, 1, 2].map((i) => (
                <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[0, 0, 0]}>
                  <boxGeometry args={[0.06, 0.4, 0.01]} />
                  <Flat color="#74c0fc" />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      )}
      {kind === 'neon' && neon && (
        <group>
          {[-0.45, 0.45].map((x) => (
            <mesh key={x} position={[x, 0.7, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
              <Flat color="#343a40" />
            </mesh>
          ))}
          <mesh position={[0, 1.35, 0.02]}>
            <planeGeometry args={[1.1, 0.38]} />
            <meshBasicMaterial map={neon} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
      {kind === 'parasol' && (
        <group>
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 2.0, 6]} />
            <Flat color="#868e96" />
          </mesh>
          <mesh position={[0, 2.0, 0]} castShadow>
            <coneGeometry args={[0.9, 0.4, 10]} />
            <Flat color="#e03131" />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.22, 0.24, 0.06, 12]} />
            <Flat color="#343a40" />
          </mesh>
        </group>
      )}
      {kind === 'statue' && (
        <mesh position={[0, 1.6, 0]} material={gold}>
          <sphereGeometry args={[0.03, 6, 5]} />
        </mesh>
      )}
    </group>
  )
}

// ------------------------------------------------------------------ the screen while building
export function BuildHud() {
  const sel = useBuild((s) => s.sel)
  const catalogue = useBuild((s) => s.catalogue)
  const decor = useArcade((s) => s.decor)
  const isDecor = sel?.kind === 'decor'
  const done = () => {
    useArcade.setState({ building: false })
    useBuild.setState({ sel: null, ghost: null, catalogue: false })
  }
  const rotate = () => {
    if (sel?.kind !== 'decor') return
    useArcade.setState((s) => ({ decor: s.decor.map((d) => (d.id === sel.id ? { ...d, rot: (d.rot + 1) % 4 } : d)) }))
    sfx.pick()
  }
  const remove = () => {
    if (sel?.kind !== 'decor') return
    const d = decor.find((x) => x.id === sel.id)
    if (!d) return
    const back = Math.round(DECOR[d.kind].price / 2)
    useArcade.setState((s) => ({ decor: s.decor.filter((x) => x.id !== sel.id), money: s.money + back }))
    useBuild.setState({ sel: null })
    popText(`Retiré : +${fcfa(back)} F (la moitié du prix)`)
  }
  const reset = () => {
    useArcade.setState({ layout: null })
    useBuild.setState({ sel: null })
    popText('Les meubles sont revenus à leur place de départ')
  }
  const label = !sel ? null : sel.kind === 'st' ? `Réchaud ${sel.i + 1}` : sel.kind === 'counter' ? 'Le comptoir' : sel.kind === 'table' ? `Table ${sel.i + 1}` : sel.kind === 'bin' ? 'La poubelle' : DECOR[decor.find((d) => d.id === sel.id)?.kind ?? 'plante'].label
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl border-[3px] border-[var(--color-ink)] bg-white/95 px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2 text-lg font-extrabold">
          <Icon name="hammer" size={24} /> Construire
          {label && <span className="ml-auto rounded-full bg-[#fff3bf] px-2 py-0.5 text-xs">{label}</span>}
        </div>
        <div className="text-xs font-semibold opacity-75">Touche un meuble et fais-le glisser. Glisse sur le sol pour bouger la vue. Rouge : la place est prise ou on ne passerait plus.</div>
      </div>
      <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-wrap justify-center gap-2">
        <button className="btn btn-green !px-3 !py-2 !text-sm" onClick={() => useBuild.setState({ catalogue: true })}>
          Décorations
        </button>
        <button className="btn !px-3 !py-2 !text-sm" disabled={!isDecor} onClick={rotate}>
          <Icon name="rotate" size={16} className="mr-1 align-[-3px]" />
          Tourner
        </button>
        <button className="btn !px-3 !py-2 !text-sm" disabled={!isDecor} onClick={remove}>
          Retirer
        </button>
        <button className="btn !px-3 !py-2 !text-sm" onClick={reset}>
          Remettre
        </button>
        <button className="btn btn-green !px-4 !py-2 !text-sm" onClick={done}>
          Terminer
        </button>
      </div>
      {catalogue && <Catalogue />}
    </div>,
    document.body,
  )
}

function Catalogue() {
  const money = useArcade((s) => s.money)
  const buy = (kind: DecorKind) => {
    const s = useArcade.getState()
    const price = DECOR[kind].price
    if (s.money < price) return
    // the first free place near the middle of the view
    const t = useBuild.getState().target
    const all = pieces()
    const stairs = s.stage >= 2
    let at: [number, number] | null = null
    for (let r = 0; r < 12 && !at; r++)
      for (let a = 0; a < Math.max(1, r * 6) && !at; a++) {
        const x = snap(t.x + Math.cos((a / Math.max(1, r * 6)) * Math.PI * 2) * r * 0.5)
        const z = snap(t.z + Math.sin((a / Math.max(1, r * 6)) * Math.PI * 2) * r * 0.5)
        if (canPlace({ kind: 'decor', id: '' }, x, z, all, stairs, kind)) at = [x, z]
      }
    if (!at) return popText('Plus de place libre ici : bouge la vue ou déplace un meuble')
    const d: Decor = { id: `${kind}-${Date.now().toString(36)}`, kind, x: at[0], z: at[1], rot: 0 }
    useArcade.setState({ money: s.money - price, decor: [...s.decor, d] })
    useBuild.setState({ sel: { kind: 'decor', id: d.id }, catalogue: false })
    sfx.unlock()
  }
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" onClick={() => useBuild.setState({ catalogue: false })}>
      <div className="card pop max-h-[80%] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">Décorations</h2>
          <button className="text-2xl font-extrabold" onClick={() => useBuild.setState({ catalogue: false })} aria-label="Fermer">
            <Icon name="cross" size={22} />
          </button>
        </div>
        <p className="text-sm font-semibold opacity-75">Mets-les où tu veux. Chaque décoration attire un peu plus de monde (+1 % de clients, jusqu’à 20).</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {(Object.keys(DECOR) as DecorKind[]).map((k) => (
            <button key={k} disabled={money < DECOR[k].price} className="flex items-center gap-2 rounded-xl border-2 border-[var(--color-ink)] bg-white px-2 py-1.5 text-left disabled:opacity-40" onClick={() => buy(k)}>
              <Icon name={DECOR[k].icon} size={28} />
              <span className="min-w-0 leading-tight">
                <span className="block text-xs font-extrabold">{DECOR[k].label}</span>
                <span className="block text-[11px] font-extrabold text-[#2b8a3e]">{fcfa(DECOR[k].price)} F</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** The button that opens « Construire » (in the maquis). */
export function BuildButton() {
  return (
    <RoundButton
      icon={<Icon name="hammer" size={28} />}
      label="Construire"
      color="#5f3dc4"
      onClick={() => {
        useArcade.setState({ building: true })
        useBuild.setState({ sel: null, target: new THREE.Vector3(-0.5, 0, 1) })
      }}
    />
  )
}
