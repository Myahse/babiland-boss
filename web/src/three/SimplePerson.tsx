import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import type { Action, PersonId } from './RealPerson'

// The "ad game" look: smooth low-poly people (Quaternius Ultimate Modular, CC0) on ONE shared skeleton
// with 24 animations included. A new person is just another outfit + new colours: free, light, consistent.

const base = import.meta.env.BASE_URL + 'assets/simple/'
const SKIN = '#5a3420'

const PEOPLE: Record<PersonId, { file: string; colors: Record<string, string> }> = {
  aya: { file: 'female_formal', colors: { Red: '#e8590c', LimeGreen: '#2f9e44', Gold: '#ffd43b', Brown: '#1b1110' } },
  awa: { file: 'female_casual', colors: { White: '#e64980', Orange: '#fcc419', Grey: '#2b1a12', Hair_Brown: '#120c0a', Hair_Blond: '#120c0a', Brown: '#120c0a' } },
  fatou: { file: 'female_medieval', colors: { DarkBrown: '#5f3dc4', LightBrown: '#7048e8', Brown: '#2b8a3e', Brown2: '#2b8a3e', White: '#ffd43b', Black: '#120c0a' } },
  koffi: { file: 'male_casual_2', colors: { White: '#1c7ed6', Red_Dark: '#f76707', LightBrown: '#343a40', LightBlue: '#212529', Hair: '#120c0a' } },
  yao: { file: 'male_worker', colors: { Worker_Yellow: '#f8f9fa', Worker_Vest: '#2b8a3e', LightBrown: '#2b8a3e', Grey: '#343a40', Moustache: '#120c0a' } },
}

// which of the pack's animations plays for each game moment
const CLIP: Record<Action, string> = { idle: 'Idle', walk: 'Walk', talk: 'Interact', happy: 'Wave', ok: 'Idle_Neutral', angry: 'HitRecieve', serve: 'Interact' }
const ONCE: Action[] = ['happy', 'angry', 'serve']

export function SimplePerson({ who, action = 'idle', chopping = false, ...group }: { who: PersonId; action?: Action; chopping?: boolean } & ThreeElements['group']) {
  const p = PEOPLE[who]
  const { scene, animations } = useGLTF(`${base}${p.file}.glb`)
  const model = useMemo(() => {
    const m = SkeletonUtils.clone(scene)
    m.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      const recolor = (mat: THREE.Material) => {
        const c = (mat as THREE.MeshStandardMaterial).clone()
        if (mat.name === 'Skin') c.color.set(SKIN)
        else if (mat.name === 'Skin_Darker') c.color.set(SKIN).multiplyScalar(0.8)
        else if (p.colors[mat.name]) c.color.set(p.colors[mat.name])
        c.roughness = 0.75
        return c
      }
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(recolor) : recolor(mesh.material)
    })
    return m
  }, [scene, p])
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])
  const current = useRef<THREE.AnimationAction | null>(null)

  useEffect(() => {
    const clip = THREE.AnimationClip.findByName(animations, chopping ? 'Interact' : CLIP[action]) ?? THREE.AnimationClip.findByName(animations, 'Idle')
    if (!clip) return
    const next = mixer.clipAction(clip)
    if (ONCE.includes(action) && !chopping) {
      next.setLoop(THREE.LoopRepeat, 2)
      next.clampWhenFinished = true
    } else next.setLoop(THREE.LoopRepeat, Infinity)
    if (next !== current.current) {
      next.reset().fadeIn(0.3).play()
      current.current?.fadeOut(0.3)
      current.current = next
    }
  }, [action, chopping, animations, mixer])

  useFrame((_, dt) => mixer.update(dt))

  return (
    <group {...group}>
      <primitive object={model} />
    </group>
  )
}
