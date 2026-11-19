import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
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
      {/* ambient occlusion puts soft contact shadows in every corner: the main thing that makes it look solid */}
      <EffectComposer multisampling={0}>
        <N8AO aoRadius={0.6} intensity={2.2} distanceFalloff={0.6} quality="medium" />
        <Bloom luminanceThreshold={0.92} intensity={0.35} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette offset={0.3} darkness={0.35} />
        <SMAA />
      </EffectComposer>
    </>
  )
}

export default function App() {
  return (
    <div className="relative h-full w-full">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 42, near: 0.05, far: 200, position: [0, 3, 6] }} gl={{ antialias: false }}>
        <Scene />
      </Canvas>
      <Hud />
    </div>
  )
}
