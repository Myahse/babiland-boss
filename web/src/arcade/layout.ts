import * as THREE from 'three'

// Where everything stands on the plot (metres). The shop faces the street (+z).
export const V = (x: number, z: number) => new THREE.Vector3(x, 0, z)

export const STATIONS = [V(-2.2, -1.55), V(-3.7, -1.55)] // garba stations (pan + attiéké); the 2nd one is unlocked
export const COUNTER = V(1.6, -0.1)
export const CASH = V(3.05, -0.55) // where customers' money piles up
export const SLOT0 = V(1.6, 1.15) // first place in the line, in front of the counter
export const SLOT_STEP = V(0.5, 0.62) // the line goes off diagonally, like in the shop games
export const ENTER = V(8, 10)
export const EXIT = V(-9, 5.0)
export const START = V(-0.4, -0.6)
// terrace tables in front of the maquis (unlocked with the « Terrasse » pad): 2 seats each
export const TABLES = [V(-4.3, 1.5), V(-2.5, 2.5), V(-4.3, 3.3)]
export const SEATS = TABLES.flatMap((t) => [t.clone().add(V(-0.62, 0)), t.clone().add(V(0.62, 0))])

export const BOUNDS = { minX: -5.6, maxX: 5.2, minZ: -2.0, maxZ: 4.2 }

/** Boxes the player can't walk through (centre, half size x, half size z). */
export const SOLIDS: { c: THREE.Vector3; hx: number; hz: number }[] = [
  { c: STATIONS[0], hx: 0.55, hz: 0.45 },
  { c: COUNTER, hx: 0.85, hz: 0.4 },
]
/** solid only once the terrace is unlocked */
export const TABLE_SOLIDS = TABLES.map((c) => ({ c, hx: 0.95, hz: 0.45 }))

export type Unlock = 'pan2' | 'serveur' | 'table' | 'plateau' | 'caisse' | 'rapide' | 'moto' | 'livreur'
/** `needs`: the pad only shows up once that other thing is unlocked (staff upgrades, the moto driver). */
export const PADS: Record<Unlock, { pos: THREE.Vector3; price: number; label: string; needs?: Unlock }> = {
  pan2: { pos: V(-5.0, 0.0), price: 400, label: '2e poêle' },
  plateau: { pos: V(-1.3, 0.8), price: 800, label: 'Grand plateau' },
  serveur: { pos: V(0.1, 1.9), price: 1200, label: 'Serveur' },
  table: { pos: V(-1.0, 3.3), price: 2000, label: 'Terrasse' },
  caisse: { pos: V(3.6, -1.7), price: 1500, label: 'Caissière' },
  rapide: { pos: V(0.1, 1.9), price: 2500, label: 'Serveur rapide', needs: 'serveur' },
  moto: { pos: V(4.2, 0.7), price: 1000, label: 'Livraison moto' },
  livreur: { pos: V(4.2, 0.7), price: 3000, label: 'Livreur', needs: 'moto' },
}

export const PLATE_PRICE = 500

/** Station upgrades « Plus vite »: level 1 -> 2 -> 3 (MAX). Faster cooking and room for more plates. */
export const STATION_LEVELS = [
  { cook: 2.6, max: 18 },
  { cook: 1.8, max: 24 },
  { cook: 1.2, max: 30 },
]
export const UPGRADE_PRICES = [600, 1500] // to reach level 2, then level 3
export const UPGRADE_PADS = [V(-0.85, -1.45), V(-5.05, -1.45)]

/** Staff spots */
export const CASHIER = V(1.0, -0.95) // behind the counter, at the cash register
export const MOTO = V(5.05, -1.35) // the delivery moto waits here, by the side street
export const DELIVERY_PRICE = 700 // per plate delivered (more than at the counter)
