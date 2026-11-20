import { FRESH_STYLE, grownStyle, normStyle, type Style } from './styles'
import { create } from 'zustand'
import { PADS, type Unlock } from './layout'
import { PLACES, type PlaceId } from './places'
import { FAME_AT, fameLevel, fameNews, STAGES } from './growth'

// The game's state. Movement and timers live in refs (every frame); this only holds what the screen shows.
// The money is yours wherever you are; everything else belongs to the maquis you are in, and is kept
// per place when you go somewhere else (each maquis keeps its stations, staff, terrace…).

/** What one maquis keeps when you leave it. */
type PlaceState = {
  served: number
  unlocks: Partial<Record<Unlock, true>>
  paid: Partial<Record<Unlock, number>>
  level: number[]
  upPaid: number[]
  station: number[] // plates ready on each station (see STATION_SLOT)
  counter: number[] // plates waiting on the counter, per dish slot (main, particular 1, particular 2)
  cash: number
  tableCash: number[]
  /** the small businesses on the pavement (side.ts): level of each stand (0 = not open), paid toward the next level, money waiting */
  side: number[]
  sidePaid: number[]
  sideCash: number[]
  /** how big the place has grown (growth.ts): 0 little corner, 1 maquis, 2 restaurant, 3 grand restaurant */
  stage: number
  /** how much people talk about you here */
  fame: number
  /** paid toward the next stage */
  growPaid: number
  /** assistants and things for the room bought in « Aménager » (items.ts) */
  items: string[]
  /** the look of each part of the place, 1..10 (styles.ts) */
  style: Style
  /** plates waiting in the takeaway window of the annexe */
  vitrine: number
}

type Arcade = PlaceState & {
  money: number
  current: PlaceId
  owned: PlaceId[]
  places: Partial<Record<PlaceId, PlaceState>>
  delivery: { want: number; got: number; state: 'none' | 'wait' | 'away' } // the moto's current order
  carried: number[] // plates in Tantie Aya's hands (dish slot of each, bottom to top)
  workerCarried: number[]
  pop: { id: number; text: string } | null
  /** a moment to celebrate (not saved): the place just grew, or more people know you */
  news: { id: number; kind: 'grow' | 'fame'; level: number } | null
  /** where you are: walking in the street of your quarter, or inside your maquis (not saved) */
  view: 'quartier' | 'maquis'
  /** fresh produce from the market: the stoves cook faster until then (ms, not saved) */
  marketUntil: number
  /** the map of the places is open (from the HUD, or the gbaka station) */
  mapOpen: boolean
  /** how the maquis is seen: inside (close), outside (the street and the annexe), the upstairs terrace */
  cam: 'dedans' | 'dehors' | 'terrasse'
  /** a bulk order from a restaurant (not saved): plates of one dish to put in the crate before the time runs out */
  bulk: { name: string; dish: number; want: number; got: number; left: number; time: number } | null
}

const fresh = (): PlaceState => ({ served: 0, unlocks: {}, paid: {}, level: [1, 1, 1, 1], upPaid: [0, 0, 0, 0], station: [0, 0, 0, 0], counter: [0, 0, 0], cash: 0, tableCash: [0, 0, 0], side: [0, 0, 0], sidePaid: [0, 0, 0], sideCash: [0, 0, 0], stage: 0, fame: 0, growPaid: 0, items: [], style: { ...FRESH_STYLE }, vitrine: 0 })
/** saved games from before the particular dishes: make every list the right length */
function norm(p: Partial<PlaceState> = {}): PlaceState {
  const f = fresh()
  const fit = (a: unknown, d: number[]) => d.map((v, i) => (Array.isArray(a) && typeof a[i] === 'number' ? a[i] : v))
  // saves from before the growth stages: a place you already worked in is a maquis, and people know you a bit
  const old = p.stage === undefined && ((p.served ?? 0) > 0 || Object.keys(p.unlocks ?? {}).length > 0)
  if (old) p = { ...p, stage: 1, fame: Math.max(FAME_AT[1], p.served ?? 0) }
  return { ...f, ...p, items: Array.isArray(p.items) ? p.items : [], style: p.style ? normStyle(p.style) : grownStyle(p.stage ?? 0), level: fit(p.level, f.level), upPaid: fit(p.upPaid, f.upPaid), station: fit(p.station, f.station), counter: typeof p.counter === 'number' ? [p.counter, 0, 0] : fit(p.counter, f.counter), tableCash: fit(p.tableCash, f.tableCash), side: fit(p.side, f.side), sidePaid: fit(p.sidePaid, f.sidePaid), sideCash: fit(p.sideCash, f.sideCash) }
}
const pick = (s: Arcade): PlaceState => ({ served: s.served, unlocks: s.unlocks, paid: s.paid, level: s.level, upPaid: s.upPaid, station: s.station, counter: s.counter, cash: s.cash, tableCash: s.tableCash, side: s.side, sidePaid: s.sidePaid, sideCash: s.sideCash, stage: s.stage, fame: s.fame, growPaid: s.growPaid, items: s.items, style: s.style, vitrine: s.vitrine })

const KEY = 'babiland-arcade-v2'
function load(): Partial<Arcade> {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!s) {
      // progress from the first version (one maquis only) becomes your Yopougon maquis
      const old = JSON.parse(localStorage.getItem('babiland-arcade-v1') || '{}')
      return { ...norm({ served: old.served ?? 0, unlocks: old.unlocks ?? {}, paid: old.paid ?? {}, level: old.level, upPaid: old.upPaid }), money: old.money ?? 0 }
    }
    const current: PlaceId = s.current ?? 'yopougon'
    return { money: s.money ?? 0, owned: s.owned ?? ['yopougon'], places: s.places ?? {}, current, ...norm(s.places?.[current]) }
  } catch {
    return {}
  }
}

export const useArcade = create<Arcade>(() => ({
  ...fresh(),
  money: 0,
  current: 'yopougon',
  owned: ['yopougon'],
  places: {},
  delivery: { want: 0, got: 0, state: 'none' },
  carried: [],
  workerCarried: [],
  pop: null,
  news: null,
  bulk: null,
  view: 'maquis',
  marketUntil: 0,
  mapOpen: false,
  cam: 'dedans',
  ...load(),
}))

// keep progress on the phone
useArcade.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ money: s.money, current: s.current, owned: s.owned, places: { ...s.places, [s.current]: pick(s) } }))
  } catch {
    /* private mode: no saving */
  }
})

/** The saved state of one of your maquis (the one you are in, or one you left). */
export function placeState(id: PlaceId, s: Arcade = useArcade.getState()): PlaceState {
  return id === s.current ? pick(s) : norm(s.places[id])
}

/** Customers served in all your maquis together (it sets your level). */
export function totalServed(s: Arcade = useArcade.getState()) {
  return s.owned.reduce((n, id) => n + (id === s.current ? s.served : (s.places[id]?.served ?? 0)), 0)
}

/** Go to another maquis you own: the one you leave keeps its state; plates in your hands stay there. */
export function goTo(id: PlaceId) {
  const s = useArcade.getState()
  if (id === s.current || !s.owned.includes(id)) return
  const counter = [...s.counter]
  s.carried.forEach((k) => counter[k]++)
  const places = { ...s.places, [s.current]: { ...pick(s), counter } }
  useArcade.setState({ places, current: id, ...norm(places[id]), carried: [], workerCarried: [], delivery: { want: 0, got: 0, state: 'none' }, bulk: null })
  popText(`Bienvenue à ${PLACES[id].name} !`)
}

/** Buy a new maquis (needs the level and the money), then go there. */
export function buy(id: PlaceId) {
  const s = useArcade.getState()
  const p = PLACES[id]
  if (s.owned.includes(id) || s.money < p.price) return
  useArcade.setState({ money: s.money - p.price, owned: [...s.owned, id] })
  goTo(id)
}

let popId = 0
// the game's messages are written without emojis (they look generated): any left in a text is taken out
const NO_EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu
export const popText = (text: string) => useArcade.setState({ pop: { id: ++popId, text: text.replace(NO_EMOJI, '').replace(/\s+/g, ' ').trim() } })

export const maxQueue = () => {
  const s = useArcade.getState()
  return STAGES[s.stage].queue + (s.unlocks.table && s.stage >= 1 ? 2 : 0)
}

let newsId = 0
export const celebrate = (kind: 'grow' | 'fame', level: number) => useArcade.setState({ news: { id: ++newsId, kind, level } })
/** People talk about you here: fame points, and the news when more people know you. */
export function addFame(n: number) {
  const s = useArcade.getState()
  const before = fameLevel(s.fame)
  const fame = s.fame + n
  useArcade.setState({ fame })
  const after = fameLevel(fame)
  if (after > before) {
    popText(`${fameNews(s.current, after)}`)
    celebrate('fame', after)
  }
}
export const priceLeft = (u: Unlock) => PADS[u].price - (useArcade.getState().paid[u] ?? 0)

// handy in the browser console while developing (and for the screenshot tests)
if (import.meta.env.DEV) Object.assign(window, { arcade: useArcade, arcadeGoTo: goTo, arcadeBuy: buy })
