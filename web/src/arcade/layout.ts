import * as THREE from 'three'
import type { IconName } from './Icons'

// Where everything stands on the plot (metres). The shop faces the street (+z).
export const V = (x: number, z: number) => new THREE.Vector3(x, 0, z)
/** the maquis is laid out 1.3 times wider than it was drawn (more room between the stoves, the counter, the
 *  tables, the aisles): P() places a thing of the plan, sc() a distance of the plan. Offsets (the side of a
 *  chair, behind the counter…) stay V(), the size of the things doesn't change. The ground, the walls and the
 *  building are stretched the same way (a group scaled [S, 1, S], ArcadeApp). */
export const S = 1.3
export const sc = (n: number) => n * S
export const P = (x: number, z: number) => new THREE.Vector3(x * S, 0, z * S)

// the stations along the back wall: 2 for the main dish (the 2nd is unlocked), then one per particular dish
export const STATIONS = [P(-4.3, -1.55), P(-2.8, -1.55), P(-1.3, -1.55), P(0.2, -1.55)]
/** which dish each station makes: 0 = main dish, 1 / 2 = the particular dishes of the place */
export const STATION_SLOT = [0, 0, 1, 2]
export const COUNTER = P(2.35, -0.1)
/** behind the counter, where the staff put the plates down */
export const COUNTER_BACK = COUNTER.clone().add(V(0, -0.85))
export const CASH = P(3.85, -0.6) // where customers' money piles up
export const SLOT0 = P(2.35, 1.15) // first place in the line, in front of the counter
export const SLOT_STEP = V(0.5, 0.62) // the line goes off diagonally, like in the shop games
export const ENTER = P(8.6, 8.9) // new customers come in along the line, from the street corner
export const EXIT = P(-12, 5.6) // along the pavement, out of sight
/** customers leave through the front: down the side lane (inside the low wall), then along the pavement */
export const LANE_X = sc(-5.95)
export const OUT_PATH = [V(LANE_X, sc(5.6)), EXIT]
export const START = P(-0.4, -0.6)
// terrace tables in front of the maquis (unlocked with the « Terrasse » pad): 2 seats each
// terrace tables in one row, with room around them: customers come from the aisle behind (z - 0.8),
// step down into their chair, and leave the same way
export const TABLES = [P(-4.7, 2.75), P(-2.7, 2.75), P(-0.7, 2.75)]
export const SEATS = TABLES.flatMap((t) => [t.clone().add(V(-0.62, 0)), t.clone().add(V(0.62, 0))])

// (the right edge reaches the annexe across the side street: the takeaway window, the delivery point, the parking)
export const BOUNDS = { minX: sc(-5.6), maxX: sc(16.2), minZ: sc(-2.0), maxZ: sc(4.2) }

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
  pan2: { pos: P(-2.8, -0.6), price: 400, label: '2e poste' },
  // the particular dishes: their label is the dish of the place (see Sim)
  plat1: { pos: P(-1.3, -0.6), price: 1500, label: 'Plat 1' },
  plat2: { pos: P(0.2, -0.6), price: 2500, label: 'Plat 2', needs: 'plat1' },
  plateau: { pos: P(-0.8, 1.15), price: 800, label: 'Grand plateau' },
  serveur: { pos: P(1.05, 2.7), price: 1200, label: 'Serveur' },
  table: { pos: P(-2.7, 2.75), price: 2000, label: 'Terrasse' },
  caisse: { pos: P(3.45, -1.7), price: 1500, label: 'Caissière' },
  rapide: { pos: P(1.05, 2.7), price: 2500, label: 'Serveur rapide', needs: 'serveur' },
  moto: { pos: P(4.5, 0.9), price: 1000, label: 'Livraison moto' },
  livreur: { pos: P(4.5, 0.9), price: 3000, label: 'Livreur', needs: 'moto' },
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

/** Station upgrades « Plus vite »: level 1 to 10 (MAX). Each level cooks faster, keeps more plates ready, and
 *  changes the look of the stove (looks.ts: from the rusty drum to the palace range). */
export const STATION_LEVELS = [2.6, 2.2, 1.9, 1.65, 1.45, 1.3, 1.15, 1.02, 0.9, 0.8].map((cook, i) => ({ cook, max: 18 + i * 3 }))
/** the price to reach level 2, 3, … 10 */
export const UPGRADE_PRICES = [600, 1500, 3000, 5000, 8000, 12000, 18000, 26000, 36000]
export const UPGRADE_PADS = STATIONS.map((st) => V(st.x, sc(0.6))) // one under each station

/** Staff spots */
export const CASHIER = P(1.75, -0.95) // behind the counter, at the cash register
export const MOTO = P(5.05, -1.35) // the delivery moto waits here, by the side street
export const DELIVERY_PRICE = 700 // per plate delivered (more than at the counter)

/** where a customer stands in the aisle before stepping into seat `i` */
export const seatApproach = (i: number) => V(SEATS[i].x, TABLES[Math.floor(i / 2)].z - 0.85)

/** Bulk orders (commandes en gros): the crate by the side street where the plates go, and the restaurant's boy. */
export const CRATE = P(4.85, 2.15)
export const BULK_CLIENTS = ['Restaurant Le Baobab', 'Hôtel Ivoire Star', 'Maquis Le Gbê', 'Cantine de l’usine', 'Mariage chez les Konan', 'Baptême à la cité', 'Bureau de la mairie', 'Chantier du nouveau pont']
export const BULK_EVERY: [number, number] = [80, 140] // seconds between two orders
export const BULK_MIN_SERVED = 10
export const BULK_TIME = 100 // seconds to fill it
export const BULK_PAY = 1.6 // x the price of a plate

/** the pad to grow the place (little corner -> maquis -> restaurant -> grand restaurant) */
export const GROW_PAD = P(-3.5, 1.85)
/** The bin, between the counter and the terrace, in plain view: stand on it half a second to throw away the
 *  plates you carry (a dish nobody orders any more, a counter full for that dish). */
export const BIN = P(1.25, 1.2)
/** what you can unlock while the place is still a little corner on the pavement */
export const CORNER_PADS: Unlock[] = ['pan2', 'plateau']

// ------------------------------------------------------------------ the annexe, across the side street
/** the takeaway window (« la vitrine »): a glass kiosk by the front road; stand at its side to fill it */
export const VITRINE = P(11.6, 3.2)
export const VITRINE_DROP = P(10.55, 3.2)
export const VITRINE_MAX = 16
/** the delivery point: a shed with its motos */
export const HUB = P(11.8, -0.9)
/** the parking: four places, the cars come in from the front road */
export const PARK_SPOTS = [P(15.0, -1.3), P(15.0, 0.4), P(15.0, 2.1), P(15.0, 3.8)]
/** the kitchen, around the stoves: a tiled floor, two half walls, the hood, the pass */
export const KITCHEN = { minX: sc(-5.55), maxX: sc(0.95), minZ: sc(-2.2), maxZ: sc(-0.95) }

// ------------------------------------------------------------------ upstairs (the restaurant's terrace)
/** the height of the upstairs floor (the slab of the building, Shop.tsx) */
export const FLOOR1 = 3.02
/** the four tables upstairs, and their eight seats (seat i is at table floor(i / 2)) */
export const UP_TABLES = [-4.1, -1.6, 0.5, 2.8].map((x) => new THREE.Vector3(sc(x), FLOOR1, sc(-2.85)))
export const UP_SEATS = UP_TABLES.flatMap((t) => [t.clone().add(V(-0.62, 0)), t.clone().add(V(0.62, 0))])
// ------------------------------------------------------------------ the extension (« Grand restaurant »)
/** the air-conditioned room built on the empty lot left of the maquis, past its side wall: 4 tables in 2 rows */
export const EXT = { minX: sc(-11.6), maxX: sc(-6.45), minZ: sc(-1.7), maxZ: sc(4.3) }
export const EXT_TABLES = [P(-10.4, -0.1), P(-8.2, -0.1), P(-10.4, 2.4), P(-8.2, 2.4)]
export const EXT_SEATS = EXT_TABLES.flatMap((t) => [t.clone().add(V(-0.62, 0)), t.clone().add(V(0.62, 0))])
/** the way in: along the front of the terrace (between the tables and the stands), through the opening at the end
 *  of the side wall, then the aisle inside the room along that wall */
export const EXT_FRONT_Z = sc(3.75)
export const EXT_AISLE_X = sc(-6.95)
export const EXT_TABLE_SOLIDS = EXT_TABLES.map((c) => ({ c, hx: 0.95, hz: 0.45 }))
/** where the player can walk: the plot, the opening, the room (only once it is built) */
export const EXT_WALK = [
  { minX: sc(-7.3), maxX: sc(-5.5), minZ: sc(3.2), maxZ: sc(4.2) },
  { minX: sc(-11.35), maxX: sc(-6.75), minZ: sc(-1.45), maxZ: sc(4.2) },
]

/** all the tables and seats: the 3 of the ground terrace first, then the 4 upstairs (from the restaurant on), then
 *  the 4 of the extension (from the grand restaurant on) */
export const ALL_TABLES = [...TABLES, ...UP_TABLES, ...EXT_TABLES]
export const ALL_SEATS = [...SEATS, ...UP_SEATS, ...EXT_SEATS]
const FIRST_EXT = SEATS.length + UP_SEATS.length
export const isUp = (seat: number) => seat >= SEATS.length && seat < FIRST_EXT
export const isExt = (seat: number) => seat >= FIRST_EXT
/** table kinds: 0 the terrace downstairs, 1 upstairs, 2 the extension */
export const tableZone = (t: number) => (t < TABLES.length ? 0 : t < TABLES.length + UP_TABLES.length ? 1 : 2)
/** where you stand to sit down / get up: in front of the chair, on the side of the street */
export const approach = (i: number) => (isUp(i) ? new THREE.Vector3(ALL_SEATS[i].x, FLOOR1, sc(-2.25)) : isExt(i) ? V(ALL_SEATS[i].x, ALL_TABLES[Math.floor(i / 2)].z + 0.85) : seatApproach(i))
/** the way from the front of the terrace to an extension seat (and back, reversed) */
export const extPath = (i: number) => {
  const a = approach(i)
  return [V(sc(-5.7), EXT_FRONT_Z), V(EXT_AISLE_X, EXT_FRONT_Z), V(EXT_AISLE_X, a.z), a, ALL_SEATS[i].clone()]
}
/** the stairs, along the left wall: you start climbing at the foot (STAIR_IN), you arrive at the top (STAIR_TOP) */
export const STAIR_X = sc(-5.3)
export const STAIR_IN = V(STAIR_X, sc(1.65))
export const STAIR_FOOT = V(STAIR_X, sc(1.25))
export const STAIR_TOP = new THREE.Vector3(STAIR_X, FLOOR1, sc(-2.15))
export const STAIR_SOLID = { c: V(STAIR_X, sc(-0.35)), hx: 0.33, hz: sc(1.6) }
/** where you can walk upstairs */
export const UP_BOUNDS = { minX: sc(-5.45), maxX: sc(4.4), minZ: sc(-3.75), maxZ: sc(-2.05) }
