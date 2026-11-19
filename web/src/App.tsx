import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
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
        <N8AO aoRadius={0.5} intensity={1.6} distanceFalloff={0.5} quality="medium" />
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
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Hud />
      <Loader />
    </div>
  )
}

/** Shown while the real 3D models, textures and sky download. */
function Loader() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#f3e3c3]">
      <div className="w-64 text-center">
        <div className="text-3xl font-extrabold text-[var(--color-orange)]">BABILAND BOSS</div>
        <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-[var(--color-ink)] bg-white">
          <div className="h-full bg-[var(--color-green)]" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 text-sm font-bold">On prépare le quartier… {Math.round(progress)} %</div>
      </div>
    </div>
  )
}
