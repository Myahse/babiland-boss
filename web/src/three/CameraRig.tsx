import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, type Phase } from '../store'
import { BOARD, PAN, PLATE } from './Stand'

type Shot = { pos: [number, number, number]; look: [number, number, number] }
// Seen from above, like a cooking game: the street view looks down steeply on the stand,
// and each cooking step is filmed almost straight down on the board, the pan or the plate.
const MAIN: Shot = { pos: [1.0, 5.2, 3.3], look: [0.9, 0.6, -0.05] }
const SHOTS: Record<Phase, Shot> = {
  title: MAIN,
  arriving: MAIN,
  order: MAIN,
  result: MAIN,
  cut: { pos: [BOARD[0], 1.75, BOARD[2] + 0.32], look: [BOARD[0], 0.98, BOARD[2] + 0.02] },
  fry: { pos: [PAN[0], 1.85, PAN[2] + 0.32], look: [PAN[0], 1.02, PAN[2]] },
  serve: { pos: [PLATE[0], 1.95, PLATE[2] + 0.38], look: [PLATE[0], 0.97, PLATE[2] - 0.02] },
}

/** Glides the camera between the street view and the close-ups of each cooking step. */
export function CameraRig() {
  const phase = useGame((s) => s.phase)
  const { camera, size } = useThree()
  const look = useMemo(() => new THREE.Vector3(...MAIN.look), [])
  const want = useMemo(() => new THREE.Vector3(), [])
  const wantLook = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock }, dt) => {
    const shot = SHOTS[phase]
    const portrait = size.width < size.height
    wantLook.set(...shot.look)
    want.set(...shot.pos)
    // on a phone held upright, step back so the scene still fits the narrow screen
    if (portrait) want.sub(wantLook).multiplyScalar(shot === MAIN ? 1.6 : 1.3).add(wantLook)
    if (phase === 'title') {
      const a = Math.sin(clock.elapsedTime * 0.15) * 0.8
      want.set(Math.sin(a) * 4.5, 6.5, Math.cos(a) * 4.5 + 0.5)
      if (portrait) want.multiplyScalar(1.4)
      wantLook.set(0, 1.1, 0)
    }
    const k = 1 - Math.exp(-dt * 3.2)
    camera.position.lerp(want, k)
    look.lerp(wantLook, k)
    camera.lookAt(look)
  })
  return null
}
