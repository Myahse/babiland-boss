import * as THREE from 'three'

// Where everything stands on the plot (metres). The shop faces the street (+z).
export const V = (x: number, z: number) => new THREE.Vector3(x, 0, z)

export const STATIONS = [V(-2.2, -1.55), V(-3.7, -1.55)] // garba stations (pan + attiéké); the 2nd one is unlocked
export const COUNTER = V(1.6, -0.1)
export const CASH = V(3.05, -0.55) // where customers' money piles up
export const SLOT0 = V(1.6, 1.15) // first place in the line, in front of the counter
export const SLOT_STEP = V(0.8, 0.05)
export const ENTER = V(8.5, 1.4)
export const EXIT = V(-9, 5.0)
export const START = V(-0.4, -0.6)
// terrace tables in front of the maquis (unlocked with the « Terrasse » pad): 2 seats each
export const TABLES = [V(-4.3, 1.5), V(-2.5, 2.5), V(-4.3, 3.3)]
export const SEATS = TABLES.flatMap((t) => [t.clone().add(V(-0.62, 0)), t.clone().add(V(0.62, 0))])

export const BOUNDS = { minX: -5.6, maxX: 4.6, minZ: -2.3, maxZ: 4.2 }

/** Boxes the player can't walk through (centre, half size x, half size z). */
export const SOLIDS: { c: THREE.Vector3; hx: number; hz: number }[] = [
  { c: STATIONS[0], hx: 0.55, hz: 0.45 },
  { c: COUNTER, hx: 0.85, hz: 0.4 },
]
/** solid only once the terrace is unlocked */
export const TABLE_SOLIDS = TABLES.map((c) => ({ c, hx: 0.95, hz: 0.45 }))

export type Unlock = 'pan2' | 'serveur' | 'table'
export const PADS: Record<Unlock, { pos: THREE.Vector3; price: number; label: string }> = {
  pan2: { pos: V(-3.7, -0.2), price: 400, label: '2e poêle' },
  serveur: { pos: V(0.1, 1.9), price: 1200, label: 'Serveur' },
  table: { pos: V(-1.0, 3.3), price: 2000, label: 'Terrasse' },
}

export const PLATE_PRICE = 500
