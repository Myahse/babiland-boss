import { useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import type { PersonId } from '../three/RealPerson'

// The simple avatar of shop games: a rounded capsule body, a round head with dot eyes,
// little limbs, and one or two signature details per person. Readable from far above.

type Look = { skin: string; top: string; bottom: string; hat?: 'wrap' | 'cap' | 'bun' | 'none'; hatColor?: string; apron?: boolean }

const LOOKS: Record<PersonId, Look> = {
  aya: { skin: '#6b3f24', top: '#ff8a1f', bottom: '#2fb344', hat: 'wrap', hatColor: '#2fb344', apron: true },
  koffi: { skin: '#5a3420', top: '#1c7ed6', bottom: '#343a40', hat: 'cap', hatColor: '#fcc419' },
  awa: { skin: '#7a4a2e', top: '#e64980', bottom: '#fcc419', hat: 'bun', hatColor: '#1b1110' },
  yao: { skin: '#4a2a1a', top: '#f8f9fa', bottom: '#2b8a3e', hat: 'none' },
  fatou: { skin: '#6b3f24', top: '#7048e8', bottom: '#7048e8', hat: 'wrap', hatColor: '#fcc419' },
}

function M({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.5} />
}

/** `moving` swings arms and legs; `carrying` holds the arms out in front, under the stack of plates. */
export function Avatar({ who, moving, carrying = false, ...props }: { who: PersonId; moving: boolean; carrying?: boolean } & ThreeElements['group']) {
  const L = LOOKS[who]
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const seed = useRef(Math.random() * 6)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 11 + seed.current
    const sw = moving ? Math.sin(t) * 0.7 : 0
    legL.current!.rotation.x = sw
    legR.current!.rotation.x = -sw
    const arm = carrying ? -1.35 : 0
    armL.current!.rotation.x = arm + (carrying ? 0 : -sw * 0.8)
    armR.current!.rotation.x = arm + (carrying ? 0 : sw * 0.8)
    body.current!.position.y = moving ? Math.abs(Math.sin(t)) * 0.05 : Math.sin(clock.elapsedTime * 2 + seed.current) * 0.01
  })
  return (
    <group {...props}>
      {/* soft round shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.3, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <group ref={body}>
        {[
          [-0.1, legL],
          [0.1, legR],
        ].map(([x, r]) => (
          <group key={x as number} ref={r as React.RefObject<THREE.Group>} position={[x as number, 0.38, 0]}>
            <mesh castShadow position={[0, -0.18, 0]}>
              <capsuleGeometry args={[0.075, 0.2, 4, 10]} />
              <M color={L.bottom} />
            </mesh>
          </group>
        ))}
        {/* body */}
        <mesh castShadow position={[0, 0.72, 0]}>
          <capsuleGeometry args={[0.24, 0.34, 6, 16]} />
          <M color={L.top} />
        </mesh>
        {L.apron && (
          <mesh position={[0, 0.66, 0.2]} scale={[1, 1, 0.35]}>
            <capsuleGeometry args={[0.17, 0.2, 4, 12]} />
            <M color="#ffffff" />
          </mesh>
        )}
        {[
          [-0.29, armL],
          [0.29, armR],
        ].map(([x, r]) => (
          <group key={x as number} ref={r as React.RefObject<THREE.Group>} position={[x as number, 0.9, 0]}>
            <mesh castShadow position={[0, -0.17, 0]}>
              <capsuleGeometry args={[0.065, 0.2, 4, 10]} />
              <M color={L.top} />
            </mesh>
            <mesh position={[0, -0.33, 0]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <M color={L.skin} />
            </mesh>
          </group>
        ))}
        {/* head */}
        <group position={[0, 1.27, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.24, 24, 18]} />
            <M color={L.skin} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.085, 0.02, 0.215]}>
              <sphereGeometry args={[0.032, 10, 8]} />
              <meshBasicMaterial color="#120a06" />
            </mesh>
          ))}
          <mesh position={[0, -0.08, 0.215]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.045, 0.012, 6, 12, Math.PI]} />
            <meshBasicMaterial color="#3a1410" />
          </mesh>
          {L.hat === 'wrap' && (
            <group position={[0, 0.12, -0.02]}>
              <mesh castShadow scale={[1.05, 0.75, 1.05]}>
                <sphereGeometry args={[0.24, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <M color={L.hatColor!} />
              </mesh>
              <mesh castShadow position={[0, 0.17, -0.03]} scale={[1, 0.75, 0.9]}>
                <sphereGeometry args={[0.17, 16, 12]} />
                <M color={L.hatColor!} />
              </mesh>
            </group>
          )}
          {L.hat === 'cap' && (
            <group position={[0, 0.1, 0]}>
              <mesh castShadow scale={[1.04, 0.7, 1.04]}>
                <sphereGeometry args={[0.24, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <M color={L.hatColor!} />
              </mesh>
              <mesh position={[0, 0.0, 0.24]} rotation={[0.15, 0, 0]} scale={[1, 0.15, 0.8]}>
                <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
                <M color={L.hatColor!} />
              </mesh>
            </group>
          )}
          {L.hat === 'bun' && (
            <group>
              <mesh position={[0, 0.06, -0.02]} scale={[1.04, 0.85, 1.04]}>
                <sphereGeometry args={[0.24, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <M color={L.hatColor!} />
              </mesh>
              <mesh castShadow position={[0, 0.26, -0.08]}>
                <sphereGeometry args={[0.11, 14, 10]} />
                <M color={L.hatColor!} />
              </mesh>
            </group>
          )}
          {L.hat === 'none' && (
            <mesh position={[0, 0.05, -0.01]} scale={[1.02, 0.8, 1.02]}>
              <sphereGeometry args={[0.24, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
              <M color="#120c0a" />
            </mesh>
          )}
        </group>
      </group>
    </group>
  )
}
