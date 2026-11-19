import type { ThreeElements } from '@react-three/fiber'
import type * as THREE from 'three'

/**
 * The look: smooth physically-based shading (no flat toon steps, no outlines), lit by the sun and
 * a soft sky environment, with ambient occlusion in the post-processing. `rough` 0 = glossy, 1 = matte.
 */
export function Mat({ color, map, rough = 0.7, ...rest }: { color: THREE.ColorRepresentation; map?: THREE.Texture; rough?: number } & ThreeElements['meshStandardMaterial']) {
  return <meshStandardMaterial color={color} map={map ?? null} roughness={rough} metalness={0} {...rest} />
}
