import * as THREE from 'three'
import type { IconName } from './Icons'

// Where everything stands on the plot (metres). The shop faces the street (+z).
export const V = (x: number, z: number) => new THREE.Vector3(x, 0, z)

// the stations along the back wall: 2 for the main dish (the 2nd is unlocked), then one per particular dish
export const STATIONS = [V(-4.3, -1.55), V(-2.8, -1.55), V(-1.3, -1.55), V(0.2, -1.55)]
/** which dish each station makes: 0 = main dish, 1 / 2 = the particular dishes of the place */
export const STATION_SLOT = [0, 0, 1, 2]
export const COUNTER = V(2.35, -0.1)
export const CASH = V(3.85, -0.6) // where customers' money piles up
export const SLOT0 = V(2.35, 1.15) // first place in the line, in front of the counter
export const SLOT_STEP = V(0.5, 0.62) // the line goes off diagonally, like in the shop games
export const ENTER = V(8.6, 8.9) // new customers come in along the line, from the street corner
export const EXIT = V(-12, 5.6) // along the pavement, out of sight
/** customers leave through the front: down the side lane (inside the low wall), then along the pavement */
export const LANE_X = -5.95
export const OUT_PATH = [V(LANE_X, 5.6), EXIT]
export const START = V(-0.4, -0.6)
// terrace tables in front of the maquis (unlocked with the « Terrasse » pad): 2 seats each
// terrace tables in one row, with room around them: customers come from the aisle behind (z - 0.8),
// step down into their chair, and leave the same way
export const TABLES = [V(-4.7, 2.75), V(-2.7, 2.75), V(-0.7, 2.75)]
export const SEATS = TABLES.flatMap((t) => [t.clone().add(V(-0.62, 0)), t.clone().add(V(0.62, 0))])

export const BOUNDS = { minX: -5.6, maxX: 5.2, minZ: -2.0, maxZ: 4.2 }

/** Boxes the player can't walk through (centre, half size x, half size z). */
export const SOLIDS: { c: THREE.Vector3; hx: number; hz: number }[] = [
  { c: STATIONS[0], hx: 0.6, hz: 0.45 },
  { c: COUNTER, hx: 0.9, hz: 0.42 },
]
/** solid only once the terrace is unlocked */
export const TABLE_SOLIDS = TABLES.map((c) => ({ c, hx: 0.95, hz: 0.45 }))

export type Unlock = 'pan2' | 'plat1' | 'plat2' | 'serveur' | 'table' | 'plateau' | 'caisse' | 'rapide' | 'moto' | 'livreur'
/** `needs`: the pad only shows up once that other thing is unlocked (staff upgrades, the moto driver). */
export const PADS: Record<Unlock, { pos: THREE.Vector3; price: number; label: string; needs?: Unlock }> = {
  pan2: { pos: V(-2.8, -0.6), price: 400, label: '2e poste' },
  // the particular dishes: their label is the dish of the place (see Sim)
  plat1: { pos: V(-1.3, -0.6), price: 1500, label: 'Plat 1' },
  plat2: { pos: V(0.2, -0.6), price: 2500, label: 'Plat 2', needs: 'plat1' },
  plateau: { pos: V(-0.8, 1.15), price: 800, label: 'Grand plateau' },
  serveur: { pos: V(1.05, 2.7), price: 1200, label: 'Serveur' },
  table: { pos: V(-2.7, 2.75), price: 2000, label: 'Terrasse' },
  caisse: { pos: V(3.45, -1.7), price: 1500, label: 'Caissière' },
  rapide: { pos: V(1.05, 2.7), price: 2500, label: 'Serveur rapide', needs: 'serveur' },
  moto: { pos: V(4.5, 0.9), price: 1000, label: 'Livraison moto' },
  livreur: { pos: V(4.5, 0.9), price: 3000, label: 'Livreur', needs: 'moto' },
}

/** What each pad is for, said on the pad (icon) and in the bubble when you walk up to it. */
export const PAD_INFO: Record<Unlock, { icon: IconName; text: string }> = {
  pan2: { icon: 'fire', text: 'Un 2e réchaud pour ton plat principal : deux fois plus de plats.' },
  plat1: { icon: 'plate', text: 'Un réchaud pour un plat particulier de chez toi : de nouveaux clients le demandent.' },
  plat2: { icon: 'plate', text: 'Le 2e plat particulier, avec son réchaud.' },
  plateau: { icon: 'basket', text: 'Un grand plateau : tu portes 16 plats d’un coup au lieu de 8.' },
  serveur: { icon: 'person', text: 'Un serveur : il porte les plats des réchauds au comptoir pour toi.' },
  table: { icon: 'stool', text: 'La terrasse : des tables où les clients mangent et laissent des pourboires.' },
  caisse: { icon: 'register', text: 'Une caissière : elle sert les clients au comptoir même quand tu n’es pas là.' },
  rapide: { icon: 'bolt', text: 'Ton serveur va plus vite et porte plus de plats.' },
  moto: { icon: 'moto', text: 'La livraison à moto : des commandes au téléphone, mieux payées.' },
  livreur: { icon: 'moto', text: 'Un livreur : il charge la moto tout seul depuis le comptoir.' },
}
export const UPGRADE_INFO = { icon: 'bolt' as IconName, text: 'Ce réchaud cuit plus vite et garde plus de plats prêts.' }

export const PLATE_PRICE = 500

/** Station upgrades « Plus vite »: level 1 -> 2 -> 3 (MAX). Faster cooking and room for more plates. */
export const STATION_LEVELS = [
  { cook: 2.6, max: 18 },
  { cook: 1.8, max: 24 },
  { cook: 1.2, max: 30 },
]
export const UPGRADE_PRICES = [600, 1500] // to reach level 2, then level 3
export const UPGRADE_PADS = STATIONS.map((st) => V(st.x, 0.6)) // one under each station

/** Staff spots */
export const CASHIER = V(1.75, -0.95) // behind the counter, at the cash register
export const MOTO = V(5.05, -1.35) // the delivery moto waits here, by the side street
export const DELIVERY_PRICE = 700 // per plate delivered (more than at the counter)

/** where a customer stands in the aisle before stepping into seat `i` */
export const seatApproach = (i: number) => V(SEATS[i].x, TABLES[Math.floor(i / 2)].z - 0.85)

/** Bulk orders (commandes en gros): the crate by the side street where the plates go, and the restaurant's boy. */
export const CRATE = V(4.85, 2.15)
export const BULK_CLIENTS = ['Restaurant Le Baobab', 'Hôtel Ivoire Star', 'Maquis Le Gbê', 'Cantine de l’usine', 'Mariage chez les Konan', 'Baptême à la cité', 'Bureau de la mairie', 'Chantier du nouveau pont']
export const BULK_EVERY: [number, number] = [80, 140] // seconds between two orders
export const BULK_MIN_SERVED = 10
export const BULK_TIME = 100 // seconds to fill it
export const BULK_PAY = 1.6 // x the price of a plate

/** the pad to grow the place (little corner -> maquis -> restaurant -> grand restaurant) */
export const GROW_PAD = V(-4.9, 1.75)
/** what you can unlock while the place is still a little corner on the pavement */
export const CORNER_PADS: Unlock[] = ['pan2', 'plateau']
