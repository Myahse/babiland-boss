import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { signTexture } from '../three/textures'
import { burst, fly } from './fx'
import { V } from './layout'
import { levelOf } from './places'
import { CashPile, Flat, Pad } from './Props'
import { sfx } from './sfx'
import { popText, totalServed, useArcade } from './store'
import { SIDE, SIDE_MAX, SIDE_PAD, SIDE_POS, sideCap, sidePerMin, sidePrice } from './side'
import { ToonPerson } from './ToonPerson'
import { useVip } from './vip'
import { missionEvent } from './missions'
import { others } from './profile'
import type { PersonId } from '../three/RealPerson'

// The three small businesses on the pavement of the maquis (side.ts): pads to open and improve them, the stands
// with their seller, the money they make piling up on the counter of the stand.

const SELLER: PersonId[] = ['koffi', 'yao', 'awa']
const up = (v: THREE.Vector3, y: number) => v.clone().add(new THREE.Vector3(0, y, 0))

export function SideStands({ player }: { player: { pos: THREE.Vector3 } }) {
  const side = useArcade((s) => s.side)
  const sidePaid = useArcade((s) => s.sidePaid)
  const sideCash = useArcade((s) => s.sideCash)
  const place = useArcade((s) => s.current)
  const level = useArcade((s) => levelOf(totalServed(s)))
  const stage = useArcade((s) => s.stage)
  const buyer = useRef(0)

  useFrame((_, raw) => {
    if (useVip.getState().open) return
    const dt = Math.min(raw, 0.1)
    const st = useArcade.getState()
    const lvl = levelOf(totalServed(st))
    let money = st.money
    const cash = [...st.sideCash]
    const paid = [...st.sidePaid]
    const lv = [...st.side]
    let changed = false
    // the stands sell by themselves
    buyer.current -= dt
    const sale = buyer.current <= 0
    if (sale) buyer.current = 1.2 + Math.random() * 1.5
    lv.forEach((l, i) => {
      if (!l) return
      const cap = sideCap(st.current, i, l)
      if (cash[i] < cap) {
        cash[i] = Math.min(cap, cash[i] + (sidePerMin(st.current, i, l) / 60) * dt)
        // someone walking past buys: a coin flies from the street to the stand
        if (sale && Math.random() < 0.5) fly('cash', V(SIDE_POS[i].x + (Math.random() - 0.5) * 3, 6.0), up(SIDE_POS[i], 1.0), 0, 0.5)
      }
      // walk past to pick the money up
      if (cash[i] >= 1 && player.pos.distanceTo(SIDE_POS[i]) < 1.25) {
        const v = Math.floor(cash[i])
        for (let k = 0; k < Math.min(8, Math.ceil(v / 150)); k++) fly('cash', up(SIDE_POS[i], 1.0), up(player.pos, 1.0), k * 0.05, 0.35)
        money += v
        cash[i] -= v
        popText(`${SIDE[i].icon} +${v} FCFA`)
        missionEvent('stand', v)
        sfx.cash()
        changed = true
      }
      if (Math.floor(cash[i]) !== Math.floor(st.sideCash[i])) changed = true
    })
    // the pads: open a stand, then improve it
    SIDE_PAD.forEach((pad, i) => {
      if (lv[i] >= SIDE_MAX || st.stage < 1 || lvl < SIDE[i].level || money <= 0 || player.pos.distanceTo(pad) > 0.6) return
      const price = sidePrice(i, lv[i])
      const give = Math.min(money, Math.ceil((price / 1.4) * dt), price - paid[i])
      money -= give
      paid[i] += give
      changed = true
      if (paid[i] >= price) {
        paid[i] = 0
        lv[i]++
        missionEvent('unlock')
        popText(lv[i] === 1 ? `Nouveau business : ${SIDE[i].name} !` : `${SIDE[i].short} niveau ${lv[i]} !`)
        burst(up(SIDE_POS[i], 0.5))
        sfx.unlock()
      }
    })
    if (changed) useArcade.setState({ money, sideCash: cash, sidePaid: paid, side: lv })
  })

  return (
    <>
      {SIDE.map((b, i) => (
        <group key={i}>
          {side[i] ? (
            <Stand i={i} level={side[i]} cash={sideCash[i]} full={sideCash[i] >= sideCap(place, i, side[i]) - 1} />
          ) : (
            <Planter position={SIDE_POS[i]} />
          )}
          {side[i] < SIDE_MAX && stage >= 1 && (
            <Pad
              label={level < b.level ? `🔒 ${b.short} · niv ${b.level}` : side[i] ? `${b.short} · niv ${side[i] + 1}` : b.name}
              price={sidePrice(i, side[i])}
              left={sidePrice(i, side[i]) - sidePaid[i]}
              position={SIDE_PAD[i]}
            />
          )}
        </group>
      ))}
    </>
  )
}

function Planter(props: { position: THREE.Vector3 }) {
  return (
    <group {...props}>
      <RoundedBox args={[0.6, 0.4, 0.6]} radius={0.05} position={[0, 0.2, 0]} castShadow>
        <Flat color="#868e96" />
      </RoundedBox>
      <mesh position={[0, 0.6, 0]} castShadow>
        <icosahedronGeometry args={[0.38, 0]} />
        <Flat color="#40c057" />
      </mesh>
    </group>
  )
}

/** One stand: a table under a parasol, the sign, what it sells, the seller behind, the money on the counter. */
function Stand({ i, level, cash, full }: { i: number; level: number; cash: number; full: boolean }) {
  const b = SIDE[i]
  const sign = useMemo(() => signTexture(b.short.toUpperCase(), b.color), [b])
  const smoke = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const g = smoke.current
    if (!g) return
    g.children.forEach((c, k) => {
      const t = (clock.elapsedTime * 0.6 + k / 3) % 1
      c.position.set(Math.sin(t * 6 + k) * 0.08, 1.0 + t * 0.9, 0)
      c.scale.setScalar(0.08 + t * 0.18)
      ;((c as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.55 * (1 - t)
    })
  })
  const place = useArcade((s) => s.current)
  return (
    <group position={SIDE_POS[i]}>
      {/* the seller, behind the table, facing the shop (and the camera) */}
      <ToonPerson who={others(SELLER)[i]} moving={false} position={[0, 0, -0.45]} rotation={[0, 0, 0]} scale={1.1} />
      {/* table */}
      <RoundedBox args={[1.15, 0.08, 0.6]} radius={0.03} position={[0, 0.72, 0.05]} castShadow receiveShadow>
        <Flat color="#c08552" />
      </RoundedBox>
      <mesh position={[0, 0.35, 0.05]} castShadow>
        <boxGeometry args={[1.05, 0.7, 0.5]} />
        <Flat color="#a0673a" />
      </mesh>
      <mesh position={[0, 0.42, 0.31]}>
        <planeGeometry args={[0.95, 0.24]} />
        <meshStandardMaterial map={sign} roughness={0.6} />
      </mesh>
      {/* a tall sign board behind the seller, seen from the street and from the shop */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 1.1, -0.85]}>
          <cylinderGeometry args={[0.03, 0.03, 2.2, 6]} />
          <Flat color="#6b4226" />
        </mesh>
      ))}
      <mesh position={[0, 2.05, -0.84]} castShadow>
        <boxGeometry args={[1.15, 0.42, 0.05]} />
        <Flat color={b.color} />
      </mesh>
      <mesh position={[0, 2.05, -0.81]}>
        <planeGeometry args={[1.05, 0.34]} />
        <meshStandardMaterial map={sign} roughness={0.6} />
      </mesh>
      {/* what it sells */}
      {b.look === 'the' && (
        <group position={[-0.25, 0.76, 0.05]}>
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.1, 0.16, 10]} />
            <Flat color="#495057" />
          </mesh>
          <mesh position={[0, 0.24, 0]} castShadow>
            <sphereGeometry args={[0.1, 12, 10]} />
            <meshStandardMaterial color="#1c7ed6" metalness={0.5} roughness={0.3} />
          </mesh>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[0.25 + (k % 2) * 0.12, 0.05, -0.08 + Math.floor(k / 2) * 0.14]}>
              <cylinderGeometry args={[0.035, 0.03, 0.1, 8]} />
              <meshStandardMaterial color="#e67700" transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
      )}
      {b.look === 'choukouya' && (
        <group position={[-0.15, 0.76, 0.05]}>
          <RoundedBox args={[0.6, 0.12, 0.32]} radius={0.03} position={[0, 0.06, 0]} castShadow>
            <Flat color="#343a40" />
          </RoundedBox>
          <mesh position={[0, 0.125, 0]}>
            <boxGeometry args={[0.52, 0.01, 0.26]} />
            <meshStandardMaterial color="#ff6b00" emissive="#ff4800" emissiveIntensity={0.8} />
          </mesh>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[-0.18 + k * 0.12, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.24, 6]} />
              <Flat color="#8b3a0e" />
            </mesh>
          ))}
        </group>
      )}
      {b.look === 'bissap' && (
        <group position={[-0.2, 0.76, 0.05]}>
          <RoundedBox args={[0.42, 0.26, 0.3]} radius={0.04} position={[0, 0.13, 0]} castShadow>
            <Flat color="#1c7ed6" />
          </RoundedBox>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[0.32 + k * 0.1, 0.1, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
              <meshStandardMaterial color={['#a61e4d', '#f2c94c', '#a61e4d'][k]} roughness={0.2} />
            </mesh>
          ))}
        </group>
      )}
      {b.look !== 'bissap' && (
        <group ref={smoke} position={[-0.2, 0, 0.05]}>
          {[0, 1, 2].map((k) => (
            <mesh key={k}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color="#f1f3f5" transparent opacity={0.4} depthWrite={false} />
            </mesh>
          ))}
        </group>
      )}
      {/* stars: the level of the stand */}
      {Array.from({ length: level }, (_, k) => (
        <mesh key={k} position={[-0.3 + k * 0.15, 0.6, 0.32]}>
          <circleGeometry args={[0.05, 5]} />
          <meshBasicMaterial color="#ffd43b" />
        </mesh>
      ))}
      <CashPile amount={cash} position={[0.35, 0.78, 0.1]} scale={0.6} />
      {full && <FullSign place={place} />}
    </group>
  )
}

/** « PLEIN » bobbing over a stand whose money is waiting: come and collect it */
function FullSign({ place }: { place: string }) {
  const g = useRef<THREE.Group>(null)
  const tex = useMemo(() => signTexture('PLEIN !', '#e03131'), [])
  useFrame(({ clock }) => {
    if (g.current) g.current.position.y = 2.7 + Math.sin(clock.elapsedTime * 4) * 0.08
  })
  return (
    <Billboard ref={g} position={[0, 2.7, 0]} key={place}>
      <mesh>
        <planeGeometry args={[0.9, 0.22]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </Billboard>
  )
}
