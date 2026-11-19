import { Canvas } from '@react-three/fiber'
import { useGame } from './store'
import { World } from './three/World'
import { Stand } from './three/Stand'
import { Customers } from './three/Customers'
import { CameraRig } from './three/CameraRig'
import { CutGame } from './game/Cut'
import { FryGame } from './game/Fry'
import { Hud } from './ui/Hud'

function Scene() {
  const phase = useGame((s) => s.phase)
  return (
    <>
      <World />
      <Stand />
      <Customers />
      {phase === 'cut' && <CutGame />}
      {phase === 'fry' && <FryGame />}
      <CameraRig />
    </>
  )
}

export default function App() {
  return (
    <div className="relative h-full w-full">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 42, near: 0.05, far: 200, position: [0, 3, 6] }} gl={{ antialias: true }}>
        <Scene />
      </Canvas>
      <Hud />
    </div>
  )
}
