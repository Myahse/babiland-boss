import { useMemo } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'

// Real photo-scanned assets from Poly Haven (CC0, free for any use), see public/assets/CREDITS.md.

const base = import.meta.env.BASE_URL + 'assets/'

export type ModelName =
  | 'plastic_monobloc_chair_01' | 'wooden_cutting_board' | 'yellow_onion' | 'fish_knife' | 'pot_enamel_01'
  | 'small_lpg_tank' | 'wooden_bowl_01' | 'wooden_bowl_02' | 'plastic_crate_01' | 'modular_electricity_poles'
  | 'old_tyre' | 'plastic_jerrycan' | 'bananas' | 'wicker_basket_01' | 'island_tree_01' | 'utility_box_01'
  | 'trashbag' | 'cardboard_box_01' | 'food_lime_01' | 'painted_wooden_table' | 'street_lamp_01' | 'wooden_stool_02'

/** One real 3D model, cloned so it can be placed many times. Every mesh casts and receives shadows. */
export function Model({ name, tint, ...group }: { name: ModelName; tint?: THREE.ColorRepresentation } & ThreeElements['group']) {
  const { scene } = useGLTF(`${base}models/${name}.glb`)
  const obj = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = true
      if (tint) {
        m.material = (m.material as THREE.MeshStandardMaterial).clone()
        ;(m.material as THREE.MeshStandardMaterial).color.set(tint)
      }
    })
    return c
  }, [scene, tint])
  return (
    <group {...group}>
      <primitive object={obj} />
    </group>
  )
}

export type TextureName =
  | 'red_laterite_soil_stones' | 'asphalt_02' | 'painted_plaster_wall' | 'yellow_plaster' | 'blue_plaster_weathered'
  | 'red_plaster_weathered' | 'peeling_painted_wall' | 'rusty_corrugated_iron' | 'wood_table_worn' | 'concrete_floor_worn_001'

/** A real PBR surface (colour + relief + roughness), tiled `repeat` times. */
export function usePBR(name: TextureName, repeat: [number, number] = [1, 1]) {
  const t = useTexture({
    map: `${base}textures/${name}/diff.webp`,
    normalMap: `${base}textures/${name}/nor.webp`,
    roughnessMap: `${base}textures/${name}/rough.webp`,
  })
  return useMemo(() => {
    const out: Record<string, THREE.Texture> = {}
    for (const [k, tex] of Object.entries(t)) {
      const c = tex.clone()
      c.wrapS = c.wrapT = THREE.RepeatWrapping
      c.repeat.set(...repeat)
      c.colorSpace = k === 'map' ? THREE.SRGBColorSpace : THREE.NoColorSpace
      c.anisotropy = 8
      c.needsUpdate = true
      out[k] = c
    }
    return out as { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, repeat[0], repeat[1]])
}

export const SKY = `${base}sky.hdr`

export function preloadAssets(names: ModelName[]) {
  names.forEach((n) => useGLTF.preload(`${base}models/${n}.glb`))
}
