import { RoundedBox } from '@react-three/drei'
import { useGame } from '../store'
import { Attieke, FishPiece, fishColor, Piment, PopIn, Slice } from './Food'
import { Person } from './Person'
import { Mat } from './Mat'
import { signTexture } from './textures'
import { Model } from './assets'

export const TOP = 0.96
export const BOARD: [number, number, number] = [-0.55, TOP, 0.12]
export const PAN: [number, number, number] = [0.62, TOP, 0.05]
export const PLATE: [number, number, number] = [0, TOP, 0.22]

/** An enamel basin: white enamel with a coloured rim, like the ones sold at every market. */
function Bowl({ position, r = 0.13, color = '#1c4f9c', children }: { position: [number, number, number]; r?: number; color?: string; children?: React.ReactNode }) {
  const enamel = { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.15 }
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, r * 0.3, 0]}>
        <cylinderGeometry args={[r, r * 0.66, r * 0.6, 40, 1, true]} />
        <meshPhysicalMaterial color="#f3f1ea" side={2} {...enamel} />
      </mesh>
      <mesh position={[0, r * 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r, 0.007, 8, 48]} />
        <meshPhysicalMaterial color={color} {...enamel} />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[r * 0.66, 40]} />
        <meshPhysicalMaterial color="#f3f1ea" {...enamel} />
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
        <Mat color="#dee2e6" />
      </mesh>
      <group position={[-0.9, 2.5, 0.6]} rotation={[0.08, 0, 0.1]}>
        {Array.from({ length: n }, (_, i) => (
          <mesh key={i} rotation={[0, (i / n) * Math.PI * 2, 0]} castShadow>
            <coneGeometry args={[1.55, 0.42, 6, 1, true, 0, (Math.PI * 2) / n + 0.01]} />
            <meshPhysicalMaterial color={cols[i % cols.length]} roughness={0.85} sheen={1} sheenColor="#ffffff" side={2} />
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
      {/* the counter: a real painted wooden table */}
      <Model name="painted_wooden_table" />
      <mesh position={[0, 0.55, 0.585]}>
        <planeGeometry args={[1.9, 0.46]} />
        <meshStandardMaterial map={signTexture(`GARBA CHEZ ${name.toUpperCase() || 'BOSS'}`, '#e8590c', '#fff', 768, 192)} roughness={0.7} />
      </mesh>
      <Model name="wooden_cutting_board" position={[BOARD[0], TOP, BOARD[2]]} scale={[1.15, 1, 1.3]} />
      <Model name="small_lpg_tank" position={[0.75, 0, -0.1]} />
      <Model name="plastic_crate_01" position={[-0.8, 0, -0.15]} rotation={[0, 0.2, 0]} />
      {/* basket of tomatoes and onions, bananas plantain, limes */}
      <group position={[-1.0, TOP, -0.33]}>
        <Model name="wicker_basket_01" scale={0.75} />
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} castShadow position={[Math.cos(i * 1.3) * 0.07, 0.07 + (i % 2) * 0.02, Math.sin(i * 1.3) * 0.05]} scale={[1, 0.85, 1]}>
            <sphereGeometry args={[0.038, 24, 18]} />
            <meshPhysicalMaterial color="#c9230f" roughness={0.25} clearcoat={1} clearcoatRoughness={0.2} />
          </mesh>
        ))}
        <Model name="yellow_onion" position={[0.07, 0.06, 0.04]} rotation={[0.3, 1, 0.4]} />
        <Model name="yellow_onion" position={[-0.06, 0.07, 0.05]} rotation={[-0.2, 2, -0.5]} />
      </group>
      <Model name="bananas" position={[1.0, TOP, -0.36]} rotation={[0, 0.5, 0]} tint="#7a9b3a" />
      <Model name="food_lime_01" position={[-0.75, TOP, 0.42]} />
      <Model name="food_lime_01" position={[-0.69, TOP, 0.45]} rotation={[0, 1, 0]} />

      {/* gas burner + frying pan of oil */}
      <group position={PAN}>
        <RoundedBox args={[0.34, 0.07, 0.34]} radius={0.012} position={[0, 0.035, 0]} castShadow>
          <meshStandardMaterial color="#26282b" roughness={0.4} metalness={0.8} />
        </RoundedBox>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.072, 0]} rotation={[0, (i * Math.PI) / 3, 0]}>
            <boxGeometry args={[0.3, 0.012, 0.02]} />
            <meshStandardMaterial color="#101113" roughness={0.5} metalness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 0.105, 0]} castShadow>
          <cylinderGeometry args={[0.21, 0.16, 0.07, 48, 1, true]} />
          <meshStandardMaterial color="#202224" roughness={0.35} metalness={0.85} side={2} />
        </mesh>
        <mesh position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.16, 48]} />
          <meshStandardMaterial color="#202224" roughness={0.35} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.195, 28]} />
          <meshPhysicalMaterial color="#e9a92a" roughness={0.05} clearcoat={1} transparent opacity={0.88} />
        </mesh>
        <mesh position={[0.32, 0.12, 0]}>
          <boxGeometry args={[0.24, 0.025, 0.04]} />
          <Mat color="#212529" />
        </mesh>
      </group>

      {/* the bowls of ingredients */}
      <group position={[-0.12, TOP, -0.27]}>
        <Model name="wooden_bowl_01" scale={1.15} />
        <Attieke size={1.35} position={[0, 0.045, 0]} />
      </group>
      <Bowl position={[0.22, TOP, -0.3]} r={0.13} color="#ced4da">
        {[0, 1, 2, 3].map((i) => (
          <FishPiece key={i} color={fishColor(0.68)} position={[(i % 2) * 0.07 - 0.035, 0.06 + Math.floor(i / 2) * 0.03, (i % 2) * 0.03 - 0.015]} rotation={[0, i, 0]} />
        ))}
      </Bowl>
      <Bowl position={[-0.95, TOP, 0.05]} r={0.11} color="#2b8a3e">
        {[0, 1, 2, 3, 4].map((i) => (
          <Slice key={i} kind={i % 2 ? 'oignon' : 'tomate'} position={[Math.cos(i * 1.3) * 0.04, 0.05 + i * 0.006, Math.sin(i * 1.3) * 0.04]} rotation={[0.3, i, 0.2]} />
        ))}
      </Bowl>
      <Bowl position={[-1.02, TOP, 0.34]} r={0.07} color="#c92a2a">
        {[0, 1, 2, 3].map((i) => (
          <Piment key={i} green={i % 2 === 1} position={[Math.cos(i * 1.6) * 0.025, 0.035 + i * 0.008, Math.sin(i * 1.6) * 0.025]} rotation={[0, i * 1.1, 0]} />
        ))}
      </Bowl>

      {/* the customer's plate */}
      <group position={PLATE}>
        <mesh castShadow position={[0, 0.008, 0]}>
          <cylinderGeometry args={[0.15, 0.11, 0.016, 48]} />
          <meshPhysicalMaterial color="#f6f4ee" roughness={0.15} clearcoat={1} />
        </mesh>
      </group>
      <PlateContents />

      <Parasol />
      <Person look={{ skin: '#5c3520', top: '#2f9e44', bottom: '#343a40', head: 'scarf', headColor: '#f76707', apron: true }} position={[0, 0, -0.78]} chopping={phase === 'cut'} mood="happy" />
    </group>
  )
}
