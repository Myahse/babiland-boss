import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import type { PersonId } from '../three/RealPerson'

// Cartoon "animated film" people (Meshy, stylised prompt), in public/assets/toon/<who>.glb with their own
// walk and run. Every Meshy skeleton uses the same bone names, so the recorded idle animation made for the
// Standing still uses no borrowed clip (a clip recorded on another skeleton twists the bones): it is each
// person's own rest pose, arms brought down along the body.
// Carrying and sitting are done by *aiming* the limbs (arms forward under the plates, thighs forward and
// shins down on a chair), which works whatever the axes of each skeleton.

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
  return clip
}

// scratch objects for aiming the limbs
const vA = new THREE.Vector3()
const vB = new THREE.Vector3()
const qA = new THREE.Quaternion()
const qB = new THREE.Quaternion()
const qC = new THREE.Quaternion()

/**
 * Turn `b` so that the direction from it to its child `c` points along `dir` (world space), blended by `w`.
 */
function aim(b: THREE.Bone | null, c: THREE.Bone | null, dir: THREE.Vector3, w: number) {
  if (!b || !c || !b.parent || w <= 0) return
  b.parent.updateWorldMatrix(true, false)
  b.updateWorldMatrix(false, true)
  b.getWorldPosition(vA)
  c.getWorldPosition(vB)
  const cur = vB.sub(vA).normalize()
  qA.setFromUnitVectors(cur, dir)
  b.getWorldQuaternion(qB)
  qB.premultiply(qA) // new world rotation
  b.parent.getWorldQuaternion(qC)
  qB.premultiply(qC.invert()) // back to the parent's space
  b.quaternion.slerp(qB, w)
  b.updateWorldMatrix(false, true)
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
    // start at a random moment, so a line of people doesn't move in sync like robots
    ;[walk, run].forEach((a) => (a.time = Math.random() * a.getClip().duration))
    // standing still has no clip: it is the person's own rest pose with the arms brought down (see below)
    return { walk, run, idle: null }
  }, [mixer, walkFile, runFile])
  const cur = useRef<THREE.AnimationAction | null>(null)
  const play = (next: THREE.AnimationAction | null) => {
    if (next === cur.current) return
    next?.reset().setEffectiveWeight(1).fadeIn(0.2).play()
    cur.current?.fadeOut(0.2)
    cur.current = next
  }
  // every bone's rest rotation, to go back to it when standing still
  const rest = useMemo(() => {
    const r: [THREE.Bone, THREE.Quaternion][] = []
    model.traverse((o) => (o as THREE.Bone).isBone && r.push([o as THREE.Bone, o.quaternion.clone()]))
    return r
  }, [model])
  const idleW = useRef(1)
  useEffect(() => {
    if (!track) play(moving ? acts.walk : acts.idle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving, acts, track])
  // measured speed of the tracked object (smoothed)
  const last = useRef<THREE.Vector3 | null>(null)
  const speed = useRef(0)

  const B = useMemo(
    () => ({
      la: bone(model, 'leftarm'), ra: bone(model, 'rightarm'), lf: bone(model, 'leftforearm'), rf: bone(model, 'rightforearm'),
      lh: bone(model, 'lefthand'), rh: bone(model, 'righthand'),
      lu: bone(model, 'leftupleg'), ru: bone(model, 'rightupleg'), ll: bone(model, 'leftleg'), rl: bone(model, 'rightleg'),
      lfo: bone(model, 'leftfoot'), rfo: bone(model, 'rightfoot'),
    }),
    [model],
  )
  const root = useRef<THREE.Group>(null)
  const hips = useRef<THREE.Group>(null)
  const carryW = useRef(0)
  const sitW = useRef(0)
  const fwd = useMemo(() => new THREE.Vector3(), [])
  const side = useMemo(() => new THREE.Vector3(), [])
  const d = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    if (track && dt > 0) {
      const p = track.pos
      const dist = last.current ? Math.hypot(p.x - last.current.x, p.z - last.current.z) : 0
      last.current = (last.current ?? new THREE.Vector3()).copy(p)
      speed.current += (dist / dt - speed.current) * Math.min(1, dt * 10)
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
    // standing still: blend back to the rest pose (the walk / run fade out at the same time)
    idleW.current += ((cur.current ? 0 : 1) - idleW.current) * Math.min(1, dt * 6)
    const iw = idleW.current
    if (iw > 0.01) for (const [b, q] of rest) b.quaternion.slerp(q, iw)

    // which way the person faces, in the world
    root.current?.getWorldQuaternion(qA)
    fwd.set(0, 0, 1).applyQuaternion(qA).setY(0).normalize()
    // the person's right (facing +z, their right hand is on -x)
    side.set(-1, 0, 0).applyQuaternion(qA).setY(0).normalize()

    // sitting: thighs forward, shins down, body lowered onto the chair
    sitW.current += ((sitting ? 1 : 0) - sitW.current) * Math.min(1, dt * 6)
    const sw = sitW.current
    // a slow breath when standing
    if (hips.current) hips.current.position.y = -0.36 * sw + Math.sin(performance.now() / 700) * 0.006 * iw
    // arms down along the body instead of the spread-out pose the characters were built in
    if (iw > 0.01 && sw < 0.5)
      for (const s of [-1, 1]) {
        const arm = s < 0 ? B.la : B.ra
        const fore = s < 0 ? B.lf : B.rf
        const hand = s < 0 ? B.lh : B.rh
        aim(arm, fore, d.set(0, -1, 0).addScaledVector(side, s * 0.12).addScaledVector(fwd, 0.04).normalize(), iw)
        aim(fore, hand, d.set(0, -1, 0).addScaledVector(fwd, 0.18).addScaledVector(side, s * 0.04).normalize(), iw)
      }
    if (sw > 0.01) {
      for (const s of [-1, 1]) {
        const up = s < 0 ? B.lu : B.ru
        const knee = s < 0 ? B.ll : B.rl
        const foot = s < 0 ? B.lfo : B.rfo
        aim(up, knee, d.copy(fwd).addScaledVector(side, s * 0.12).normalize(), sw)
        aim(knee, foot, d.set(0, -1, 0).addScaledVector(fwd, 0.1).normalize(), sw)
      }
      // hands resting on the lap / table
      for (const s of [-1, 1]) {
        const arm = s < 0 ? B.la : B.ra
        const fore = s < 0 ? B.lf : B.rf
        const hand = s < 0 ? B.lh : B.rh
        aim(arm, fore, d.set(0, -1, 0).addScaledVector(fwd, 0.35).addScaledVector(side, s * 0.15).normalize(), sw * 0.8)
        aim(fore, hand, d.copy(fwd).addScaledVector(side, -s * 0.2).setY(-0.1).normalize(), sw * 0.8)
      }
    }

    // carrying the stack: upper arms down along the body, forearms straight out in front under the plates
    carryW.current += ((carrying ? 1 : 0) - carryW.current) * Math.min(1, dt * 8)
    const cw = carryW.current
    if (cw > 0.01) {
      for (const s of [-1, 1]) {
        const arm = s < 0 ? B.la : B.ra
        const fore = s < 0 ? B.lf : B.rf
        const hand = s < 0 ? B.lh : B.rh
        aim(arm, fore, d.set(0, -1, 0).addScaledVector(fwd, 0.45).addScaledVector(side, s * 0.12).normalize(), cw)
        aim(fore, hand, d.copy(fwd).addScaledVector(side, -s * 0.18).setY(0.05).normalize(), cw)
      }
    }
  })

  return (
    <group {...props}>
      <group ref={root}>
        <group ref={hips}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  )
}
