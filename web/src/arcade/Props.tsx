import { useContext, useMemo, useRef } from 'react'
import { DishCtx, DISHES, type Dish } from './places'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { signTexture } from '../three/textures'

// The arcade-idle look: chunky simple shapes, flat-shaded facets, bright saturated colours,
// a slightly glossy "plastic toy" finish.

export function Flat({ color, ...rest }: { color: THREE.ColorRepresentation } & ThreeElements['meshStandardMaterial']) {
  return <meshStandardMaterial color={color} flatShading roughness={0.45} metalness={0} {...rest} />
}

/** One plate of the dish of the maquis you are in (garba, alloco, choukouya, braised fish, kedjenou, tô…). */
export function Plate({ dish, ...props }: { dish?: Dish } & ThreeElements['group']) {
  const main = useContext(DishCtx)
  const d = DISHES[dish ?? main]
  // drinks come in a cup on a small saucer instead of a plate of food
  if (d.look === 'drink')
    return (
      <group {...props}>
        <mesh castShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.03, 10]} />
          <Flat color="#ffffff" />
        </mesh>
        <mesh castShadow position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.11, 10]} />
          <meshStandardMaterial color="#e7f5ff" roughness={0.1} transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, 0.065, 0]}>
          <cylinderGeometry args={[0.052, 0.046, 0.085, 10]} />
          <Flat color={d.color!} />
        </mesh>
      </group>
    )
  return (
    <group {...props}>
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.12, 0.035, 10]} />
        <Flat color="#ffffff" />
      </mesh>
      <DishOnPlate dish={d.look} color={d.color} sauceColor={d.sauce} />
    </group>
  )
}

function DishOnPlate({ dish, color = '#ffffff', sauceColor = '#c2410c' }: { dish: string; color?: string; sauceColor?: string }) {
  const mound = (color: string, x = 0, s = 1) => (
    <mesh position={[x, 0.035, 0]} scale={[s, 0.55 * s, s]}>
      <icosahedronGeometry args={[0.075, 0]} />
      <Flat color={color} />
    </mesh>
  )
  const sauce = (color: string, r = 0.11) => (
    <mesh position={[0, 0.02, 0]}>
      <cylinderGeometry args={[r, r, 0.012, 10]} />
      <Flat color={color} />
    </mesh>
  )
  const chunk = (color: string, x: number, z: number, s = 0.05) => (
    <mesh key={`${x}${z}`} position={[x, 0.045, z]} rotation={[0, x * 9, 0.2]}>
      <boxGeometry args={[s, s * 0.7, s * 0.8]} />
      <Flat color={color} />
    </mesh>
  )
  const piment = (
    <mesh position={[-0.07, 0.05, 0.06]}>
      <cylinderGeometry args={[0.022, 0.022, 0.012, 6]} />
      <Flat color="#ff3b30" />
    </mesh>
  )
  switch (dish) {
    case 'alloco': // fried plantain slices
      return (
        <>
          {[-0.06, 0, 0.06, -0.03, 0.03].map((x, i) => (
            <mesh key={i} position={[x, 0.03 + (i > 2 ? 0.02 : 0), i > 2 ? 0.04 : -0.02]} rotation={[0.2, 0, 0.1]}>
              <cylinderGeometry args={[0.032, 0.032, 0.018, 8]} />
              <Flat color={i % 2 ? '#f59f00' : '#e8890c'} />
            </mesh>
          ))}
          {piment}
        </>
      )
    case 'choukouya': // grilled mutton chunks with onions
      return (
        <>
          {[-0.05, 0.0, 0.05, 0.02].map((x, i) => chunk(i % 2 ? '#7a3e14' : '#5c2d0c', x, i === 3 ? 0.05 : -0.02))}
          <mesh position={[-0.06, 0.04, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.025, 0.007, 6, 10]} />
            <Flat color="#ffffff" />
          </mesh>
        </>
      )
    case 'poisson': // a whole braised fish
      return (
        <>
          {mound('#fff1c1', -0.06, 0.6)}
          <mesh position={[0.02, 0.04, 0]} scale={[1.6, 0.45, 0.7]}>
            <icosahedronGeometry args={[0.06, 0]} />
            <Flat color="#a0612a" />
          </mesh>
          <mesh position={[0.13, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.035, 0.05, 4]} />
            <Flat color="#8a4f1c" />
          </mesh>
        </>
      )
    case 'kedjenou': // chicken stewed in its red sauce
      return (
        <>
          {sauce('#c2410c')}
          {[-0.04, 0.04, 0].map((x, i) => (
            <mesh key={i} position={[x, 0.04, i === 2 ? 0.05 : -0.02]}>
              <sphereGeometry args={[0.032, 6, 5]} />
              <Flat color="#e0a060" />
            </mesh>
          ))}
        </>
      )
    case 'to': // tô with its sauce
      return (
        <>
          {sauce('#6b7d2a')}
          {mound('#f8f9fa', 0, 1.05)}
        </>
      )
    case 'kplala': // foutou banane and dark kplala sauce
      return (
        <>
          {sauce('#4a2a12')}
          <mesh position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.055, 8, 6]} />
            <Flat color="#ffd43b" />
          </mesh>
        </>
      )
    case 'feuille': // green leaf sauce with rice
      return (
        <>
          {sauce('#2b8a3e')}
          {mound('#ffffff', -0.03, 0.8)}
          {chunk('#7a3e14', 0.06, 0.02, 0.04)}
        </>
      )
    case 'meat': // pork, chicken… pieces with onion
      return (
        <>
          {[-0.05, 0.0, 0.05, 0.02].map((x, i) => chunk(color, x, i === 3 ? 0.05 : -0.02, 0.06))}
          <mesh position={[-0.07, 0.04, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.022, 0.007, 6, 10]} />
            <Flat color="#ffffff" />
          </mesh>
        </>
      )
    case 'balls': // claclo: little fried balls
      return (
        <>
          {[
            [-0.05, -0.02],
            [0.0, 0.03],
            [0.05, -0.02],
            [0.0, -0.05],
            [-0.03, 0.06],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.04 + (i === 4 ? 0.02 : 0), z]}>
              <sphereGeometry args={[0.03, 6, 5]} />
              <Flat color={i % 2 ? color : '#c8641c'} />
            </mesh>
          ))}
        </>
      )
    case 'mound': // foutou / rice with its sauce
      return (
        <>
          {sauce(sauceColor)}
          <mesh position={[0, 0.05, 0]}>
            <sphereGeometry args={[0.055, 8, 6]} />
            <Flat color={color} />
          </mesh>
        </>
      )
    default: // garba: attiéké, fried tuna, tomato
      return (
        <>
          {mound('#fff1c1', -0.03)}
          <mesh position={[0.06, 0.045, 0.02]} rotation={[0, 0.5, 0.2]}>
            <boxGeometry args={[0.07, 0.03, 0.05]} />
            <Flat color="#d9822b" />
          </mesh>
          <mesh position={[0.05, 0.045, -0.05]} rotation={[0, -0.3, -0.1]}>
            <boxGeometry args={[0.06, 0.03, 0.045]} />
            <Flat color="#c96b1c" />
          </mesh>
          {piment}
        </>
      )
  }
}

/** A pile of plates; `wobble` makes a carried stack sway like in the games. */
export function PlateStack({ count, dishes, dish, wobble = false, ...props }: { count: number; dishes?: Dish[]; dish?: Dish; wobble?: boolean } & ThreeElements['group']) {
  const ref = useRef<THREE.Group>(null)
  const pulse = useRef(0)
  const prev = useRef(count)
  if (prev.current !== count) {
    prev.current = count
    pulse.current = 1
  }
  useFrame(({ clock }, dt) => {
    if (!ref.current) return
    // a little squash-and-bounce each time a plate lands or leaves
    pulse.current = Math.max(0, pulse.current - dt * 5)
    const k = Math.sin(pulse.current * Math.PI) * 0.12
    ref.current.scale.set(1 + k, 1 - k * 0.6, 1 + k)
    if (!wobble) return
    ref.current.children.forEach((c, i) => {
      c.position.x = Math.sin(clock.elapsedTime * 7 + i * 0.3) * 0.006 * i
    })
  })
  return (
    <group ref={ref} {...props}>
      {Array.from({ length: count }, (_, i) => (
        <Plate key={i} dish={dishes?.[i] ?? dish} position={[0, i * 0.075, 0]} rotation={[0, i * 0.7, 0]} />
      ))}
    </group>
  )
}

/** Garba station: a steel cooker (pan + attiéké basin) and, in front, a red tray where the plates pile up in columns. */
export function Station({ plates, progress, level = 1, dish, ...props }: { plates: number; progress: number; level?: number; dish?: Dish } & ThreeElements['group']) {
  const fish = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (fish.current) fish.current.position.y = 0.06 + Math.abs(Math.sin(clock.elapsedTime * 6)) * 0.02
  })
  const per = [6, 8, 10][level - 1]
  const cols = [0, 1, 2].map((c) => Math.max(0, Math.min(per, plates - c * per)))
  return (
    <group {...props}>
      <RoundedBox args={[1.2, 0.85, 0.9]} radius={0.05} position={[0, 0.425, 0]} castShadow receiveShadow>
        <Flat color="#dfe3e8" />
      </RoundedBox>
      <mesh position={[0, 0.3, 0.452]}>
        <planeGeometry args={[1.0, 0.45]} />
        <Flat color="#e8432e" />
      </mesh>
      {[-0.3, 0, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.46]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.04, 8]} />
          <Flat color="#868e96" />
        </mesh>
      ))}
      <mesh position={[0, 0.87, 0]} receiveShadow>
        <boxGeometry args={[1.22, 0.04, 0.92]} />
        <Flat color="#495057" />
      </mesh>
      {/* back hood */}
      <mesh position={[0, 1.15, -0.42]} castShadow>
        <boxGeometry args={[1.2, 0.55, 0.08]} />
        <Flat color="#ced4da" />
      </mesh>
      <group position={[-0.25, 0.89, -0.05]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.24, 0.19, 0.08, 14]} />
          <Flat color="#2d3436" />
        </mesh>
        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.21, 14]} />
          <Flat color="#ffc93c" />
        </mesh>
        <group ref={fish}>
          <mesh position={[0.05, 0, 0]} rotation={[0, 0.4, 0]}>
            <boxGeometry args={[0.11, 0.045, 0.08]} />
            <Flat color="#c8641c" />
          </mesh>
          <mesh position={[-0.08, 0, 0.06]} rotation={[0, -0.5, 0]}>
            <boxGeometry args={[0.1, 0.045, 0.07]} />
            <Flat color="#d9822b" />
          </mesh>
        </group>
      </group>
      <group position={[0.32, 0.89, -0.05]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.19, 0.14, 0.13, 12]} />
          <Flat color="#4dabf7" />
        </mesh>
        <mesh position={[0, 0.07, 0]} scale={[1, 0.45, 1]}>
          <icosahedronGeometry args={[0.16, 1]} />
          <Flat color="#fff1c1" />
        </mesh>
      </group>
      {/* the red tray on the floor */}
      <group position={[0, 0, 1.0]}>
        <RoundedBox args={[1.2, 0.06, 0.75]} radius={0.03} position={[0, 0.03, 0]} receiveShadow>
          <Flat color="#e8432e" />
        </RoundedBox>
        {cols.map((n, c) => (n > 0 ? <PlateStack key={c} count={n} dish={dish} position={[(c - 1) * 0.36, 0.07, 0]} /> : null))}
      </group>
      <ProgressRing progress={progress} position={[0, 1.85, 0]} />
      {dish && (
        <mesh position={[0, 1.42, -0.37]}>
          <planeGeometry args={[1.1, 0.24]} />
          <meshBasicMaterial map={signTexture(DISHES[dish].label.toUpperCase(), '#2b1a12', '#ffe066', 384, 84)} toneMapped={false} />
        </mesh>
      )}
      {/* level badge: green arrows like the upgrade signs of the shop games */}
      <mesh position={[0.55, 1.85, 0]}>
        <planeGeometry args={[0.62, 0.26]} />
        <meshBasicMaterial map={signTexture(level >= 3 ? 'MAX' : `NIV ${level}`, level >= 3 ? '#e8432e' : '#2f9e44', '#fff', 256, 96)} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Round "cooking…" timer floating above a station. */
export function ProgressRing({ progress, ...props }: { progress: number } & ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh>
        <ringGeometry args={[0.16, 0.22, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.001]} rotation={[0, 0, Math.PI / 2]}>
        <ringGeometry args={[0.16, 0.22, 32, 1, 0, Math.max(0.001, progress) * Math.PI * 2]} />
        <meshBasicMaterial color="#51cf66" />
      </mesh>
    </group>
  )
}

/** The selling counter: red body, yellow top, a cash register, the plates waiting for customers. */
/** `stock[i]`: plates of `dishes[i]` waiting on the counter (main dish, then the particular dishes). */
export function Counter({ stock, dishes, name, dish = 'Garba', ...props }: { stock: number[]; dishes: Dish[]; name: string; dish?: string } & ThreeElements['group']) {
  return (
    <group {...props}>
      <RoundedBox args={[1.8, 0.95, 0.85]} radius={0.05} position={[0, 0.475, 0]} castShadow receiveShadow>
        <Flat color="#e8432e" />
      </RoundedBox>
      <RoundedBox args={[1.9, 0.08, 0.95]} radius={0.03} position={[0, 0.98, 0]} castShadow receiveShadow>
        <Flat color="#ffd43b" />
      </RoundedBox>
      <mesh position={[0, 0.55, 0.43]}>
        <planeGeometry args={[1.5, 0.36]} />
        <meshStandardMaterial map={signTexture(`${dish.toUpperCase()} CHEZ ${name.toUpperCase()}`, '#ffd43b', '#c92a2a', 768, 192)} roughness={0.5} />
      </mesh>
      {/* cash register */}
      <group position={[-0.62, 1.02, -0.12]}>
        <RoundedBox args={[0.42, 0.22, 0.32]} radius={0.03} position={[0, 0.11, 0]} castShadow>
          <Flat color="#343a40" />
        </RoundedBox>
        <mesh position={[0, 0.3, -0.05]} rotation={[-0.4, 0, 0]}>
          <boxGeometry args={[0.32, 0.2, 0.03]} />
          <Flat color="#212529" />
        </mesh>
      </group>
      {stock.map((n, i) => (n > 0 ? <PlateStack key={i} count={Math.min(n, 8)} dish={dishes[i]} position={[-0.15 + i * 0.36, 1.03, 0.05]} /> : null))}
    </group>
  )
}

/** Big green cash blocks piling up (3 x 3 per layer), waiting to be picked up. */
export function CashPile({ amount, ...props }: { amount: number } & ThreeElements['group']) {
  const n = Math.min(45, Math.ceil(amount / 200))
  return (
    <group {...props}>
      {Array.from({ length: n }, (_, i) => {
        const col = i % 3
        const row = Math.floor(i / 3) % 3
        const lvl = Math.floor(i / 9)
        return (
          <group key={i} position={[(col - 1) * 0.36, 0.09 + lvl * 0.17, (row - 1) * 0.21]}>
            <RoundedBox args={[0.34, 0.16, 0.19]} radius={0.025} castShadow>
              <Flat color="#69db3c" />
            </RoundedBox>
            <mesh position={[0, 0.0, 0]}>
              <boxGeometry args={[0.08, 0.165, 0.195]} />
              <Flat color="#f2e86d" />
            </mesh>
            <mesh position={[0.1, 0.081, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.04, 10]} />
              <Flat color="#4cb82a" />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function padTexture(label: string, left: number) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const r = (x: number, y: number, w: number, h: number, rad: number) => {
    g.beginPath()
    g.moveTo(x + rad, y)
    g.arcTo(x + w, y, x + w, y + h, rad)
    g.arcTo(x + w, y + h, x, y + h, rad)
    g.arcTo(x, y + h, x, y, rad)
    g.arcTo(x, y, x + w, y, rad)
    g.closePath()
  }
  r(8, 8, 240, 240, 40)
  g.fillStyle = '#e9b779'
  g.fill()
  g.setLineDash([26, 16])
  g.lineWidth = 12
  g.strokeStyle = '#ffffff'
  r(22, 22, 212, 212, 30)
  g.stroke()
  g.setLineDash([])
  g.textAlign = 'center'
  g.fillStyle = '#ffffff'
  g.strokeStyle = '#a0612a'
  g.lineWidth = 8
  g.font = '800 78px "Baloo 2", sans-serif'
  const t = left >= 1000 ? `${(left / 1000).toFixed(left % 1000 ? 1 : 0)}K` : String(left)
  g.strokeText(t, 128, 120)
  g.fillText(t, 128, 120)
  // a green bill
  g.fillStyle = '#69db3c'
  r(96, 140, 64, 40, 8)
  g.fill()
  g.fillStyle = '#f2e86d'
  g.fillRect(122, 140, 12, 40)
  g.font = '800 26px "Baloo 2", sans-serif'
  g.fillStyle = '#7a4a1e'
  g.fillText(label.toUpperCase(), 128, 218)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** An unlock / upgrade pad on the floor, like in the shop games: price, a bill, the name. It fills while you stand on it. */
export function Pad({ label, left, price, ...props }: { label: string; left: number; price: number } & ThreeElements['group']) {
  const tex = useMemo(() => padTexture(label, left), [label, left])
  const done = Math.max(0.001, 1 - left / price)
  return (
    <group {...props}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} receiveShadow>
        <planeGeometry args={[1.25, 1.25]} />
        <meshStandardMaterial map={tex} transparent roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0.66 - 0.04]}>
        <planeGeometry args={[1.1 * done, 0.07]} />
        <meshBasicMaterial color="#51cf66" />
      </mesh>
    </group>
  )
}

/** Square red and yellow table with two chairs; `cash` is the tip left on it, `plates` what is being eaten. */
export function SquareTable({ plates = 0, cash = 0, ...props }: { plates?: number; cash?: number } & ThreeElements['group']) {
  return (
    <group {...props}>
      <RoundedBox args={[0.95, 0.08, 0.8]} radius={0.03} position={[0, 0.74, 0]} castShadow receiveShadow>
        <Flat color="#e8432e" />
      </RoundedBox>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.0, 0.04, 0.85]} />
        <Flat color="#ffd43b" />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.6, 0.7, 0.5]} />
        <Flat color="#ffd43b" />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.68, 0, 0]} rotation={[0, (s * -Math.PI) / 2, 0]}>
          <RoundedBox args={[0.46, 0.08, 0.44]} radius={0.02} position={[0, 0.45, 0]} castShadow>
            <Flat color="#ffd43b" />
          </RoundedBox>
          <RoundedBox args={[0.46, 0.55, 0.07]} radius={0.02} position={[0, 0.72, -0.21]} castShadow>
            <Flat color="#e8432e" />
          </RoundedBox>
          {[-0.19, 0.19].map((x) =>
            [-0.18, 0.18].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.21, z]}>
                <boxGeometry args={[0.05, 0.42, 0.05]} />
                <Flat color="#c92a2a" />
              </mesh>
            )),
          )}
        </group>
      ))}
      {Array.from({ length: plates }, (_, i) => (
        <Plate key={i} position={[(i % 2 ? 0.22 : -0.22), 0.8, 0]} />
      ))}
      {cash > 0 && <CashPile amount={cash} position={[0, 0.78, 0]} scale={0.7} />}
    </group>
  )
}

/** Wooden planks for the floor of the maquis. */
export function woodTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#d9a066' : '#d19459'
    g.fillRect(0, i * 32, 256, 32)
    g.fillStyle = 'rgba(120,70,30,.35)'
    g.fillRect(0, i * 32, 256, 2)
    const off = (i * 97) % 256
    g.fillRect(off, i * 32, 2, 32)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(5, 5)
  return t
}

export function Palm({ s = 1, ...props }: { s?: number } & ThreeElements['group']) {
  return (
    <group scale={s} {...props}>
      <mesh castShadow position={[0, 1.2, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.1, 0.16, 2.4, 6]} />
        <Flat color="#b07d4f" />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} castShadow position={[Math.cos((i / 6) * Math.PI * 2) * 0.55, 2.35, Math.sin((i / 6) * Math.PI * 2) * 0.55]} rotation={[0, -(i / 6) * Math.PI * 2, -0.5]} scale={[1, 0.12, 0.35]}>
          <icosahedronGeometry args={[0.7, 0]} />
          <Flat color={i % 2 ? '#2fb344' : '#40c057'} />
        </mesh>
      ))}
    </group>
  )
}

