import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import { ToonPerson } from './ToonPerson'
import type { PersonId } from '../three/RealPerson'

// Development page (?mode=tenues): the ten outfits side by side, on the five characters.
const WHO: PersonId[] = ['aya', 'koffi', 'awa', 'yao', 'fatou']
export default function OutfitGallery() {
  const kind = new URLSearchParams(location.search).get('kind') === 'boss' ? 'boss' : 'cook'
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#fff4e0' }}>
      <Canvas camera={{ position: [0, 1.6, 9], fov: 40 }} dpr={1}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 6, 5]} intensity={2.2} />
        <Suspense fallback={null}>
          {Array.from({ length: 10 }, (_, i) => (
            <ToonPerson key={i} who={WHO[i % 5]} moving={false} outfit={i + 1} outfitKind={kind} position={[(i - 4.5) * 0.95, 0, 0]} scale={1.1} />
          ))}
        </Suspense>
        <OrbitControls target={[0, 0.9, 0]} />
      </Canvas>
    </div>
  )
}
