import { create } from 'zustand'
import type { PlaceId } from './places'

// The districts (quartiers) of each place and who owns them (docs/VISION.md, « clash » idea).
// You start in district 0 of a place, working for its boss: he takes a cut of what you earn.
// With enough respect (customers served there) you can betray him: a duel — serve TARGET customers before his
// people do, within the time. Win and the district is yours (no more cut); then attack the other districts,
// which pay you rent. For now the other bosses are played by the computer; online they will be real players.

/** A bonus given by a key zone while you own it. */
export type Bonus = { icon: string; label: string; kind: 'sales' | 'customers' | 'cook'; value: number }
/** `cell`: where the district sits on the map grid of its place (column, row). */
export type District = { name: string; boss: string; cell: [number, number]; bonus?: Bonus; forest?: boolean; n?: number[] }

const B = {
  industry: { icon: '🏭', label: '+30 % de clients (les ouvriers viennent manger)', kind: 'customers', value: 0.3 },
  market: { icon: '🧺', label: 'Postes 25 % plus rapides (le marché La Paix)', kind: 'cook', value: 0.25 },
  night: { icon: '🌙', label: '+20 % sur chaque vente (le marché de nuit La Référence)', kind: 'sales', value: 0.2 },
  gare: { icon: '🚌', label: '+20 % de clients (la gare des gbaka)', kind: 'customers', value: 0.2 },
} satisfies Record<string, Bonus>

/** 4 districts on a 2 x 2 map (the other places, for now). */
const D = (names: string[], bosses: string[]): District[] => names.map((name, i) => ({ name, boss: bosses[i], cell: [[0, 1], [1, 1], [0, 0], [1, 0]][i] as [number, number] }))

/** Map grid of each place: columns x rows. */
export const GRID: Partial<Record<PlaceId, [number, number]>> = {}
/** Places drawn on the real map (their district areas are in public/assets/maps/<place>.json). */
export const REAL_MAP: PlaceId[] = ['yopougon']
export const gridOf = (p: PlaceId) => GRID[p] ?? ([2, 2] as [number, number])

export const DISTRICTS: Record<PlaceId, District[]> = {
  // Yopougon: 12 real districts; their areas come from where the real shops and maquis are (OpenStreetMap,
  // public/assets/maps/yopougon.json), `n` = the districts that really share a border with them.
  yopougon: [
    { name: 'Selmer', boss: 'Boss Ladji', cell: [0, 0], n: [1, 2, 3, 5, 11] },
    { name: 'Wassakara', boss: 'Mama Bintou', cell: [0, 0], n: [0, 2, 10] },
    { name: 'Siporex', boss: 'Commandant Zézé', cell: [0, 0], n: [0, 1, 3, 4, 7, 10], bonus: B.gare },
    { name: 'Score', boss: 'Le Vieux Séry', cell: [0, 0], n: [0, 2, 4, 5] },
    { name: 'Banco 2', boss: 'DJ Kpakpato', cell: [0, 0], n: [2, 3, 5, 6, 7], bonus: B.night },
    { name: 'Sogefiha', boss: 'Tantie Clémence', cell: [0, 0], n: [0, 3, 4, 6, 11] },
    { name: 'Quartier Maroc', boss: 'Tonton Gnaoré', cell: [0, 0], n: [4, 5, 7] },
    { name: 'Port-Bouët II', boss: 'Le Grand Bagnon', cell: [0, 0], n: [2, 4, 6, 9, 10] },
    { name: 'Micao', boss: 'Mama Akoua', cell: [0, 0], n: [9, 10], bonus: B.market },
    { name: 'Gesco', boss: 'Boss Yacou', cell: [0, 0], n: [7, 8, 10] },
    { name: 'Zone Industrielle', boss: 'Le Patron Konaté', cell: [0, 0], n: [1, 2, 7, 8, 9], bonus: B.industry },
    { name: 'Koweït', boss: 'Petit Zadi', cell: [0, 0], n: [0, 5] },
  ],
  cocody: D(['Riviera', 'Angré', 'Deux-Plateaux', 'Blockhaus'], ['Boss Kader', 'Tantie Rose', 'Le Grand Yves', 'Mama Akissi']),
  abobo: D(['Avocatier', 'PK18', 'Anador', 'Samaké'], ['Boss Drissa', 'Mama Salimata', 'Le Vieux Bamba', 'Petit Koné']),
  treichville: D(['Arras', 'Biafra', 'Belleville', 'Habitat'], ['Boss Tapé', 'Tantie Lou', 'Le Doyen Gnahoré', 'Mama Adjoua']),
  bouake: D(['Commerce', 'Air France', 'Koko', 'Dar-es-Salam'], ['Boss Kouassi', 'Mama Amenan', 'Le Vieux Konan', 'Tantie Affoué']),
  korhogo: D(['Soba', 'Petit-Paris', 'Koko', 'Haoussabougou'], ['Boss Soro', 'Mama Fatim', 'Le Vieux Coulibaly', 'Tantie Mariam']),
  gagnoa: D(['Dioulabougou', 'Garahio', 'Babré', 'Commerce'], ['Boss Gbagbo', 'Mama Zadi', 'Le Vieux Dakoury', 'Tantie Gnépo']),
  man: D(['Libreville', 'Domoraud', 'Air France', 'Grand Gbapleu'], ['Boss Tia', 'Mama Gueu', 'Le Vieux Dan', 'Tantie Sahi']),
}

/** Districts touching district `i` on the map (you can only attack next to what you hold). */
export function neighbours(p: PlaceId, i: number) {
  if (DISTRICTS[p][i].n) return DISTRICTS[p][i].n!
  const [c, r] = DISTRICTS[p][i].cell
  return DISTRICTS[p].map((d, j) => (j !== i && !d.forest && Math.abs(d.cell[0] - c) + Math.abs(d.cell[1] - r) === 1 ? j : -1)).filter((j) => j >= 0)
}

export const CUT = 0.2 // what the boss of your home district takes while you work for him
export const RESPECT_FOR_BETRAYAL = 15 // customers served in this place
export const BETRAY_PRICE = 1000 // to rally the district behind you
export const ATTACK_PRICE = (p: PlaceId, i: number) => 1500 + i * 500 + (DISTRICTS[p][i].bonus ? 2000 : 0) // key zones cost more
export const DUEL_TIME = 60
export const DUEL_TARGET = 8
export const COOLDOWN = 90 // seconds before trying again after losing
export const RENT = 150 // what each district you own pays you every RENT_EVERY seconds
export const RENT_EVERY = 30

export type Duel = { place: PlaceId; idx: number; left: number; mine: number; rival: number; startServed: number; rate: number }

type Turf = {
  owners: Partial<Record<PlaceId, ('me' | 'boss')[]>>
  duel: Duel | null
  cooldown: number
  rentT: number
  result: { won: boolean; name: string; boss: string } | null
  panel: boolean
}

const KEY = 'babiland-turf-v2' // v2: the real districts of Yopougon
function load(): Partial<Turf> {
  try {
    return { owners: JSON.parse(localStorage.getItem(KEY) || '{}').owners ?? {} }
  } catch {
    return {}
  }
}

export const useTurf = create<Turf>(() => ({ owners: {}, duel: null, cooldown: 0, rentT: 0, result: null, panel: false, ...load() }))
useTurf.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ owners: s.owners }))
  } catch {
    /* private mode */
  }
})

/** Owner of every district of a place (older saves had fewer districts: the new ones belong to their boss). */
export const ownersOf = (p: PlaceId, s = useTurf.getState()) => DISTRICTS[p].map((_, i) => (s.owners[p]?.[i] === 'me' ? ('me' as const) : ('boss' as const)))
/** Can you attack district i: your own district freed, i touches one of yours, not already yours. */
export const canAttack = (p: PlaceId, i: number, owners = ownersOf(p)) => i > 0 && !DISTRICTS[p][i].forest && owners[0] === 'me' && owners[i] !== 'me' && neighbours(p, i).some((j) => owners[j] === 'me')
/** Total bonus of a kind from the key zones you own in a place (0.3 = +30 %). */
export const bonusOf = (p: PlaceId, kind: Bonus['kind']) => {
  const o = ownersOf(p)
  return DISTRICTS[p].reduce((n, d, i) => n + (o[i] === 'me' && d.bonus?.kind === kind ? d.bonus.value : 0), 0)
}
/** Do you still work for the boss of your home district (district 0)? */
export const underBoss = (p: PlaceId) => ownersOf(p)[0] !== 'me'
export const cutFor = (p: PlaceId) => (underBoss(p) ? CUT : 0)

/** Start a duel for district `idx` (0 = betray your own boss). The caller has checked respect and paid. */
export function startDuel(place: PlaceId, idx: number, served: number) {
  // the boss's people serve at a pace that would reach the target a bit before the time runs out
  const key = DISTRICTS[place][idx].bonus ? 0.12 : 0
  const rate = DUEL_TARGET / (DUEL_TIME * (0.85 - key - Math.min(0.15, idx * 0.025)))
  useTurf.setState({ duel: { place, idx, left: DUEL_TIME, mine: 0, rival: 0, startServed: served, rate }, result: null })
}

/** Called every frame by the shop simulation. Returns money to add (rent). */
export function tickTurf(place: PlaceId, served: number, dt: number) {
  const s = useTurf.getState()
  let money = 0
  // rent from the districts you own (except the one your maquis is in)
  const owned = PLACE_LIST.reduce((n, p) => n + (s.owners[p] ?? []).filter((o, i) => o === 'me' && i > 0).length, 0)
  let rentT = s.rentT + dt
  if (rentT >= RENT_EVERY) {
    rentT = 0
    money = owned * RENT
  }
  const patch: Partial<Turf> = { rentT, cooldown: Math.max(0, s.cooldown - dt) }
  const d = s.duel
  if (d && d.place === place) {
    const nd = { ...d, left: d.left - dt, mine: served - d.startServed, rival: d.rival + d.rate * dt }
    const D0 = DISTRICTS[place][d.idx]
    if (nd.mine >= DUEL_TARGET) {
      const owners = [...ownersOf(place, s)]
      owners[d.idx] = 'me'
      Object.assign(patch, { duel: null, owners: { ...s.owners, [place]: owners }, result: { won: true, name: D0.name, boss: D0.boss } })
    } else if (nd.rival >= DUEL_TARGET || nd.left <= 0) {
      Object.assign(patch, { duel: null, cooldown: COOLDOWN, result: { won: false, name: D0.name, boss: D0.boss } })
    } else patch.duel = nd
  }
  useTurf.setState(patch)
  return money
}

const PLACE_LIST = Object.keys(DISTRICTS) as PlaceId[]

if (import.meta.env.DEV) Object.assign(window, { turf: useTurf })
