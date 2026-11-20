import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { tier, tierMaterial } from './looks'

// The 3D shapes of the ten looks (looks.ts) for the things of the maquis. The cooking top of every stove stays at
// the same height (0.87), so the pans, the steam and the plates sit right whatever the look.

const ember = new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff4d00', emissiveIntensity: 1.2 })
const coal = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 1 })
const rust = new THREE.MeshStandardMaterial({ color: '#8a4b2a', roughness: 0.95, metalness: 0.3 })
const grill = new THREE.MeshStandardMaterial({ color: '#2f2f2f', roughness: 0.6, metalness: 0.6 })
const gasBlue = new THREE.MeshStandardMaterial({ color: '#1c7ed6', roughness: 0.4, metalness: 0.2 })
export const gold = new THREE.MeshStandardMaterial({ color: '#f2c230', metalness: 0.45, roughness: 0.25, emissive: '#8a6400', emissiveIntensity: 0.35 })

/** A stove at its level (1..10): from a rusty drum with charcoal to a marble range with gold. */
export function StationBody({ level }: { level: number }) {
  const L = Math.max(1, Math.min(10, level))
  const body = tierMaterial(L, 'body', { pattern: true })
  const front = tierMaterial(L, 'front', { pattern: tier(L).pattern === 'flag' })
  const trim = tierMaterial(L, 'trim')
  const top = tierMaterial(L, 'top')

  if (L === 1)
    // la récup: half an oil drum on two blocks, charcoal under a grill
    return (
      <group>
        {[-0.35, 0.35].map((x) => (
          <mesh key={x} position={[x, 0.12, 0]} material={coal} castShadow>
            <boxGeometry args={[0.28, 0.24, 0.6]} />
          </mesh>
        ))}
        <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} material={rust} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 1.2, 16, 1, false, 0, Math.PI]} />
        </mesh>
        <mesh position={[0, 0.82, 0]} material={ember}>
          <boxGeometry args={[1.0, 0.04, 0.7]} />
        </mesh>
        <mesh position={[0, 0.87, 0]} material={grill} receiveShadow>
          <boxGeometry args={[1.2, 0.03, 0.88]} />
        </mesh>
      </group>
    )
  if (L === 2)
    // les briques: a brick fireplace, the embers glowing on top
    return (
      <group>
        <mesh position={[0, 0.42, 0]} material={body} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.84, 0.9]} />
        </mesh>
        <mesh position={[0, 0.3, 0.452]} material={coal}>
          <planeGeometry args={[0.6, 0.3]} />
        </mesh>
        <mesh position={[0, 0.3, 0.455]} material={ember}>
          <planeGeometry args={[0.4, 0.12]} />
        </mesh>
        <mesh position={[0, 0.86, 0]} material={grill} receiveShadow>
          <boxGeometry args={[1.22, 0.04, 0.92]} />
        </mesh>
      </group>
    )
  if (L === 3)
    // le bois peint: a painted table, a gas burner, the blue gas bottle underneath
    return (
      <group>
        {[
          [-0.52, -0.36],
          [0.52, -0.36],
          [-0.52, 0.36],
          [0.52, 0.36],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.42, z]} material={trim} castShadow>
            <boxGeometry args={[0.08, 0.84, 0.08]} />
          </mesh>
        ))}
        <mesh position={[0, 0.8, 0]} material={body} castShadow receiveShadow>
          <boxGeometry args={[1.24, 0.1, 0.94]} />
        </mesh>
        <mesh position={[0, 0.66, 0.45]} material={front}>
          <boxGeometry args={[1.2, 0.18, 0.03]} />
        </mesh>
        <mesh position={[0, 0.86, 0]} material={grill} receiveShadow>
          <boxGeometry args={[1.1, 0.03, 0.8]} />
        </mesh>
        <mesh position={[0.2, 0.25, 0]} material={gasBlue} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.5, 14]} />
        </mesh>
        <mesh position={[0.2, 0.55, 0]} material={gasBlue}>
          <sphereGeometry args={[0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
    )

  // 4..10: a real range, better and better
  return (
    <group>
      <RoundedBox args={[1.2, 0.85, 0.9]} radius={0.04} position={[0, 0.425, 0]} material={body} castShadow receiveShadow />
      {/* the oven door */}
      <mesh position={[0, 0.32, 0.452]} material={front}>
        <planeGeometry args={[1.0, 0.45]} />
      </mesh>
      {L >= 5 && (
        <mesh position={[0, 0.32, 0.46]} material={trim}>
          <boxGeometry args={[0.6, 0.04, 0.03]} />
        </mesh>
      )}
      {/* knobs */}
      {[-0.3, 0, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.66, 0.46]} rotation={[Math.PI / 2, 0, 0]} material={trim}>
          <cylinderGeometry args={[0.045, 0.045, 0.05, 10]} />
        </mesh>
      ))}
      <mesh position={[0, 0.87, 0]} material={top} receiveShadow>
        <boxGeometry args={[1.22, 0.04, 0.92]} />
      </mesh>
      {/* gold edges: noir et or, the palace */}
      {L >= 9 &&
        [0.56, 0.08].map((y) => (
          <mesh key={y} position={[0, y, 0.455]} material={gold}>
            <boxGeometry args={[1.18, 0.025, 0.02]} />
          </mesh>
        ))}
      {/* the hood: a plain board, then a real hood with its chimney */}
      {L < 5 ? (
        <mesh position={[0, 1.15, -0.42]} material={trim} castShadow>
          <boxGeometry args={[1.2, 0.55, 0.08]} />
        </mesh>
      ) : (
        <group position={[0, 0, -0.3]}>
          <mesh position={[0, 1.18, -0.1]} material={L === 8 ? trim : body} castShadow>
            <boxGeometry args={[1.2, 0.6, 0.12]} />
          </mesh>
          <mesh position={[0, 1.62, 0.05]} material={L === 8 ? trim : body} castShadow>
            <cylinderGeometry args={[0.32, 0.6, 0.3, 4, 1, false, Math.PI / 4]} />
          </mesh>
          <mesh position={[0, 2.0, 0.05]} material={L === 8 ? trim : top}>
            <cylinderGeometry args={[0.1, 0.1, 0.5, 10]} />
          </mesh>
          {L >= 9 && (
            <mesh position={[0, 1.18, -0.03]} material={gold}>
              <boxGeometry args={[1.18, 0.04, 0.02]} />
            </mesh>
          )}
        </group>
      )}
      {/* the palace: a little gold crown on the hood */}
      {L === 10 && (
        <group position={[0.45, 1.5, -0.33]}>
          {[-0.08, 0, 0.08].map((x, i) => (
            <mesh key={x} position={[x, i === 1 ? 0.08 : 0.05, 0]} material={gold}>
              <coneGeometry args={[0.04, i === 1 ? 0.16 : 0.1, 6]} />
            </mesh>
          ))}
          <mesh material={gold}>
            <boxGeometry args={[0.26, 0.06, 0.06]} />
          </mesh>
        </group>
      )}
    </group>
  )
}
