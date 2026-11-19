import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import type { PersonId } from '../three/RealPerson'

// Cartoon "animated film" people (Meshy, stylised prompt), in public/assets/toon/<who>.glb with their own walk.
// Every Meshy skeleton uses the same bone names, so the recorded idle animation made for the realistic
// Tantie Aya plays on all of them too: no need to buy animations again for each new person.

const base = import.meta.env.BASE_URL + 'assets/'
export const TOON_READY: PersonId[] = ['aya', 'koffi', 'awa', 'yao', 'fatou']

function bone(root: THREE.Object3D, name: string) {
  let b: THREE.Bone | null = null
  root.traverse((o) => {
    if (!b && (o as THREE.Bone).isBone && o.name.toLowerCase() === name) b = o as THREE.Bone
  })
  return b as THREE.Bone | null
}

/** Remove the hips' travel so a clip plays on the spot (the game moves people itself). */
function inPlace(src: THREE.AnimationClip) {
  const clip = src.clone()
  clip.tracks = clip.tracks
    .filter((t) => !t.name.endsWith('.scale'))
    .map((t) => {
      if (!/hips\.position$/i.test(t.name)) return t
      const v = t.values.slice()
      for (let k = 0; k < v.length; k += 3) {
        v[k] = v[0]
        v[k + 2] = v[2]
      }
      return new THREE.VectorKeyframeTrack(t.name, Array.from(t.times), Array.from(v))
    })
  // the borrowed clips also move the hips up/down for another body size: keep only rotations for them
  return clip
}

/**
 * `track`: the object the simulation moves (its `pos`). The person measures how fast it really goes and
 * picks the animation from that: standing, walking or running, played at the matching pace so the feet
 * don't slide. Without `track`, `moving` just switches walk / idle.
 */
export function ToonPerson({ who, moving, carrying = false, sitting = false, track, ...props }: { who: PersonId; moving: boolean; carrying?: boolean; sitting?: boolean; track?: { pos: THREE.Vector3 } } & ThreeElements['group']) {
  const { scene } = useGLTF(`${base}toon/${who}.glb`)
  const walkFile = useGLTF(`${base}toon/${who}-walk.glb`)
  const runFile = useGLTF(`${base}toon/${who}-run.glb`)
  const idleFile = useGLTF(`${base}people/aya-idle.glb`)
  const model = useMemo(() => {
    const m = SkeletonUtils.clone(scene)
    m.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.frustumCulled = false
      }
    })
    return m
  }, [scene])
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])
  const acts = useMemo(() => {
    const walk = mixer.clipAction(inPlace(walkFile.animations[0]))
    const run = mixer.clipAction(inPlace(runFile.animations[0]))
    const idleClip = inPlace(idleFile.animations[0])
    idleClip.tracks = idleClip.tracks.filter((t) => !t.name.endsWith('.position'))
    const idle = mixer.clipAction(idleClip)
    // start at a random moment, so a line of people doesn't move in sync like robots
    ;[walk, run, idle].forEach((a) => (a.time = Math.random() * a.getClip().duration))
    return { walk, run, idle }
  }, [mixer, walkFile, runFile, idleFile])
  const cur = useRef<THREE.AnimationAction | null>(null)
  const play = (next: THREE.AnimationAction) => {
    if (next === cur.current) return
    next.reset().setEffectiveWeight(1).fadeIn(0.18).play()
    cur.current?.fadeOut(0.18)
    cur.current = next
  }
  useEffect(() => {
    if (!track) play(moving ? acts.walk : acts.idle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving, acts, track])
  // measured speed of the tracked object (smoothed)
  const last = useRef<THREE.Vector3 | null>(null)
  const speed = useRef(0)

  // carrying: both arms held forward under the plates, added on top of the walk / idle
  const arms = useMemo(
    () => ({
      l: bone(model, 'leftarm'), r: bone(model, 'rightarm'), lf: bone(model, 'leftforearm'), rf: bone(model, 'rightforearm'),
      lu: bone(model, 'leftupleg'), ru: bone(model, 'rightupleg'), ll: bone(model, 'leftleg'), rl: bone(model, 'rightleg'),
    }),
    [model],
  )
  const hips = useRef<THREE.Group>(null)
  const k = useRef(0)
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    if (track && dt > 0) {
      const p = track.pos
      const d = last.current ? Math.hypot(p.x - last.current.x, p.z - last.current.z) : 0
      last.current = (last.current ?? new THREE.Vector3()).copy(p)
      speed.current += (d / dt - speed.current) * Math.min(1, dt * 10)
      const v = speed.current
      const size = (props.scale as number) ?? 1
      // natural speeds of the clips for this body size: walk ~1.25 m/s, run ~3.4 m/s
      if (sitting || v < 0.15) play(acts.idle)
      else if (v < 2.1) {
        play(acts.walk)
        acts.walk.timeScale = THREE.MathUtils.clamp(v / (1.25 * size), 0.5, 1.6)
      } else {
        play(acts.run)
        acts.run.timeScale = THREE.MathUtils.clamp(v / (3.4 * size), 0.6, 1.4)
      }
    }
    mixer.update(dt)
    const add = (b: THREE.Bone | null, x: number, y: number, z: number, w = 1) => b && b.quaternion.multiply(q.setFromEuler(e.set(x * w, y * w, z * w)))
    // sitting on a chair: thighs forward, knees bent, the body lowered to the seat
    if (sitting) {
      add(arms.lu, -1.5, 0, 0)
      add(arms.ru, -1.5, 0, 0)
      add(arms.ll, 1.5, 0, 0)
      add(arms.rl, 1.5, 0, 0)
      add(arms.lf, -0.5, 0, 0)
      add(arms.rf, -0.5, 0, 0)
    }
    if (hips.current) hips.current.position.y = sitting ? -0.42 : 0
    k.current += ((carrying ? 1 : 0) - k.current) * Math.min(1, dt * 8)
    const w = k.current
    if (w < 0.01) return
    add(arms.l, -1.0, 0, -0.35, w)
    add(arms.r, -1.0, 0, 0.35, w)
    add(arms.lf, -0.6, 0, 0, w)
    add(arms.rf, -0.6, 0, 0, w)
  })

  return (
    <group {...props}>
      <group ref={hips}>
        <primitive object={model} />
      </group>
    </group>
  )
}
