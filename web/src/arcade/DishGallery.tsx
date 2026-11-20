import { Canvas } from '@react-three/fiber'
import { DishModel } from './DishModels'
import { DISHES, type Dish } from './places'

// Development only (?mode=plats): every dish up close, to check that it looks like the real one.
export default function DishGallery() {
  const ids = Object.keys(DISHES) as Dish[]
  const cols = 5
  return (
    <div className="h-full w-full bg-[#fff4e0]">
      <Canvas camera={{ position: [0, 3.1, 2.3], fov: 32 }} dpr={2} shadows>
        <hemisphereLight args={['#ffffff', '#e8b48a', 1.4]} />
        <directionalLight position={[2, 5, 3]} intensity={2.2} castShadow />
        <group position={[0, 0, -0.35]}>
          {ids.map((id, i) => {
            const x = ((i % cols) - (cols - 1) / 2) * 0.48
            const z = Math.floor(i / cols) * 0.5 - 0.6
            return (
              <group key={id} position={[x, 0, z]}>
                <group scale={1.6}>
                  <DishModel dish={id} look={DISHES[id].look} color={DISHES[id].color} />
                </group>
              </group>
            )
          })}
        </group>
      </Canvas>
    </div>
  )
}
