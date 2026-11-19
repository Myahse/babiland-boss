import { create } from 'zustand'
import type { PlaceId } from './places'
import { missionEvent } from './missions'
import { addFame } from './store'
import { FAME } from './growth'
import { REAL_DISTRICTS, type RealDistrict } from './realDistricts'

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

/** The bonus of a key zone of another place, named after the real place it stands for. */
const bonus = ([kind, where]: NonNullable<RealDistrict['bonus']>): Bonus => {
  if (kind === 'industry') return { ...B.industry, label: `+30 % de clients (les ouvriers de ${where.replace(/^l[ea’'] ?/, '')} viennent manger)` }
  if (kind === 'market') return { ...B.market, label: `Postes 25 % plus rapides (${where})` }
  if (kind === 'night') return { ...B.night, label: `+20 % sur chaque vente (${where})` }
  if (kind === 'gare') return { ...B.gare, label: `+20 % de clients (${where})` }
  return { icon: '🛍️', label: `+15 % sur chaque vente (${where})`, kind: 'sales', value: 0.15 }
}
/** The real districts of a place (tools/cities.py, from OpenStreetMap). */
const real = (p: string): District[] => REAL_DISTRICTS[p].map((d) => ({ name: d.name, boss: d.boss, cell: [0, 0], n: d.n, ...(d.bonus ? { bonus: bonus(d.bonus) } : {}) }))

/** Map grid of each place: columns x rows. */
export const GRID: Partial<Record<PlaceId, [number, number]>> = {}
/** Places drawn on the real map (their district areas are in public/assets/maps/<place>.json). */
export const REAL_MAP: PlaceId[] = ['yopougon', 'cocody', 'abobo', 'treichville', 'bouake', 'korhogo', 'gagnoa', 'man']
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
  // the other places: their real quarters too (tools/cities.py)
  cocody: real('cocody'),
  abobo: real('abobo'),
  treichville: real('treichville'),
  bouake: real('bouake'),
  korhogo: real('korhogo'),
  gagnoa: real('gagnoa'),
  man: real('man'),
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
// counter-attacks: a neighbouring boss tries to take back one of your districts
export const ATTACK_EVERY = [120, 240] // seconds of play between two counter-attacks (random in this range)
export const WARNING = 8 // seconds of warning before the defence duel starts
export const DEFEND_TARGET = 6 // serve this many to repel them (or hold until the end of the time)
export const SHIELD = 180 // seconds a district is safe after you conquered or defended it
export const GUARD_PRICE = (lvl: number) => 800 * (lvl + 1) // « gros bras » level 1, 2, 3
export const GUARD_MAX = 3
export const GUARD_SLOW = 0.2 // each level slows the attackers by 20 %

/** A duel for a district. `defend`: a boss is attacking one of yours (attacker = index of his district). */
export type Duel = { place: PlaceId; idx: number; left: number; mine: number; rival: number; startServed: number; rate: number; defend?: boolean; attacker?: number }
export type Incoming = { place: PlaceId; idx: number; attacker: number; warn: number }

type Turf = {
  owners: Partial<Record<PlaceId, ('me' | 'boss')[]>>
  duel: Duel | null
  cooldown: number
  rentT: number
  result: { won: boolean; name: string; boss: string; defend?: boolean } | null
  /** a counter-attack announced, the duel starts when `warn` reaches 0 */
  incoming: Incoming | null
  attackT: number
  /** seconds of protection left per district (`place:idx`) */
  shields: Record<string, number>
  /** « gros bras » level per district (`place:idx`) */
  guards: Record<string, number>
  panel: boolean
  /** a district just won: the 3D conquest animation plays before the result card */
  conquest: { place: PlaceId; idx: number } | null
}

const KEY = 'babiland-turf-v3' // v3: the real districts of every place
function load(): Partial<Turf> {
  try {
    const now = localStorage.getItem(KEY)
    if (now) {
      const j = JSON.parse(now)
      return { owners: j.owners ?? {}, guards: j.guards ?? {} }
    }
    // older save: Yopougon already had its real districts, the other places change completely
    const j = JSON.parse(localStorage.getItem('babiland-turf-v2') || '{}')
    const guards = Object.fromEntries(Object.entries(j.guards ?? {}).filter(([k]) => k.startsWith('yopougon:'))) as Record<string, number>
    return { owners: j.owners?.yopougon ? { yopougon: j.owners.yopougon } : {}, guards }
  } catch {
    return {}
  }
}

export const useTurf = create<Turf>(() => ({ owners: {}, duel: null, cooldown: 0, rentT: 0, result: null, panel: false, conquest: null, incoming: null, attackT: 150, shields: {}, guards: {}, ...load() }))
useTurf.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ owners: s.owners, guards: s.guards }))
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

export const keyOf = (p: PlaceId, i: number) => `${p}:${i}`
export const shieldLeft = (p: PlaceId, i: number) => useTurf.getState().shields[keyOf(p, i)] ?? 0
export const guardsOf = (p: PlaceId, i: number) => useTurf.getState().guards[keyOf(p, i)] ?? 0

/** Hire one more level of « gros bras » for one of your districts. Returns the price, or 0 if not possible. */
export function hireGuards(p: PlaceId, i: number, money: number) {
  const lvl = guardsOf(p, i)
  const price = GUARD_PRICE(lvl)
  if (lvl >= GUARD_MAX || money < price) return 0
  useTurf.setState((s) => ({ guards: { ...s.guards, [keyOf(p, i)]: lvl + 1 } }))
  return price
}

/** Pick a counter-attack: one of your districts (not your home, not shielded) that touches a boss's district. */
function pickAttack(place: PlaceId, s: Turf): Incoming | null {
  const owners = ownersOf(place, s)
  const options: Incoming[] = []
  owners.forEach((o, i) => {
    if (o !== 'me' || i === 0 || (s.shields[keyOf(place, i)] ?? 0) > 0) return
    neighbours(place, i)
      .filter((j) => owners[j] !== 'me' && !DISTRICTS[place][j].forest)
      .forEach((j) => options.push({ place, idx: i, attacker: j, warn: WARNING }))
  })
  return options.length ? options[Math.floor(Math.random() * options.length)] : null
}

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
  // shields wear off
  const shields: Record<string, number> = {}
  for (const [k, v] of Object.entries(s.shields)) if (v - dt > 0) shields[k] = v - dt
  patch.shields = shields
  // counter-attacks: only in the place you are in, never during another duel or the conquest animation
  if (!s.duel && !s.conquest && !s.result) {
    if (s.incoming) {
      const warn = s.incoming.warn - dt
      if (warn <= 0) {
        const inc = s.incoming
        // the bodyguards slow the attackers down
        const slow = 1 - GUARD_SLOW * (s.guards[keyOf(inc.place, inc.idx)] ?? 0)
        const rate = (DUEL_TARGET / (DUEL_TIME * 0.9)) * slow
        Object.assign(patch, { incoming: null, panel: false, duel: { place, idx: inc.idx, left: DUEL_TIME, mine: 0, rival: 0, startServed: served, rate, defend: true, attacker: inc.attacker } })
      } else patch.incoming = { ...s.incoming, warn }
    } else {
      const attackT = s.attackT - dt
      if (attackT <= 0) {
        const inc = pickAttack(place, s)
        patch.attackT = ATTACK_EVERY[0] + Math.random() * (ATTACK_EVERY[1] - ATTACK_EVERY[0])
        if (inc) patch.incoming = inc
      } else patch.attackT = attackT
    }
  }
  const d = s.duel
  if (d && d.place === place) {
    const nd = { ...d, left: d.left - dt, mine: served - d.startServed, rival: d.rival + d.rate * dt }
    const D0 = DISTRICTS[place][d.idx]
    if (d.defend) {
      const attacker = DISTRICTS[place][d.attacker ?? 0].boss
      if (nd.mine >= DEFEND_TARGET || nd.left <= 0) {
        // repelled (or they gave up): the district is safe for a while
        Object.assign(patch, { duel: null, shields: { ...shields, [keyOf(place, d.idx)]: SHIELD }, result: { won: true, name: D0.name, boss: attacker, defend: true } })
      } else if (nd.rival >= DUEL_TARGET) {
        const owners = [...ownersOf(place, s)]
        owners[d.idx] = 'boss'
        Object.assign(patch, { duel: null, owners: { ...s.owners, [place]: owners }, result: { won: false, name: D0.name, boss: attacker, defend: true } })
      } else patch.duel = nd
      useTurf.setState(patch)
      return money
    }
    if (nd.mine >= DUEL_TARGET) {
      const owners = [...ownersOf(place, s)]
      owners[d.idx] = 'me'
      missionEvent('district')
      addFame(FAME.district)
      Object.assign(patch, { duel: null, owners: { ...s.owners, [place]: owners }, result: { won: true, name: D0.name, boss: D0.boss }, conquest: REAL_MAP.includes(place) ? { place, idx: d.idx } : null, panel: false, shields: { ...shields, [keyOf(place, d.idx)]: SHIELD } })
    } else if (nd.rival >= DUEL_TARGET || nd.left <= 0) {
      Object.assign(patch, { duel: null, cooldown: COOLDOWN, result: { won: false, name: D0.name, boss: D0.boss } })
    } else patch.duel = nd
  }
  useTurf.setState(patch)
  return money
}

const PLACE_LIST = Object.keys(DISTRICTS) as PlaceId[]

if (import.meta.env.DEV) Object.assign(window, { turf: useTurf })
