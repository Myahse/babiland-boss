import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

// The "idle arcade" look of shop-game ads (?look=arcade): the same scene repainted like clean,
// bright clay. Photo textures are replaced by their average colour made brighter and more vivid,
// materials become soft and matte, and the light is a strong sunny daylight with crisp shadows.

const avg = new Map<THREE.Texture, THREE.Color>()
function averageColour(t: THREE.Texture) {
  if (avg.has(t)) return avg.get(t)!
  const img = t.image as CanvasImageSource & { width?: number }
  const c = new THREE.Color('#ffffff')
  try {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 8
    const g = cv.getContext('2d')!
    g.drawImage(img, 0, 0, 8, 8)
    const d = g.getImageData(0, 0, 8, 8).data
    let r = 0, gg = 0, b = 0
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]
      gg += d[i + 1]
      b += d[i + 2]
    }
    const n = d.length / 4
    c.setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace)
  } catch {
    /* image not ready: keep white */
  }
  avg.set(t, c)
  return c
}

/** Brighter, more vivid version of a colour (the cheerful ad palette). */
function vivid(c: THREE.Color) {
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return new THREE.Color().setHSL(hsl.h, Math.min(0.85, hsl.s * 1.2 + 0.05), Math.min(0.8, hsl.l * 1.15 + 0.1))
}

function toClay(m: THREE.Material) {
  const s = m as THREE.MeshStandardMaterial
  if (!s.isMeshStandardMaterial) return m
  // keep small painted textures (signs, wax prints, cut tomato faces): they are already "graphic"
  const isSign = s.map && (s.map as THREE.CanvasTexture).isCanvasTexture
  // people's skin, hair and eyes keep their real colour (only clothes and things get the bright palette)
  const natural = /skin|hair|eye|brow|moustache|beard/i.test(s.name)
  const base = s.map && !isSign ? averageColour(s.map).clone().multiply(s.color) : s.color.clone()
  const out = new THREE.MeshStandardMaterial({
    color: natural ? base : vivid(base),
    map: isSign ? s.map : null,
    roughness: 0.62,
    metalness: 0,
    transparent: s.transparent,
    opacity: s.opacity,
    side: s.side,
  })
  out.name = s.name
  return out
}

export function ArcadeLook() {
  const scene = useThree((s) => s.scene)
  const last = useRef(0)
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 0.5) return
    last.current = clock.elapsedTime
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || mesh.userData.clay) return
      // wait until the photo textures have loaded, so their colour can be read
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      if (mats.some((m) => (m as THREE.MeshStandardMaterial).map && !(m as THREE.MeshStandardMaterial).map!.image)) return
      mesh.userData.clay = true
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(toClay) : toClay(mesh.material)
    })
  })
  return (
    <>
      <hemisphereLight args={['#dff3ff', '#ffd9a8', 1.6]} />
      <ambientLight intensity={0.35} />
    </>
  )
}
