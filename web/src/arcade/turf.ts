import { create } from 'zustand'
import type { PlaceId } from './places'

// The districts (quartiers) of each place and who owns them (docs/VISION.md, « clash » idea).
// You start in district 0 of a place, working for its boss: he takes a cut of what you earn.
// With enough respect (customers served there) you can betray him: a duel — serve TARGET customers before his
// people do, within the time. Win and the district is yours (no more cut); then attack the other districts,
// which pay you rent. For now the other bosses are played by the computer; online they will be real players.

export type District = { name: string; boss: string; owner: 'me' | 'boss' }

const D = (names: string[], bosses: string[]): District[] => names.map((name, i) => ({ name, boss: bosses[i], owner: 'boss' }))

export const DISTRICTS: Record<PlaceId, District[]> = {
  yopougon: D(['Selmer', 'Niangon', 'Toits-Rouges', 'Siporex'], ['Boss Ladji', 'Mama Bintou', 'Le Vieux Séry', 'Commandant Zézé']),
  cocody: D(['Riviera', 'Angré', 'Deux-Plateaux', 'Blockhaus'], ['Boss Kader', 'Tantie Rose', 'Le Grand Yves', 'Mama Akissi']),
  abobo: D(['Avocatier', 'PK18', 'Anador', 'Samaké'], ['Boss Drissa', 'Mama Salimata', 'Le Vieux Bamba', 'Petit Koné']),
  treichville: D(['Arras', 'Biafra', 'Belleville', 'Habitat'], ['Boss Tapé', 'Tantie Lou', 'Le Doyen Gnahoré', 'Mama Adjoua']),
  bouake: D(['Commerce', 'Air France', 'Koko', 'Dar-es-Salam'], ['Boss Kouassi', 'Mama Amenan', 'Le Vieux Konan', 'Tantie Affoué']),
  korhogo: D(['Soba', 'Petit-Paris', 'Koko', 'Haoussabougou'], ['Boss Soro', 'Mama Fatim', 'Le Vieux Coulibaly', 'Tantie Mariam']),
  gagnoa: D(['Dioulabougou', 'Garahio', 'Babré', 'Commerce'], ['Boss Gbagbo', 'Mama Zadi', 'Le Vieux Dakoury', 'Tantie Gnépo']),
  man: D(['Libreville', 'Domoraud', 'Air France', 'Grand Gbapleu'], ['Boss Tia', 'Mama Gueu', 'Le Vieux Dan', 'Tantie Sahi']),
}

export const CUT = 0.2 // what the boss of your home district takes while you work for him
export const RESPECT_FOR_BETRAYAL = 15 // customers served in this place
export const BETRAY_PRICE = 1000 // to rally the district behind you
export const ATTACK_PRICE = (i: number) => 1500 + i * 1000 // the other districts are harder
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

const KEY = 'babiland-turf-v1'
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

export const ownersOf = (p: PlaceId) => useTurf.getState().owners[p] ?? DISTRICTS[p].map(() => 'boss' as const)
/** Do you still work for the boss of your home district (district 0)? */
export const underBoss = (p: PlaceId) => ownersOf(p)[0] !== 'me'
export const cutFor = (p: PlaceId) => (underBoss(p) ? CUT : 0)

/** Start a duel for district `idx` (0 = betray your own boss). The caller has checked respect and paid. */
export function startDuel(place: PlaceId, idx: number, served: number) {
  // the boss's people serve at a pace that would reach the target a bit before the time runs out
  const rate = DUEL_TARGET / (DUEL_TIME * (0.85 - idx * 0.07))
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
      const owners = [...ownersOf(place)]
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
