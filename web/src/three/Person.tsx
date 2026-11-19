import { useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import * as THREE from 'three'
import { gradientMap, INK, waxTexture } from './toon'

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

export function Toon({ color, map, ...rest }: { color: THREE.ColorRepresentation; map?: THREE.Texture } & ThreeElements['meshToonMaterial']) {
  return <meshToonMaterial color={color} map={map ?? null} gradientMap={gradientMap()} {...rest} />
}

const LINE = 0.012

/**
 * A chibi toy-like person: big round head, big eyes, short body. About 1.5 m tall in the world.
 * `walking` swings the legs, `chopping` moves the right arm up and down, `mood` sets the mouth.
 */
export function Person({ look, walking = false, chopping = false, mood = 'happy', ...group }: { look: Look; walking?: boolean; chopping?: boolean; mood?: Mood } & ThreeElements['group']) {
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Group>(null)
  const seed = useRef(Math.random() * 10)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed.current
    const swing = walking ? Math.sin(t * 9) * 0.6 : 0
    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    if (armL.current) armL.current.rotation.x = -swing * 0.8
    if (armR.current) armR.current.rotation.x = chopping ? -1.1 + Math.abs(Math.sin(t * 10)) * 0.6 : swing * 0.8
    if (body.current) body.current.position.y = walking ? Math.abs(Math.sin(t * 9)) * 0.04 : Math.sin(t * 2) * 0.008
    // blink every few seconds
    if (eyes.current) eyes.current.scale.y = t % 3.7 < 0.12 ? 0.1 : 1
  })

  const top = look.topWax ? waxTexture(look.top) : undefined
  const hc = look.headColor ?? '#1b1110'

  return (
    <group {...group}>
      <group ref={body}>
        {/* legs */}
        {[
          [-0.085, legL],
          [0.085, legR],
        ].map(([x, ref]) => (
          <group key={x as number} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.5, 0]}>
            <mesh castShadow position={[0, -0.22, 0]}>
              <capsuleGeometry args={[0.075, 0.3, 4, 12]} />
              <Toon color={look.bottom} />
              <Outlines thickness={LINE} color={INK} />
            </mesh>
            <mesh castShadow position={[0, -0.46, 0.04]} scale={[1, 0.6, 1.5]}>
              <sphereGeometry args={[0.075, 14, 10]} />
              <Toon color="#3b2a20" />
            </mesh>
          </group>
        ))}
        {/* torso */}
        <mesh castShadow position={[0, 0.78, 0]} scale={[1.1, 1, 0.85]}>
          <capsuleGeometry args={[0.17, 0.22, 4, 16]} />
          <Toon color={look.topWax ? '#ffffff' : look.top} map={top} />
          <Outlines thickness={LINE} color={INK} />
        </mesh>
        {look.apron && (
          <mesh position={[0, 0.68, 0.145]} rotation={[-0.08, 0, 0]}>
            <boxGeometry args={[0.3, 0.38, 0.02]} />
            <Toon color="#fff4e6" />
            <Outlines thickness={LINE} color={INK} />
          </mesh>
        )}
        {/* arms */}
        {[
          [-0.23, armL],
          [0.23, armR],
        ].map(([x, ref]) => (
          <group key={x as number} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.95, 0]} rotation={[0, 0, (x as number) < 0 ? -0.12 : 0.12]}>
            <mesh castShadow position={[0, -0.16, 0]}>
              <capsuleGeometry args={[0.055, 0.22, 4, 10]} />
              <Toon color={look.topWax ? '#ffffff' : look.top} map={top} />
              <Outlines thickness={LINE} color={INK} />
            </mesh>
            <mesh castShadow position={[0, -0.33, 0]}>
              <sphereGeometry args={[0.062, 14, 10]} />
              <Toon color={look.skin} />
            </mesh>
          </group>
        ))}
        {/* head */}
        <group position={[0, 1.28, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.24, 32, 24]} />
            <Toon color={look.skin} />
            <Outlines thickness={LINE} color={INK} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.235, -0.01, 0]} scale={[0.5, 1, 0.8]}>
              <sphereGeometry args={[0.055, 12, 10]} />
              <Toon color={look.skin} />
            </mesh>
          ))}
          <group ref={eyes} position={[0, 0.02, 0]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.085, 0, 0.205]}>
                <mesh scale={[1, 1.25, 0.5]}>
                  <sphereGeometry args={[0.048, 16, 12]} />
                  <meshBasicMaterial color="#fff" />
                </mesh>
                <mesh position={[0, -0.005, 0.02]} scale={[1, 1.2, 0.5]}>
                  <sphereGeometry args={[0.032, 16, 12]} />
                  <meshBasicMaterial color="#1a0f0a" />
                </mesh>
                <mesh position={[0.012, 0.014, 0.038]}>
                  <sphereGeometry args={[0.009, 8, 6]} />
                  <meshBasicMaterial color="#fff" />
                </mesh>
              </group>
            ))}
          </group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.085, 0.1, 0.205]} rotation={[0.3, 0, s * (mood === 'sad' ? -0.4 : -0.1)]}>
              <boxGeometry args={[0.07, 0.016, 0.02]} />
              <meshBasicMaterial color="#120a06" />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.14, -0.05, 0.19]} scale={[1, 0.6, 0.3]}>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshBasicMaterial color="#e8738a" transparent opacity={0.55} />
            </mesh>
          ))}
          <mesh position={[0, -0.03, 0.235]}>
            <sphereGeometry args={[0.025, 10, 8]} />
            <Toon color={look.skin} />
          </mesh>
          {mood === 'neutral' ? (
            <mesh position={[0, -0.1, 0.225]}>
              <boxGeometry args={[0.05, 0.012, 0.01]} />
              <meshBasicMaterial color="#5c1f1f" />
            </mesh>
          ) : (
            <mesh position={[0, mood === 'happy' ? -0.085 : -0.12, 0.222]} rotation={[0, 0, mood === 'happy' ? Math.PI : 0]}>
              <torusGeometry args={[0.04, 0.012, 8, 16, Math.PI]} />
              <meshBasicMaterial color="#5c1f1f" />
            </mesh>
          )}
          <Headwear kind={look.head} color={hc} />
        </group>
      </group>
      {/* soft blob shadow so feet sit on the ground even far from the sun's shadow map */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.22, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Headwear({ kind, color }: { kind?: Look['head']; color: string }) {
  if (kind === 'cap')
    return (
      <group position={[0, 0.07, 0]}>
        <mesh scale={[1.03, 0.75, 1.03]}>
          <sphereGeometry args={[0.245, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Toon color={color} />
          <Outlines thickness={LINE} color={INK} />
        </mesh>
        <mesh position={[0, 0.01, 0.24]} rotation={[0.25, 0, 0]} scale={[1, 0.12, 0.7]}>
          <cylinderGeometry args={[0.16, 0.16, 0.1, 20]} />
          <Toon color={color} />
          <Outlines thickness={LINE} color={INK} />
        </mesh>
      </group>
    )
  if (kind === 'scarf')
    return (
      <group position={[0, 0.06, -0.01]}>
        <mesh scale={[1.08, 0.95, 1.08]}>
          <sphereGeometry args={[0.245, 24, 14, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
          <Toon color="#ffffff" map={waxTexture(color)} />
          <Outlines thickness={LINE} color={INK} />
        </mesh>
        <mesh position={[0.1, 0.22, -0.06]} rotation={[0, 0, -0.6]} scale={[1, 0.6, 0.6]}>
          <sphereGeometry args={[0.09, 14, 10]} />
          <Toon color="#ffffff" map={waxTexture(color)} />
          <Outlines thickness={LINE} color={INK} />
        </mesh>
      </group>
    )
  if (kind === 'braids')
    return (
      <group>
        <mesh position={[0, 0.03, -0.01]} scale={[1.05, 1, 1.05]}>
          <sphereGeometry args={[0.245, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
          <Toon color={color} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => {
          const a = Math.PI * (0.35 + (i / 8) * 1.3)
          return (
            <mesh key={i} position={[Math.cos(a) * 0.22, -0.12, -Math.abs(Math.sin(a)) * 0.2]} rotation={[0.2, 0, 0]}>
              <capsuleGeometry args={[0.022, 0.2, 3, 6]} />
              <Toon color={color} />
            </mesh>
          )
        })}
      </group>
    )
  if (kind === 'hair')
    return (
      <mesh position={[0, 0.035, -0.005]} scale={[1.04, 0.9, 1.04]}>
        <sphereGeometry args={[0.245, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
        <Toon color={color} />
      </mesh>
    )
  return null
}
