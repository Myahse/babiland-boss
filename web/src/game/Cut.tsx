import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../store'
import { Sliceable, VEG_R, type Veg } from '../three/Food'
import { Mat } from '../three/Mat'
import { BOARD } from '../three/Stand'
import { resetMini, useMini } from './mini'

const VEGS: Veg[] = ['tomate', 'oignon']
const GUIDES = [-0.048, 0, 0.048]
const Y = BOARD[1] + 0.03 + VEG_R * 0.9

/**
 * Couper : the knife sweeps left and right above the tomato, then the onion. Tap to chop.
 * Chopping right on a dashed line is « Parfait ! ». Three cuts each.
 */
export function CutGame() {
  const knife = useRef<THREE.Group>(null)
  const [veg, setVeg] = useState(0)
  const [cuts, setCuts] = useState<number[]>([])
  const used = useRef<boolean[]>([false, false, false])
  const scores = useRef<number[]>([])
  const chop = useRef(0)
  const x = useRef(0)
  const t = useRef(0)
  const done = useRef(false)
  const sharp = useGame((s) => s.upgrades.couteau)
  const say = useGame((s) => s.say)

  useEffect(() => {
    useMini.getState().set({ hint: 'Coupe sur les pointillés ! Tape quand le couteau est au-dessus.', action: 'Couper !', onTap: () => tap() })
    return resetMini
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function tap() {
    if (done.current || chop.current > 0) return
    chop.current = 1
    const at = x.current
    const free = GUIDES.map((g, i) => ({ g, i, d: Math.abs(g - at) })).filter((o) => !used.current[o.i])
    const best = free.sort((a, b) => a.d - b.d)[0]
    if (!best) return
    used.current[best.i] = true
    const s = best.d < 0.01 ? 1 : best.d < 0.022 ? 0.7 : best.d < 0.04 ? 0.35 : 0.1
    scores.current.push(s)
    say(s === 1 ? 'Parfait !' : s >= 0.7 ? 'Bien !' : s > 0.3 ? 'Bof…' : 'Raté !', s === 1 ? 'good' : s >= 0.7 ? 'ok' : 'bad')
    setCuts((c) => {
      // two chops at the same spot would make an empty slice: move the new one next to the old
      let x = THREE.MathUtils.clamp(at, -VEG_R + 0.012, VEG_R - 0.012)
      while (c.some((o) => Math.abs(o - x) < 0.012)) x = x > 0 ? x - 0.013 : x + 0.013
      return [...c, x]
    })
    if (used.current.every(Boolean)) {
      done.current = true
      setTimeout(() => {
        if (veg + 1 < VEGS.length) {
          setVeg(veg + 1)
          setCuts([])
          used.current = [false, false, false]
          done.current = false
        } else {
          const avg = scores.current.reduce((a, b) => a + b, 0) / scores.current.length
          useGame.getState().finishCut(avg)
        }
      }, 650)
    }
  }
  // keep the latest closure (veg changes) for the button
  useEffect(() => {
    useMini.getState().set({ onTap: () => tap(), hint: veg === 0 ? 'Coupe la tomate sur les pointillés ! Tape quand le couteau est au-dessus.' : 'Maintenant l’oignon !' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veg])

  useFrame((_, dt) => {
    const speed = (sharp ? 1.9 : 2.7) + veg * 0.5
    if (chop.current <= 0) t.current += dt * speed
    x.current = Math.sin(t.current) * (VEG_R + 0.02)
    chop.current = Math.max(0, chop.current - dt * 4)
    const k = knife.current
    if (k) {
      k.position.x = BOARD[0] + x.current
      const down = chop.current > 0 ? Math.sin((1 - chop.current) * Math.PI) : 0
      k.position.y = Y + VEG_R + 0.06 - down * (VEG_R * 2 + 0.03)
    }
  })

  return (
    <group>
      <Sliceable key={veg} kind={VEGS[veg]} cuts={cuts} position={[BOARD[0], Y, BOARD[2]]} />
      {/* dashed guide lines over the vegetable */}
      {GUIDES.map((g, i) =>
        Array.from({ length: 5 }, (_, k) => (
          <mesh key={`${i}-${k}`} position={[BOARD[0] + g, BOARD[1] + 0.035 + k * 0.05, BOARD[2] + VEG_R + 0.01]}>
            <planeGeometry args={[0.006, 0.028]} />
            <meshBasicMaterial color={cuts.length > 0 && used.current[i] ? '#adb5bd' : '#ffffff'} />
          </mesh>
        )),
      )}
      <group ref={knife} position={[BOARD[0], Y + 0.2, BOARD[2]]} rotation={[0, -0.55, 0]}>
        <RoundedBox args={[0.006, 0.11, 0.26]} radius={0.0028} castShadow position={[0, 0.02, 0]}>
          <meshStandardMaterial color="#e9ecef" roughness={0.18} metalness={0.9} />
        </RoundedBox>
        <mesh position={[0, 0.05, 0.2]} rotation={[Math.PI / 2, 0, 0]} scale={[0.75, 1, 1.1]}>
          <capsuleGeometry args={[0.018, 0.11, 8, 16]} />
          <Mat color="#6b4423" rough={0.5} />
        </mesh>
      </group>
    </group>
  )
}
