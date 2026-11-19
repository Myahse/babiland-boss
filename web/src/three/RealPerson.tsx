import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'

// Realistic people made with Meshy: text → textured 3D → rigged skeleton → motion-capture animations
// recorded from real actors (walk, idle, talk, cheer…). Files in public/assets/people/:
//   <who>.glb            the rigged, textured character
//   <who>-<action>.glb   one recorded animation for that skeleton (no mesh, a few KB)

const base = import.meta.env.BASE_URL + 'assets/people/'

export type PersonId = 'aya' | 'koffi' | 'awa' | 'yao' | 'fatou'
export type Action = 'idle' | 'walk' | 'talk' | 'happy' | 'ok' | 'angry' | 'serve'

const ACTIONS: Record<PersonId, Action[]> = {
  aya: ['idle', 'talk', 'serve'],
  koffi: ['idle', 'walk', 'talk', 'happy', 'ok', 'angry'],
  awa: ['idle', 'walk', 'talk', 'happy', 'ok', 'angry'],
  yao: ['idle', 'walk', 'talk', 'happy', 'ok', 'angry'],
  fatou: ['idle', 'walk', 'talk', 'happy', 'ok', 'angry'],
}
const ONCE: Action[] = ['happy', 'ok', 'angry', 'serve']
const urls = (who: PersonId) => ACTIONS[who].map((a) => `${base}${who}-${a}.glb`)

function findBone(root: THREE.Object3D, name: string) {
  let found: THREE.Bone | null = null
  root.traverse((o) => {
    if (!found && (o as THREE.Bone).isBone && o.name.toLowerCase() === name) found = o as THREE.Bone
  })
  return found as THREE.Bone | null
}

/**
 * One realistic person playing recorded animations, cross-fading from one to the next.
 * Reactions (happy, ok, angry, serve) play once then go back to idle.
 * `chopping` adds a knife-chopping motion of the right arm on top of the idle (no recorded clip exists for it).
 */
export function RealPerson({ who, action = 'idle', chopping = false, ...group }: { who: PersonId; action?: Action; chopping?: boolean } & ThreeElements['group']) {
  const { scene } = useGLTF(`${base}${who}.glb`)
  const files = useGLTF(urls(who))
  const model = useMemo(() => {
    const m = SkeletonUtils.clone(scene)
    m.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.frustumCulled = false
      }
    })
    return m
  }, [scene])
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])
  const clips = useMemo(() => {
    const out = new Map<Action, THREE.AnimationAction>()
    ACTIONS[who].forEach((a, i) => {
      const src = files[i].animations[0]
      if (!src) return
      const clip = src.clone()
      // stay in place: the game moves people itself, so drop the hips' forward travel (keep the bounce)
      clip.tracks = clip.tracks.map((t) => {
        if (!/hips\.position$/i.test(t.name)) return t
        const v = t.values.slice()
        for (let k = 0; k < v.length; k += 3) {
          v[k] = v[0]
          v[k + 2] = v[2]
        }
        return new THREE.VectorKeyframeTrack(t.name, Array.from(t.times), Array.from(v))
      })
      const act = mixer.clipAction(clip)
      if (ONCE.includes(a)) {
        act.setLoop(THREE.LoopOnce, 1)
        act.clampWhenFinished = true
      }
      out.set(a, act)
    })
    return out
  }, [files, mixer, who])
  const current = useRef<THREE.AnimationAction | null>(null)

  useEffect(() => {
    const play = (a: Action) => {
      const next = clips.get(a) ?? clips.get('idle')
      if (!next || next === current.current) return
      next.reset().setEffectiveWeight(1).fadeIn(0.35).play()
      current.current?.fadeOut(0.35)
      current.current = next
    }
    play(action)
    // after a one-shot reaction, go back to idle
    const done = (e: { action: THREE.AnimationAction }) => {
      if (e.action === current.current && ONCE.includes(action)) play('idle')
    }
    mixer.addEventListener('finished', done)
    return () => mixer.removeEventListener('finished', done)
  }, [action, clips, mixer])

  const arm = useMemo(() => ({ up: findBone(model, 'rightarm'), fore: findBone(model, 'rightforearm'), hand: findBone(model, 'righthand') }), [model])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const chop = useRef(0)

  useFrame(({ clock }, dt) => {
    mixer.update(dt)
    // blend the chopping motion in and out smoothly, layered after the recorded pose
    chop.current += ((chopping ? 1 : 0) - chop.current) * Math.min(1, dt * 6)
    const k = chop.current
    if (k < 0.01) return
    const t = clock.elapsedTime
    const beat = Math.pow(Math.abs(Math.sin(t * 5.5)), 0.6)
    const add = (b: THREE.Bone | null, x: number, y: number, z: number) => b && b.quaternion.multiply(q.setFromEuler(e.set(x * k, y * k, z * k)))
    add(arm.up, -0.55, 0.15, 0.25)
    add(arm.fore, -0.8 - beat * 0.45, 0, 0)
    add(arm.hand, 0.25 - beat * 0.2, 0, 0)
  })

  return (
    <group {...group}>
      <primitive object={model} />
    </group>
  )
}

export function preloadPeople(ids: PersonId[]) {
  ids.forEach((who) => {
    useGLTF.preload(`${base}${who}.glb`)
    urls(who).forEach((u) => useGLTF.preload(u))
  })
}
