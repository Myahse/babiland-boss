import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../store'
import { fishColor } from '../three/Food'
import { gradientMap, INK } from '../three/toon'
import { PAN } from '../three/Stand'
import { resetMini, useMini } from './mini'

const OIL_Y = PAN[1] + 0.13
const PIECES: [number, number, number][] = [
  [-0.07, 0, -0.04],
  [0.06, 0, -0.05],
  [0, 0, 0.07],
]

/**
 * Frire : the fish cooks on one side, the gauge fills. Tap « Retourner » in the golden zone,
 * then « Sortir » when the second side is golden too. Too late and it burns.
 */
export function FryGame() {
  const fish = useRef<THREE.Group>(null)
  const mats = useMemo(() => PIECES.map(() => new THREE.MeshToonMaterial({ color: fishColor(0), gradientMap: gradientMap() })), [])
  const bubbles = useRef<THREE.InstancedMesh>(null)
  const side = useRef(0)
  const cook = useRef([0, 0])
  const scores = useRef<number[]>([])
  const flip = useRef(0)
  const done = useRef(false)
  const fonte = useGame((s) => s.upgrades.poele)
  const say = useGame((s) => s.say)
  const zone: [number, number] = fonte ? [0.52, 0.86] : [0.58, 0.8]
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(() => Array.from({ length: 40 }, () => [Math.random() * Math.PI * 2, Math.sqrt(Math.random()) * 0.17, Math.random()]), [])

  useEffect(() => {
    const tap = () => {
      if (done.current || flip.current > 0) return
      const c = cook.current[side.current]
      const mid = (zone[0] + zone[1]) / 2
      const half = (zone[1] - zone[0]) / 2
      const s = c >= zone[0] && c <= zone[1] ? 1 - (Math.abs(c - mid) / half) * 0.3 : Math.max(0, 0.6 - (Math.abs(c - mid) - half) * 2.5)
      scores.current.push(s)
      say(s >= 0.85 ? 'Bien doré !' : s >= 0.5 ? 'Pas mal !' : c < zone[0] ? 'Pas assez cuit !' : 'Ça a brûlé !', s >= 0.85 ? 'good' : s >= 0.5 ? 'ok' : 'bad')
      if (side.current === 0) {
        side.current = 1
        flip.current = 1
        useMini.getState().set({ action: 'Sortir !', hint: 'L’autre côté maintenant. Sors le poisson quand il est doré !' })
      } else finish()
    }
    useMini.getState().set({ hint: 'Le poisson frit. Retourne-le quand la jauge est dans le vert !', action: 'Retourner !', onTap: tap, gauge: 0, zone })
    return resetMini
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function finish() {
    done.current = true
    useMini.getState().set({ action: null })
    const avg = scores.current.reduce((a, b) => a + b, 0) / scores.current.length
    setTimeout(() => useGame.getState().finishFry(avg), 700)
  }

  useFrame(({ clock }, dt) => {
    if (!done.current && flip.current <= 0) {
      cook.current[side.current] += dt * (side.current ? 0.36 : 0.3)
      if (cook.current[side.current] > 1.15) {
        scores.current.push(0)
        say('Ça a brûlé !', 'bad')
        if (side.current === 0) {
          side.current = 1
          flip.current = 1
          useMini.getState().set({ action: 'Sortir !' })
        } else finish()
      }
    }
    useMini.getState().set({ gauge: Math.min(1.15, cook.current[side.current]) })
    // the face you see is the side that was down before the flip, so show the cooked side once flipped
    const shown = side.current === 0 ? cook.current[0] * 0.35 : cook.current[0]
    mats.forEach((m) => m.color.copy(fishColor(shown)))
    if (fish.current) {
      flip.current = Math.max(0, flip.current - dt * 2.5)
      const f = flip.current
      fish.current.position.y = OIL_Y + Math.sin(f * Math.PI) * 0.12
      fish.current.rotation.x = side.current === 1 ? (1 - f) * Math.PI : 0
    }
    // oil bubbles: lots while frying
    const b = bubbles.current
    if (b) {
      const t = clock.elapsedTime
      seeds.forEach(([a, r, o], i) => {
        const k = (t * 1.4 + o) % 1
        dummy.position.set(PAN[0] + Math.cos(a + t * 0.3) * r, OIL_Y + 0.002, PAN[2] + Math.sin(a + t * 0.3) * r)
        dummy.scale.setScalar(done.current ? 0.0001 : 0.004 + k * 0.008)
        dummy.updateMatrix()
        b.setMatrixAt(i, dummy.matrix)
      })
      b.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      <group ref={fish} position={[PAN[0], OIL_Y, PAN[2]]}>
        {PIECES.map((p, i) => (
          <RoundedBox key={i} args={[0.1, 0.04, 0.07]} radius={0.016} position={p} rotation={[0, i * 0.7, 0]} castShadow material={mats[i]}>
            <Outlines thickness={0.004} color={INK} />
          </RoundedBox>
        ))}
      </group>
      <instancedMesh ref={bubbles} args={[undefined, undefined, seeds.length]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#fff3bf" transparent opacity={0.8} />
      </instancedMesh>
    </group>
  )
}
