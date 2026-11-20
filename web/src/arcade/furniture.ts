import { BIN, CASH, CASHIER, COUNTER, COUNTER_BACK, PADS, SEATS, SLOT0, STATIONS, TABLES, UPGRADE_PADS } from './layout'
import type { IconName } from './Icons'

// Your own design of the maquis (« Construire »): where the stoves, the counter, the tables and the bin stand, and
// the decorations you put where you want. The places of the game (layout.ts) are vectors shared by all the code
// (customers, staff, pads…): moving a piece moves those very vectors, so everything follows without asking.

export type XZ = [number, number]
export type Layout = { st: XZ[]; counter: XZ; tables: XZ[]; bin: XZ }
export type Piece = { kind: 'st'; i: number } | { kind: 'counter' } | { kind: 'table'; i: number } | { kind: 'bin' } | { kind: 'decor'; id: string }

const xz = (v: { x: number; z: number }): XZ => [v.x, v.z]
/** where things stand before you change anything (read once, before any change) */
export const DEFAULT_LAYOUT: Layout = { st: STATIONS.map(xz), counter: xz(COUNTER), tables: TABLES.map(xz), bin: xz(BIN) }

/** Put every piece where the layout says, and everything that goes with it (pads, the queue, the cashier…). */
export function applyLayout(L: Layout | null | undefined) {
  const l = L ?? DEFAULT_LAYOUT
  l.st.forEach(([x, z], i) => {
    STATIONS[i].set(x, 0, z)
    UPGRADE_PADS[i].set(x, 0, z + 2.15)
  })
  ;(['pan2', 'plat1', 'plat2'] as const).forEach((u, k) => PADS[u].pos.set(l.st[k + 1][0], 0, l.st[k + 1][1] + 0.95))
  const [cx, cz] = l.counter
  COUNTER.set(cx, 0, cz)
  COUNTER_BACK.set(cx, 0, cz - 0.85)
  SLOT0.set(cx, 0, cz + 1.25)
  CASH.set(cx + 1.5, 0, cz - 0.5)
  CASHIER.set(cx - 0.6, 0, cz - 0.85)
  PADS.caisse.pos.set(cx + 1.1, 0, cz - 1.6)
  l.tables.forEach(([x, z], i) => {
    TABLES[i].set(x, 0, z)
    SEATS[2 * i].set(x - 0.62, 0, z)
    SEATS[2 * i + 1].set(x + 0.62, 0, z)
  })
  BIN.set(l.bin[0], 0, l.bin[1])
}

// ------------------------------------------------------------------ room taken on the floor
export type Rect = { x0: number; x1: number; z0: number; z1: number }
/** the plot of the maquis, where pieces can go */
export const PLOT: Rect = { x0: -5.5, x1: 5.0, z0: -2.0, z1: 4.1 }
/** the stairs (from the restaurant on) */
export const STAIRS_RECT: Rect = { x0: -5.7, x1: -4.9, z0: -2.0, z1: 1.95 }

/** the floor a piece takes at (x, z), with the room people need around it (the tray of a stove, the queue…) */
export function rectOf(p: Piece, x: number, z: number, decorSize = 0.35): Rect {
  switch (p.kind) {
    case 'st':
      return { x0: x - 0.62, x1: x + 0.62, z0: z - 0.45, z1: z + 1.45 }
    case 'counter':
      return { x0: x - 0.95, x1: x + 1.9, z0: z - 1.2, z1: z + 0.5 }
    case 'table':
      return { x0: x - 1.0, x1: x + 1.0, z0: z - 1.05, z1: z + 0.5 }
    case 'bin':
      return { x0: x - 0.5, x1: x + 0.95, z0: z - 0.95, z1: z + 0.5 }
    default:
      return { x0: x - decorSize, x1: x + decorSize, z0: z - decorSize, z1: z + decorSize }
  }
}
const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1
const inside = (a: Rect, b: Rect) => a.x0 >= b.x0 && a.x1 <= b.x1 && a.z0 >= b.z0 && a.z1 <= b.z1

/** snapped to a 25 cm grid */
export const snap = (v: number) => Math.round(v * 4) / 4

// ------------------------------------------------------------------ decorations
export type DecorKind =
  | 'plante' | 'palmier' | 'fleurs' | 'banc' | 'canape' | 'tapis' | 'masque' | 'djembe' | 'jarre' | 'fontaine'
  | 'lampadaire' | 'ventilo' | 'neon' | 'tonneau' | 'parasol' | 'statue'
export type Decor = { id: string; kind: DecorKind; x: number; z: number; rot: number }

export const DECOR: Record<DecorKind, { label: string; price: number; size: number; icon: IconName; walk?: boolean }> = {
  plante: { label: 'Plante en pot', price: 300, size: 0.3, icon: 'leaves' },
  fleurs: { label: 'Bac à fleurs', price: 450, size: 0.4, icon: 'leaves' },
  palmier: { label: 'Petit palmier', price: 900, size: 0.4, icon: 'leaves' },
  banc: { label: 'Banc en bois', price: 700, size: 0.55, icon: 'chair' },
  canape: { label: 'Canapé en wax', price: 2500, size: 0.6, icon: 'chair' },
  tapis: { label: 'Grand tapis', price: 1200, size: 0.7, icon: 'house', walk: true },
  masque: { label: 'Masque sur socle', price: 1500, size: 0.3, icon: 'boss' },
  statue: { label: 'Statue en bois', price: 2200, size: 0.3, icon: 'person' },
  djembe: { label: 'Djembé', price: 800, size: 0.3, icon: 'soundOn' },
  jarre: { label: 'Jarre en terre', price: 500, size: 0.3, icon: 'bowl' },
  tonneau: { label: 'Tonneau', price: 600, size: 0.35, icon: 'box' },
  fontaine: { label: 'Fontaine', price: 4000, size: 0.6, icon: 'glass' },
  lampadaire: { label: 'Lampadaire', price: 1100, size: 0.3, icon: 'sun' },
  ventilo: { label: 'Ventilateur sur pied', price: 900, size: 0.3, icon: 'fan' },
  neon: { label: 'Néon « MAQUIS »', price: 3000, size: 0.5, icon: 'bolt' },
  parasol: { label: 'Parasol', price: 1000, size: 0.45, icon: 'sun' },
}
/** each decoration makes the place a little nicer: +1 % of customers each, up to +20 % */
export const decorCustomers = (n: number) => 1 + Math.min(20, n) / 100

// ------------------------------------------------------------------ is a place free
/** Can `p` stand at (x, z)? Inside the plot, not on the stairs, not on another piece (decorations on the floor
 *  like a rug don't count). `others`: every other piece with its place. */
export function canPlace(p: Piece, x: number, z: number, others: { p: Piece; x: number; z: number; kind?: DecorKind }[], stairs: boolean, decorKind?: DecorKind) {
  const r = rectOf(p, x, z, decorKind ? DECOR[decorKind].size : 0.35)
  if (!inside(r, PLOT)) return false
  if (stairs && overlap(r, STAIRS_RECT)) return false
  if (decorKind && DECOR[decorKind].walk) return true
  for (const o of others) {
    const k = o.kind
    if (k && DECOR[k].walk) continue
    if (overlap(r, rectOf(o.p, o.x, o.z, k ? DECOR[k].size : 0.35))) return false
  }
  return true
}
