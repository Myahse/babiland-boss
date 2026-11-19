import { create } from 'zustand'
import { PADS, type Unlock } from './layout'
import { PLACES, type PlaceId } from './places'

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
  station: number[]
  counter: number
  cash: number
  tableCash: number[]
}

type Arcade = PlaceState & {
  money: number
  current: PlaceId
  owned: PlaceId[]
  places: Partial<Record<PlaceId, PlaceState>>
  delivery: { want: number; got: number; state: 'none' | 'wait' | 'away' } // the moto's current order
  carried: number // plates in Tantie Aya's hands
  workerCarried: number
  pop: { id: number; text: string } | null
}

const fresh = (): PlaceState => ({ served: 0, unlocks: {}, paid: {}, level: [1, 1], upPaid: [0, 0], station: [0, 0], counter: 0, cash: 0, tableCash: [0, 0, 0] })
const pick = (s: Arcade): PlaceState => ({ served: s.served, unlocks: s.unlocks, paid: s.paid, level: s.level, upPaid: s.upPaid, station: s.station, counter: s.counter, cash: s.cash, tableCash: s.tableCash })

const KEY = 'babiland-arcade-v2'
function load(): Partial<Arcade> {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!s) {
      // progress from the first version (one maquis only) becomes your Yopougon maquis
      const old = JSON.parse(localStorage.getItem('babiland-arcade-v1') || '{}')
      return { ...fresh(), money: old.money ?? 0, served: old.served ?? 0, unlocks: old.unlocks ?? {}, paid: old.paid ?? {}, level: old.level ?? [1, 1], upPaid: old.upPaid ?? [0, 0] }
    }
    const current: PlaceId = s.current ?? 'yopougon'
    return { money: s.money ?? 0, owned: s.owned ?? ['yopougon'], places: s.places ?? {}, current, ...fresh(), ...(s.places?.[current] ?? {}) }
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
  carried: 0,
  workerCarried: 0,
  pop: null,
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

/** Customers served in all your maquis together (it sets your level). */
export function totalServed(s: Arcade = useArcade.getState()) {
  return s.owned.reduce((n, id) => n + (id === s.current ? s.served : (s.places[id]?.served ?? 0)), 0)
}

/** Go to another maquis you own: the one you leave keeps its state; plates in your hands stay there. */
export function goTo(id: PlaceId) {
  const s = useArcade.getState()
  if (id === s.current || !s.owned.includes(id)) return
  const places = { ...s.places, [s.current]: { ...pick(s), counter: s.counter + s.carried } }
  useArcade.setState({ places, current: id, ...fresh(), ...(places[id] ?? {}), carried: 0, workerCarried: 0, delivery: { want: 0, got: 0, state: 'none' } })
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
export const popText = (text: string) => useArcade.setState({ pop: { id: ++popId, text } })

export const maxQueue = () => (useArcade.getState().unlocks.table ? 10 : 8)
export const priceLeft = (u: Unlock) => PADS[u].price - (useArcade.getState().paid[u] ?? 0)

// handy in the browser console while developing (and for the screenshot tests)
if (import.meta.env.DEV) Object.assign(window, { arcade: useArcade, arcadeGoTo: goTo, arcadeBuy: buy })
