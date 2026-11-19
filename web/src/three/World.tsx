import { Environment, RoundedBox } from '@react-three/drei'
import { Mat } from './Mat'
import { Model, SKY, usePBR, type TextureName } from './assets'
import { signTexture } from './textures'
import { LOOK } from './Character'

// A real-looking Yopougon street: photo-scanned laterite, plaster, rusty tin roofs, a real sky,
// monobloc chairs, gas bottles, jerrycans and electricity poles (Poly Haven, CC0).

type Shop = { x: number; w: number; h: number; wall: TextureName; tint: string; sign: string; signBg: string }
const SHOPS: Shop[] = [
  { x: -9.5, w: 3.2, h: 3.4, wall: 'blue_plaster_weathered', tint: '#ffffff', sign: 'CABINE', signBg: '#e8590c' },
  { x: -6.2, w: 3.2, h: 4.6, wall: 'yellow_plaster', tint: '#ffffff', sign: 'MAQUIS LE BON COIN', signBg: '#2b8a3e' },
  { x: -2.8, w: 3.4, h: 3.2, wall: 'red_plaster_weathered', tint: '#ffffff', sign: 'PRESSING', signBg: '#1864ab' },
  { x: 0.8, w: 3.6, h: 5.2, wall: 'painted_plaster_wall', tint: '#cfe8dc', sign: 'ALIMENTATION', signBg: '#c92a2a' },
  { x: 4.4, w: 3.2, h: 3.6, wall: 'peeling_painted_wall', tint: '#f1d9f0', sign: 'COIFFURE DAME', signBg: '#c2255c' },
  { x: 7.7, w: 3.2, h: 4.2, wall: 'yellow_plaster', tint: '#ffd8a8', sign: 'QUINCAILLERIE', signBg: '#5f3dc4' },
]

const METAL = { color: '#3a3f45', roughness: 0.45, metalness: 0.7 }

function Window({ x, y, w = 0.9, h = 0.85, shutter }: { x: number; y: number; w?: number; h?: number; shutter: string }) {
  return (
    <group position={[x, y, 1.2]}>
      <mesh position={[0, 0, 0.02]} castShadow>
        <boxGeometry args={[w + 0.12, h + 0.12, 0.06]} />
        <Mat color="#e9e2d4" rough={0.85} />
      </mesh>
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[w, h]} />
        <meshPhysicalMaterial color="#1f2b33" roughness={0.05} metalness={0.1} clearcoat={1} envMapIntensity={1.4} />
      </mesh>
      {/* burglar bars */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (w / 5) * i, 0, 0.085]} castShadow>
          <cylinderGeometry args={[0.009, 0.009, h, 6]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      {[-h / 4, h / 4].map((yy) => (
        <mesh key={yy} position={[0, yy, 0.085]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.009, 0.009, w, 6]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * (w / 2 + 0.06), 0, 0.06]} rotation={[0, sd * 1.9, 0]}>
          <mesh position={[sd * (w / 4), 0, 0]} castShadow>
            <boxGeometry args={[w / 2, h + 0.04, 0.03]} />
            <Mat color={shutter} rough={0.75} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -h / 2 - 0.07, 0.07]} castShadow>
        <boxGeometry args={[w + 0.26, 0.05, 0.16]} />
        <Mat color="#d8d0c0" rough={0.9} />
      </mesh>
    </group>
  )
}

function Building({ x, w, h, wall, tint, sign, signBg }: Shop) {
  const z = -5.6
  const walls = usePBR(wall, [w / 2, h / 2])
  const roof = usePBR('rusty_corrugated_iron', [w / 1.5, 2])
  const plinth = usePBR('concrete_floor_worn_001', [w / 1.5, 0.3])
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, 2.4]} />
        <meshStandardMaterial {...walls} color={tint} />
      </mesh>
      <mesh position={[0, 0.3, 0.01]} receiveShadow>
        <boxGeometry args={[w + 0.03, 0.6, 2.44]} />
        <meshStandardMaterial {...plinth} color="#8d8a86" />
      </mesh>
      <mesh position={[0, h + 0.12, 0.2]} rotation={[0.1, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.3, 0.03, 2.9]} />
        <meshStandardMaterial {...roof} metalness={0.4} />
      </mesh>
      {/* metal door */}
      <group position={[-w * 0.24, 1.08, 1.2]}>
        <mesh castShadow>
          <boxGeometry args={[1.02, 2.18, 0.08]} />
          <Mat color="#d8d0c0" rough={0.9} />
        </mesh>
        <mesh position={[0, -0.04, 0.045]}>
          <boxGeometry args={[0.88, 2.04, 0.03]} />
          <meshStandardMaterial color="#4b5a52" roughness={0.55} metalness={0.5} />
        </mesh>
        {[-0.5, 0, 0.5].map((yy) => (
          <mesh key={yy} position={[0, yy, 0.065]}>
            <boxGeometry args={[0.8, 0.02, 0.01]} />
            <meshStandardMaterial color="#3e4a44" roughness={0.6} metalness={0.5} />
          </mesh>
        ))}
      </group>
      <Window x={w * 0.24} y={1.45} shutter={signBg} />
      {h > 3.9 && (
        <>
          <Window x={-w * 0.24} y={h - 1.0} shutter={signBg} w={0.7} h={0.7} />
          <Window x={w * 0.24} y={h - 1.0} shutter={signBg} w={0.7} h={0.7} />
          <mesh position={[0, h - 1.55, 1.48]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.8, 0.1, 0.6]} />
            <meshStandardMaterial {...plinth} color="#bdb6aa" />
          </mesh>
          {Array.from({ length: 11 }, (_, i) => (
            <mesh key={i} position={[-w * 0.4 + (w * 0.8 * i) / 10, h - 1.3, 1.76]} castShadow>
              <cylinderGeometry args={[0.012, 0.012, 0.48, 6]} />
              <meshStandardMaterial {...METAL} />
            </mesh>
          ))}
          <mesh position={[0, h - 1.06, 1.76]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, w * 0.8, 8]} />
            <meshStandardMaterial {...METAL} />
          </mesh>
          <RoundedBox args={[0.62, 0.4, 0.3]} radius={0.02} position={[w * 0.38, h - 0.45, 1.33]} castShadow>
            <meshStandardMaterial color="#e3e3de" roughness={0.45} />
          </RoundedBox>
        </>
      )}
      {/* sun awning: sloping tin sheet on two posts */}
      <mesh position={[0, 2.55, 1.75]} rotation={[0.28, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.95, 0.025, 1.2]} />
        <meshStandardMaterial {...roof} metalness={0.4} side={2} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * w * 0.44, 1.2, 2.25]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 2.4, 8]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      {/* painted sign board */}
      <group position={[0, 3.12, 1.24]}>
        <mesh castShadow>
          <boxGeometry args={[w * 0.88, (w * 0.85) / 4 + 0.06, 0.05]} />
          <meshStandardMaterial color="#2b2622" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.027]}>
          <planeGeometry args={[w * 0.85, (w * 0.85) / 4]} />
          <meshStandardMaterial map={signTexture(sign, signBg)} roughness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

function Ground() {
  const dirt = usePBR('red_laterite_soil_stones', [24, 12])
  const road = usePBR('asphalt_02', [20, 1])
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial {...dirt} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -3]} receiveShadow>
        <planeGeometry args={[60, 2.6]} />
        <meshStandardMaterial {...road} color="#9a9a9a" />
      </mesh>
      {/* the open gutter along the shops */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -4.3]} receiveShadow>
        <planeGeometry args={[60, 0.35]} />
        <meshStandardMaterial color="#2a2622" roughness={0.6} />
      </mesh>
    </>
  )
}

/** The round white plastic table with its monobloc chairs, where people eat on the spot. */
function EatingCorner() {
  return (
    <group position={[-2.7, 0, 0.7]}>
      <mesh castShadow receiveShadow position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.025, 40]} />
        <meshPhysicalMaterial color="#f4f4f0" roughness={0.35} clearcoat={0.3} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} castShadow position={[Math.cos(i * 1.57 + 0.78) * 0.32, 0.36, Math.sin(i * 1.57 + 0.78) * 0.32]} rotation={[Math.sin(i * 1.57 + 0.78) * 0.12, 0, -Math.cos(i * 1.57 + 0.78) * 0.12]}>
          <cylinderGeometry args={[0.02, 0.025, 0.72, 10]} />
          <meshPhysicalMaterial color="#f4f4f0" roughness={0.35} />
        </mesh>
      ))}
      <Model name="plastic_monobloc_chair_01" position={[-0.72, 0, 0.05]} rotation={[0, Math.PI / 2, 0]} />
      <Model name="plastic_monobloc_chair_01" position={[0.72, 0, -0.08]} rotation={[0, -Math.PI / 2, 0]} />
      <Model name="plastic_monobloc_chair_01" position={[0.05, 0, -0.72]} rotation={[0, 0.1, 0]} />
      <Model name="plastic_crate_01" position={[0.9, 0, 0.7]} rotation={[0, 0.4, 0]} />
      <Model name="plastic_crate_01" position={[0.9, 0.26, 0.7]} rotation={[0, 0.3, 0]} />
    </group>
  )
}

export function World() {
  return (
    <>
      {/* a real sunny sky lights the whole scene */}
      {/* a real sunny sky; the arcade look uses a plain bright sky colour instead */}
      <Environment files={SKY} background={LOOK !== 'arcade'} environmentIntensity={LOOK === 'arcade' ? 0.5 : 0.85} backgroundBlurriness={0.02} />
      {LOOK === 'arcade' && <color attach="background" args={['#8fd3ff']} />}
      <fog attach="fog" args={[LOOK === 'arcade' ? '#bfe6ff' : '#cfe0ee', 22, 60]} />
      <directionalLight
        castShadow
        position={[7, 10, 6]}
        intensity={2.4}
        color="#fff0d8"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={9}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={4}
      />
      <Ground />
      {SHOPS.map((s) => (
        <Building key={s.sign} {...s} />
      ))}
      <Model name="modular_electricity_poles" position={[0.8, 0, -4.05]} />
      <Model name="island_tree_01" position={[-5.3, 0, -1.4]} scale={0.85} rotation={[0, 0.8, 0]} />
      <Model name="island_tree_01" position={[6.6, 0, 0.4]} scale={0.7} rotation={[0, 2.3, 0]} />
      <Model name="street_lamp_01" position={[-1.2, 0, -1.95]} rotation={[0, Math.PI, 0]} />
      <Model name="utility_box_01" position={[-7.6, 0, -4.2]} />
      <Model name="trashbag" position={[-4.4, 0, -4.05]} rotation={[0, 1, 0]} />
      <Model name="trashbag" position={[-4.0, 0, -4.15]} rotation={[0, 2.6, 0]} scale={0.85} />
      <Model name="old_tyre" position={[5.8, 0.3, -4.0]} rotation={[0, 0.2, -0.15]} />
      <Model name="plastic_jerrycan" position={[2.6, 0, -1.0]} rotation={[0, 0.7, 0]} tint="#f2c94c" />
      <Model name="plastic_jerrycan" position={[2.85, 0, -0.85]} rotation={[0, -0.4, 0]} tint="#f2c94c" />
      <Model name="cardboard_box_01" position={[-1.75, 0, -0.9]} rotation={[0, 0.5, 0]} />
      <group position={[3.4, 0, 1.6]}>
        <mesh castShadow position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 2.4, 10]} />
          <meshStandardMaterial color="#8d949b" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 2.3, 0.02]}>
          <boxGeometry args={[1.3, 0.34, 0.02]} />
          <meshStandardMaterial map={signTexture('RUE PRINCESSE', '#1971c2', '#fff', 512, 128)} roughness={0.4} metalness={0.3} />
        </mesh>
      </group>
      <EatingCorner />
    </>
  )
}
