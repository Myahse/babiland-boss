import { create } from 'zustand'
import { PADS, type Unlock } from './layout'

// The shop's state. Movement and timers live in refs (every frame); this only holds what the screen shows.
type Arcade = {
  money: number
  cash: number // money waiting on the floor by the counter
  station: number[] // plates ready on each garba station
  counter: number // plates on the counter
  carried: number // plates in Tantie Aya's hands
  workerCarried: number
  served: number
  unlocks: Partial<Record<Unlock, true>>
  paid: Partial<Record<Unlock, number>>
  pop: { id: number; text: string } | null
}

const KEY = 'babiland-arcade-v1'
function load(): Partial<Arcade> {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { money: s.money ?? 0, unlocks: s.unlocks ?? {}, paid: s.paid ?? {}, served: s.served ?? 0 }
  } catch {
    return {}
  }
}

export const useArcade = create<Arcade>(() => ({
  money: 0,
  cash: 0,
  station: [0, 0],
  counter: 0,
  carried: 0,
  workerCarried: 0,
  served: 0,
  unlocks: {},
  paid: {},
  pop: null,
  ...load(),
}))

// keep progress on the phone
useArcade.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ money: s.money + s.cash, unlocks: s.unlocks, paid: s.paid, served: s.served }))
  } catch {
    /* private mode: no saving */
  }
})

let popId = 0
export const popText = (text: string) => useArcade.setState({ pop: { id: ++popId, text } })

export const maxQueue = () => (useArcade.getState().unlocks.table ? 5 : 3)
export const priceLeft = (u: Unlock) => PADS[u].price - (useArcade.getState().paid[u] ?? 0)

// handy in the browser console while developing (and for the screenshot tests)
if (import.meta.env.DEV) Object.assign(window, { arcade: useArcade })
