import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { Mat } from './Mat'
import { waxTexture } from './textures'

export type Look = {
  skin: string
  top: string
  topWax?: boolean
  bottom: string
  head?: 'cap' | 'scarf' | 'hair' | 'braids'
  headColor?: string
  apron?: boolean
}

export type Mood = 'happy' | 'neutral' | 'sad'

/** A smooth body of revolution from a [radius, height] profile (torso, limbs…). */
function lathe(profile: [number, number][], seg = 28) {
  const g = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y)),
    seg,
  )
  g.computeVertexNormals()
  return g
}

/** Smooth tapered limb hanging down from its joint (y = 0), rounded at both ends. */
function limb(r1: number, r2: number, len: number) {
  const p: [number, number][] = []
  const n = 8
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2)
    p.push([Math.sin(a) * r2, -len + r2 - Math.cos(a) * r2])
  }
  for (let i = 1; i < 6; i++) {
    const t = i / 6
    p.push([r2 + (r1 - r2) * t + Math.sin(t * Math.PI) * 0.006, -len + r2 + (len - r1 - r2) * t])
  }
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2)
    p.push([Math.cos(a) * r1, -r1 + Math.sin(a) * r1])
  }
  return lathe(p, 20)
}

// Body heights (m). A grown-up stylised person, ~1.7 m: head a bit big, like an animated film.
const HIP = 0.84
const SHOULDER = 1.33
const HEAD = 1.56

/**
 * A person with smooth, rounded shapes: shaped torso, tapered arms and legs, hands with a thumb,
 * a sculpted face (eyes with iris and eyelids, nose, lips, eyebrows) and several head styles.
 * `walking` swings legs and arms, `chopping` moves the right arm, `mood` changes brows and mouth.
 */
export function Person({ look, walking = false, chopping = false, mood = 'happy', ...group }: { look: Look; walking?: boolean; chopping?: boolean; mood?: Mood } & ThreeElements['group']) {
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const lids = useRef<THREE.Group>(null)
  const seed = useRef(Math.random() * 10)

  const geo = useMemo(
    () => ({
      torso: lathe([
        [0.0, -0.02],
        [0.15, 0.0],
        [0.175, 0.08],
        [0.165, 0.18],
        [0.15, 0.26],
        [0.165, 0.36],
        [0.17, 0.43],
        [0.15, 0.48],
        [0.09, 0.52],
        [0.0, 0.53],
      ]),
      thigh: limb(0.082, 0.062, 0.42),
      shin: limb(0.06, 0.045, 0.4),
      upper: limb(0.054, 0.045, 0.28),
      fore: limb(0.044, 0.035, 0.25),
      neck: limb(0.05, 0.052, 0.14),
    }),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed.current
    const swing = walking ? Math.sin(t * 8) * 0.55 : 0
    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    if (armL.current) armL.current.rotation.x = -swing * 0.7
    if (armR.current) armR.current.rotation.x = chopping ? -0.9 + Math.abs(Math.sin(t * 9)) * 0.5 : swing * 0.7
    if (body.current) body.current.position.y = walking ? Math.abs(Math.sin(t * 8)) * 0.03 : Math.sin(t * 1.8) * 0.004
    if (head.current) {
      head.current.rotation.y = walking ? 0 : Math.sin(t * 0.5) * 0.18
      head.current.rotation.x = walking ? 0 : Math.sin(t * 0.37) * 0.05
    }
    if (lids.current) lids.current.position.y = t % 4.1 < 0.13 ? -0.012 : 0
  })

  const wax = look.topWax ? waxTexture(look.top) : undefined
  const shirt = look.topWax ? '#ffffff' : look.top
  const lip = useMemo(() => new THREE.Color(look.skin).multiplyScalar(0.62).lerp(new THREE.Color('#7a2e2e'), 0.25), [look.skin])
  const hc = look.headColor ?? '#1b1110'

  const leg = (side: number, r: React.RefObject<THREE.Group | null>) => (
    <group ref={r} position={[side * 0.085, HIP, 0]}>
      <mesh geometry={geo.thigh} castShadow>
        <Mat color={look.bottom} rough={0.85} />
      </mesh>
      <group position={[0, -0.4, 0]} rotation={[walking ? 0.15 : 0.02, 0, 0]}>
        <mesh geometry={geo.shin} castShadow>
          <Mat color={look.bottom} rough={0.85} />
        </mesh>
        <mesh castShadow position={[0, -0.39, 0.035]} scale={[1, 0.62, 1.75]}>
          <sphereGeometry args={[0.062, 20, 14]} />
          <Mat color="#3b2a20" rough={0.45} />
        </mesh>
      </group>
    </group>
  )

  const arm = (side: number, r: React.RefObject<THREE.Group | null>) => (
    <group ref={r} position={[side * 0.2, SHOULDER - 0.05, 0]} rotation={[0, 0, side * 0.1]}>
      <mesh geometry={geo.upper} castShadow>
        <Mat color={shirt} map={wax} rough={0.8} />
      </mesh>
      <group position={[0, -0.26, 0]} rotation={[-0.25, 0, 0]}>
        <mesh geometry={geo.fore} castShadow>
          <Mat color={look.skin} rough={0.55} />
        </mesh>
        <group position={[0, -0.27, 0.005]}>
          <mesh castShadow scale={[0.75, 1.1, 0.5]}>
            <sphereGeometry args={[0.045, 18, 14]} />
            <Mat color={look.skin} rough={0.55} />
          </mesh>
          <mesh castShadow position={[-side * 0.028, 0.01, 0.018]} rotation={[0.3, 0, side * 0.6]} scale={[0.45, 1, 0.45]}>
            <sphereGeometry args={[0.03, 12, 10]} />
            <Mat color={look.skin} rough={0.55} />
          </mesh>
        </group>
      </group>
      {/* sleeve end */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.05, 0.053, 0.08, 18]} />
        <Mat color={shirt} map={wax} rough={0.8} />
      </mesh>
    </group>
  )

  return (
    <group {...group}>
      <group ref={body}>
        {leg(-1, legL)}
        {leg(1, legR)}
        <mesh geometry={geo.torso} position={[0, HIP - 0.03, 0]} scale={[1, 1, 0.72]} castShadow>
          <Mat color={shirt} map={wax} rough={0.8} />
        </mesh>
        <mesh position={[0, HIP + 0.02, 0]} scale={[1, 1, 0.72]} castShadow>
          <cylinderGeometry args={[0.176, 0.16, 0.12, 28]} />
          <Mat color={look.bottom} rough={0.85} />
        </mesh>
        {look.apron && (
          <mesh castShadow position={[0, HIP + 0.12, 0.0]} scale={[1.03, 1, 0.76]}>
            <cylinderGeometry args={[0.172, 0.18, 0.5, 28, 1, true, -Math.PI / 2.6, Math.PI / 1.3]} />
            <Mat color="#fff4e6" rough={0.9} side={2} />
          </mesh>
        )}
        {arm(-1, armL)}
        {arm(1, armR)}
        <mesh geometry={geo.neck} position={[0, HEAD - 0.06, 0]} castShadow>
          <Mat color={look.skin} rough={0.55} />
        </mesh>

        <group ref={head} position={[0, HEAD, 0]}>
          <mesh castShadow scale={[0.9, 1.06, 0.96]}>
            <sphereGeometry args={[0.15, 48, 36]} />
            <Mat color={look.skin} rough={0.5} />
          </mesh>
          {/* jaw and cheeks, so the face isn't a ball */}
          <mesh position={[0, -0.055, 0.03]} scale={[0.82, 0.6, 0.85]}>
            <sphereGeometry args={[0.13, 32, 24]} />
            <Mat color={look.skin} rough={0.5} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={`ear${s}`} position={[s * 0.133, 0.0, -0.005]} scale={[0.4, 1, 0.7]}>
              <sphereGeometry args={[0.035, 16, 12]} />
              <Mat color={look.skin} rough={0.5} />
            </mesh>
          ))}
          {/* eyes: white, brown iris, pupil, catch-light */}
          {[-1, 1].map((s) => (
            <group key={`eye${s}`} position={[s * 0.052, 0.018, 0.122]} rotation={[0, s * 0.18, 0]}>
              <mesh scale={[1, 1.1, 0.6]}>
                <sphereGeometry args={[0.028, 24, 18]} />
                <meshPhysicalMaterial color="#fbf7f2" roughness={0.15} clearcoat={1} />
              </mesh>
              <mesh position={[0, -0.002, 0.014]} scale={[1, 1.08, 0.4]}>
                <sphereGeometry args={[0.018, 20, 16]} />
                <meshPhysicalMaterial color="#4a2611" roughness={0.2} clearcoat={1} />
              </mesh>
              <mesh position={[0, -0.002, 0.02]} scale={[1, 1, 0.4]}>
                <sphereGeometry args={[0.009, 14, 10]} />
                <meshBasicMaterial color="#0b0604" />
              </mesh>
              <mesh position={[0.006, 0.007, 0.024]}>
                <sphereGeometry args={[0.0042, 8, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}
          {/* upper eyelids (they blink) */}
          <group ref={lids}>
            {[-1, 1].map((s) => (
              <mesh key={`lid${s}`} position={[s * 0.052, 0.03, 0.12]} rotation={[-0.5, s * 0.18, 0]} scale={[1.1, 0.5, 0.7]}>
                <sphereGeometry args={[0.03, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <Mat color={look.skin} rough={0.5} />
              </mesh>
            ))}
          </group>
          {[-1, 1].map((s) => (
            <mesh key={`brow${s}`} position={[s * 0.054, 0.062, 0.13]} rotation={[-0.25, s * 0.2, Math.PI * 0.125 + s * (mood === 'sad' ? -0.3 : mood === 'neutral' ? 0.05 : 0.12)]}>
              <torusGeometry args={[0.03, 0.0055, 6, 16, Math.PI * 0.75]} />
              <Mat color="#140b07" rough={0.9} />
            </mesh>
          ))}
          {/* nose */}
          <mesh position={[0, -0.018, 0.142]} scale={[1.2, 0.85, 0.9]}>
            <sphereGeometry args={[0.022, 18, 14]} />
            <Mat color={look.skin} rough={0.45} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={`nos${s}`} position={[s * 0.016, -0.026, 0.135]}>
              <sphereGeometry args={[0.012, 12, 10]} />
              <Mat color={look.skin} rough={0.45} />
            </mesh>
          ))}
          {/* lips + mouth line */}
          <group position={[0, -0.072, 0.125]}>
            <mesh position={[0, 0.006, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.55, 1, 0.6]}>
              <capsuleGeometry args={[0.011, 0.032, 6, 12]} />
              <Mat color={lip} rough={0.35} />
            </mesh>
            <mesh position={[0, -0.008, 0.001]} rotation={[0, 0, Math.PI / 2]} scale={[0.7, 1, 0.65]}>
              <capsuleGeometry args={[0.012, 0.028, 6, 12]} />
              <Mat color={lip} rough={0.35} />
            </mesh>
            {mood !== 'neutral' && (
              <mesh position={[0, mood === 'happy' ? 0.014 : -0.024, 0.01]} rotation={[0, 0, mood === 'happy' ? Math.PI : 0]}>
                <torusGeometry args={[0.024, 0.0035, 6, 16, Math.PI]} />
                <meshBasicMaterial color="#2a0f0c" />
              </mesh>
            )}
          </group>
          <Headwear kind={look.head} color={hc} />
        </group>
      </group>
    </group>
  )
}

function Headwear({ kind, color }: { kind?: Look['head']; color: string }) {
  if (kind === 'cap')
    return (
      <group position={[0, 0.04, 0]} rotation={[-0.1, 0, 0]}>
        <mesh castShadow scale={[0.95, 0.72, 1]}>
          <sphereGeometry args={[0.158, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Mat color={color} rough={0.75} />
        </mesh>
        <mesh castShadow position={[0, 0.005, 0.15]} rotation={[0.18, 0, 0]} scale={[1, 1, 0.75]}>
          <cylinderGeometry args={[0.11, 0.115, 0.012, 32, 1, false, -Math.PI / 2, Math.PI]} />
          <Mat color={color} rough={0.75} />
        </mesh>
        <mesh position={[0, 0.115, 0]}>
          <sphereGeometry args={[0.012, 10, 8]} />
          <Mat color={color} rough={0.75} />
        </mesh>
      </group>
    )
  if (kind === 'scarf') {
    // a wax headwrap (foulard) with folds and a knot
    const wax = waxTexture(color)
    return (
      <group position={[0, 0.045, -0.015]}>
        <mesh castShadow scale={[0.98, 0.95, 1.02]}>
          <sphereGeometry args={[0.16, 36, 20, 0, Math.PI * 2, 0, Math.PI / 1.85]} />
          <Mat color="#ffffff" map={wax} rough={0.8} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} castShadow position={[0, 0.09 + i * 0.035, -0.02 - i * 0.012]} rotation={[Math.PI / 2 + 0.25 + i * 0.1, 0, 0]} scale={[1 - i * 0.16, 0.95 - i * 0.12, 0.55]}>
            <torusGeometry args={[0.1, 0.045, 14, 32]} />
            <Mat color="#ffffff" map={wax} rough={0.8} />
          </mesh>
        ))}
        <mesh castShadow position={[0.05, 0.2, -0.06]} rotation={[0.2, 0, -0.5]} scale={[1, 0.7, 0.8]}>
          <sphereGeometry args={[0.055, 18, 14]} />
          <Mat color="#ffffff" map={wax} rough={0.8} />
        </mesh>
      </group>
    )
  }
  if (kind === 'braids')
    return (
      <group>
        <mesh position={[0, 0.02, -0.008]} scale={[0.94, 1.02, 1.0]}>
          <sphereGeometry args={[0.158, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2.05]} />
          <Mat color={color} rough={0.6} />
        </mesh>
        {Array.from({ length: 14 }, (_, i) => {
          const a = Math.PI * (0.2 + (i / 13) * 1.6)
          return (
            <group key={i} position={[Math.cos(a) * 0.135, 0.0, -Math.abs(Math.sin(a)) * 0.125 - 0.01]} rotation={[0.15, 0, Math.cos(a) * 0.15]}>
              <mesh castShadow position={[0, -0.12, 0]}>
                <capsuleGeometry args={[0.013, 0.24, 4, 10]} />
                <Mat color={color} rough={0.6} />
              </mesh>
              <mesh position={[0, -0.26, 0]}>
                <sphereGeometry args={[0.014, 10, 8]} />
                <meshPhysicalMaterial color="#e8b04a" roughness={0.25} metalness={0.6} />
              </mesh>
            </group>
          )
        })}
      </group>
    )
  if (kind === 'hair')
    return (
      <mesh position={[0, 0.03, -0.006]} scale={[0.93, 0.98, 0.99]}>
        <sphereGeometry args={[0.157, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2.5]} />
        <Mat color={color} rough={0.95} />
      </mesh>
    )
  return null
}
