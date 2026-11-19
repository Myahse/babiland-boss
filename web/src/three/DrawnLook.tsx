import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

// The "drawn" look (?look=drawn): the same 3D scene, but painted like a cartoon drawing.
// Every material becomes flat colour areas (toon shading in 3 tones) and every object gets a dark
// ink outline (a slightly bigger copy drawn inside-out in black, the classic "inverted hull" trick).
// It works on the animated people too, because the outline copy shares their skeleton.

let ramp: THREE.DataTexture | null = null
function toonRamp() {
  if (!ramp) {
    ramp = new THREE.DataTexture(new Uint8Array([150, 215, 255]), 3, 1, THREE.RedFormat)
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter
    ramp.needsUpdate = true
  }
  return ramp
}

const ink = new Map<number, THREE.Material>()
function inkMaterial(width: number) {
  if (!ink.has(width)) {
    const m = new THREE.MeshBasicMaterial({ color: '#1a0f0a', side: THREE.BackSide })
    m.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normalize(normal) * ${width.toExponential(3)};`)
    }
    // three needs to know the shader differs per width
    m.customProgramCacheKey = () => `ink${width}`
    ink.set(width, m)
  }
  return ink.get(width)!
}

function toToon(m: THREE.Material) {
  const s = m as THREE.MeshStandardMaterial
  if (!(s as THREE.MeshStandardMaterial).isMeshStandardMaterial) return m
  const t = new THREE.MeshToonMaterial({
    color: s.color.clone(),
    map: s.map,
    gradientMap: toonRamp(),
    transparent: s.transparent,
    opacity: s.opacity,
    side: s.side,
    alphaTest: s.alphaTest,
  })
  t.name = s.name
  return t
}

export function DrawnLook() {
  const scene = useThree((s) => s.scene)
  const last = useRef(0)
  useFrame(({ clock }) => {
    // new things appear (customers walking in, food on the plate): convert them every half second
    if (clock.elapsedTime - last.current < 0.5) return
    last.current = clock.elapsedTime
    const todo: THREE.Mesh[] = []
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh && !mesh.userData.drawn && !mesh.userData.ink) todo.push(mesh)
    })
    if (import.meta.env.DEV) Object.assign(window, { drawnScene: scene })
    for (const mesh of todo) {
      mesh.userData.drawn = true
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(toToon) : toToon(mesh.material)
      if (!mesh.geometry.attributes.normal || (mesh.material as THREE.Material).transparent) continue
      // outline thickness grows a little with the object's size (thin on food, bolder on people and houses)
      // thickness wanted in real metres, converted to the model's own units (models come in many scales)
      mesh.geometry.computeBoundingSphere()
      const scale = mesh.getWorldScale(new THREE.Vector3()).x || 1
      const worldR = (mesh.geometry.boundingSphere?.radius ?? 1) * scale
      const metres = (mesh as THREE.SkinnedMesh).isSkinnedMesh ? 0.022 : Math.min(0.035, Math.max(0.008, worldR * 0.025))
      // rounded so only a handful of outline shaders get compiled
      const w = Number((metres / scale).toPrecision(2))
      const outline = (mesh as THREE.SkinnedMesh).isSkinnedMesh
        ? new THREE.SkinnedMesh(mesh.geometry, inkMaterial(w))
        : new THREE.Mesh(mesh.geometry, inkMaterial(w))
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) (outline as THREE.SkinnedMesh).bind((mesh as THREE.SkinnedMesh).skeleton, (mesh as THREE.SkinnedMesh).bindMatrix)
      outline.userData.ink = true
      outline.frustumCulled = false
      outline.castShadow = false
      mesh.add(outline)
    }
  })
  // toon shading ignores the sky reflections, so add soft daylight from everywhere
  return <ambientLight intensity={1.4} color="#fff4e0" />
}
