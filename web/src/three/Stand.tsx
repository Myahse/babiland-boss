import { Outlines, RoundedBox } from '@react-three/drei'
import { useGame } from '../store'
import { Attieke, FishPiece, fishColor, Piment, PopIn, Slice } from './Food'
import { Person, Toon } from './Person'
import { INK, signTexture } from './toon'

export const TOP = 0.9
export const BOARD: [number, number, number] = [-0.55, TOP, 0.12]
export const PAN: [number, number, number] = [0.62, TOP, 0.05]
export const PLATE: [number, number, number] = [0, TOP, 0.22]

function Bowl({ position, r = 0.13, color = '#e9ecef', children }: { position: [number, number, number]; r?: number; color?: string; children?: React.ReactNode }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, r * 0.35, 0]}>
        <cylinderGeometry args={[r, r * 0.7, r * 0.7, 24, 1, true]} />
        <Toon color={color} side={2} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.7, 24]} />
        <Toon color={color} />
      </mesh>
      {children}
    </group>
  )
}

/** Parasol with alternating panels. The « bâche » upgrade gives it the orange-white-green. */
function Parasol() {
  const bache = useGame((s) => s.upgrades.bache)
  const cols = bache ? ['#f76707', '#ffffff', '#2f9e44'] : ['#1c7ed6', '#ffd43b']
  const n = 12
  return (
    <group position={[1.2, 0, -0.75]}>
      <mesh castShadow position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 2.6, 8]} />
        <Toon color="#dee2e6" />
      </mesh>
      <group position={[-0.9, 2.5, 0.6]} rotation={[0.08, 0, 0.1]}>
        {Array.from({ length: n }, (_, i) => (
          <mesh key={i} rotation={[0, (i / n) * Math.PI * 2, 0]}>
            <coneGeometry args={[1.55, 0.45, 1, 1, true, 0, (Math.PI * 2) / n + 0.01]} />
            <Toon color={cols[i % cols.length]} side={2} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function PlateContents() {
  const plate = useGame((s) => s.plate)
  const fry = useGame((s) => s.scores.fry)
  const fish = fishColor(fry > 0.7 ? 0.68 : fry > 0.3 ? 0.85 : 1.1)
  return (
    <group position={[PLATE[0], PLATE[1] + 0.02, PLATE[2]]}>
      {plate.includes('attieke') && (
        <PopIn>
          <Attieke size={0.85} position={[-0.02, 0, 0]} />
        </PopIn>
      )}
      {plate.includes('poisson') && (
        <PopIn>
          <FishPiece color={fish} position={[0.06, 0.04, -0.02]} rotation={[0.1, 0.5, 0.15]} />
          <FishPiece color={fish} position={[0.075, 0.04, 0.05]} rotation={[-0.1, -0.3, 0.1]} />
        </PopIn>
      )}
      {plate.includes('tomate') && (
        <PopIn>
          <Slice kind="tomate" position={[-0.07, 0.05, 0.04]} rotation={[0.3, 0, 0.2]} />
          <Slice kind="oignon" position={[-0.03, 0.055, 0.07]} rotation={[0.4, 0, -0.1]} />
          <Slice kind="tomate" position={[0.0, 0.05, 0.09]} rotation={[0.5, 0, 0]} />
        </PopIn>
      )}
      {plate.includes('piment') && (
        <PopIn>
          <Piment position={[-0.05, 0.06, -0.03]} rotation={[0, 0.6, 0]} />
          <Piment green position={[0.0, 0.065, -0.05]} rotation={[0, -0.4, 0]} />
        </PopIn>
      )}
    </group>
  )
}

export function Stand() {
  const name = useGame((s) => s.name)
  const phase = useGame((s) => s.phase)
  return (
    <group>
      {/* the counter: a wooden table with a painted front */}
      <RoundedBox args={[2.5, 0.08, 1.0]} radius={0.02} position={[0, TOP - 0.04, 0]} castShadow receiveShadow>
        <Toon color="#c08552" />
        <Outlines thickness={0.012} color={INK} />
      </RoundedBox>
      <mesh position={[0, TOP / 2 - 0.04, 0.49]} castShadow>
        <boxGeometry args={[2.46, TOP - 0.08, 0.03]} />
        <Toon color="#8c5a33" />
      </mesh>
      <mesh position={[0, 0.5, 0.51]}>
        <planeGeometry args={[1.9, 0.48]} />
        <meshBasicMaterial map={signTexture(`GARBA CHEZ ${name.toUpperCase() || 'BOSS'}`, '#f76707', '#fff', 768, 192)} toneMapped={false} />
      </mesh>
      {[-1.18, 1.18].map((x) => (
        <mesh key={x} position={[x, TOP / 2 - 0.04, -0.4]}>
          <boxGeometry args={[0.06, TOP - 0.08, 0.06]} />
          <Toon color="#8c5a33" />
        </mesh>
      ))}

      {/* cutting board */}
      <RoundedBox args={[0.5, 0.03, 0.32]} radius={0.01} position={[BOARD[0], BOARD[1] + 0.015, BOARD[2]]} castShadow receiveShadow>
        <Toon color="#e0b07a" />
        <Outlines thickness={0.005} color={INK} />
      </RoundedBox>

      {/* gas burner + frying pan of oil */}
      <group position={PAN}>
        <RoundedBox args={[0.34, 0.07, 0.34]} radius={0.015} position={[0, 0.035, 0]} castShadow>
          <Toon color="#343a40" />
        </RoundedBox>
        <mesh position={[0, 0.105, 0]} castShadow>
          <cylinderGeometry args={[0.21, 0.16, 0.07, 28, 1, true]} />
          <Toon color="#495057" side={2} />
        </mesh>
        <mesh position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.16, 28]} />
          <Toon color="#343a40" />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.195, 28]} />
          <meshToonMaterial color="#f2b53a" transparent opacity={0.85} />
        </mesh>
        <mesh position={[0.32, 0.12, 0]}>
          <boxGeometry args={[0.24, 0.025, 0.04]} />
          <Toon color="#212529" />
        </mesh>
      </group>
      {/* gas bottle under the table */}
      <mesh position={[0.75, 0.25, -0.15]} castShadow>
        <capsuleGeometry args={[0.15, 0.2, 4, 14]} />
        <Toon color="#1c7ed6" />
      </mesh>

      {/* the bowls of ingredients */}
      <Bowl position={[-0.12, TOP, -0.25]} r={0.17} color="#74c0fc">
        <Attieke size={1.25} position={[0, 0.06, 0]} />
      </Bowl>
      <Bowl position={[0.22, TOP, -0.3]} r={0.13} color="#ced4da">
        {[0, 1, 2, 3].map((i) => (
          <FishPiece key={i} color={fishColor(0.68)} position={[(i % 2) * 0.07 - 0.035, 0.06 + Math.floor(i / 2) * 0.03, (i % 2) * 0.03 - 0.015]} rotation={[0, i, 0]} />
        ))}
      </Bowl>
      <Bowl position={[-0.98, TOP, -0.22]} r={0.12} color="#ffd43b">
        {[0, 1, 2, 3, 4].map((i) => (
          <Slice key={i} kind={i % 2 ? 'oignon' : 'tomate'} position={[Math.cos(i * 1.3) * 0.04, 0.05 + i * 0.006, Math.sin(i * 1.3) * 0.04]} rotation={[0.3, i, 0.2]} />
        ))}
      </Bowl>
      <Bowl position={[-1.02, TOP, 0.2]} r={0.08} color="#ffffff">
        {[0, 1, 2, 3].map((i) => (
          <Piment key={i} green={i % 2 === 1} position={[Math.cos(i * 1.6) * 0.025, 0.035 + i * 0.008, Math.sin(i * 1.6) * 0.025]} rotation={[0, i * 1.1, 0]} />
        ))}
      </Bowl>

      {/* the customer's plate */}
      <group position={PLATE}>
        <mesh castShadow position={[0, 0.008, 0]}>
          <cylinderGeometry args={[0.15, 0.12, 0.016, 28]} />
          <Toon color="#ffffff" />
          <Outlines thickness={0.005} color={INK} />
        </mesh>
      </group>
      <PlateContents />

      <Parasol />
      <Person look={{ skin: '#5c3520', top: '#2f9e44', bottom: '#343a40', head: 'scarf', headColor: '#f76707', apron: true }} position={[0, 0, -0.78]} chopping={phase === 'cut'} mood="happy" />
    </group>
  )
}
