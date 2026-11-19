import { create } from 'zustand'
import { CUSTOMERS, type Customer } from './game/customers'

export type Phase = 'title' | 'arriving' | 'order' | 'cut' | 'fry' | 'serve' | 'result'
export type UpgradeId = 'couteau' | 'poele' | 'bache'

export const UPGRADES: Record<UpgradeId, { label: string; desc: string; price: number }> = {
  couteau: { label: 'Couteau bien aiguisé', desc: 'Le couteau passe moins vite : plus facile de couper droit.', price: 1500 },
  poele: { label: 'Poêle en fonte', desc: 'La zone « bien doré » est plus large.', price: 2000 },
  bache: { label: 'Nouvelle bâche', desc: 'Un parasol tout neuf aux couleurs du pays. Les clients laissent plus de pourboire.', price: 1000 },
}

export type Order = { id: number; customer: Customer; price: number; piment: boolean; line: string }
export type Result = { stars: number; pay: number; tip: number; line: string; cut: number; fry: number; serve: number }

type State = {
  phase: Phase
  name: string
  commune: string
  money: number
  xp: number
  served: number
  order: Order | null
  scores: { cut: number; fry: number; serve: number }
  plate: string[]
  result: Result | null
  upgrades: Partial<Record<UpgradeId, true>>
  shopOpen: boolean
  flash: { id: number; text: string; tone: 'good' | 'ok' | 'bad' } | null
  start: (name: string) => void
  customerArrived: () => void
  acceptOrder: () => void
  finishCut: (score: number) => void
  finishFry: (score: number) => void
  addToPlate: (item: string) => void
  finishServe: (score: number) => void
  nextCustomer: () => void
  buy: (id: UpgradeId) => void
  setShop: (open: boolean) => void
  say: (text: string, tone: 'good' | 'ok' | 'bad') => void
}

/** XP needed to finish level n (1-based). */
export const xpFor = (level: number) => 30 + level * 20
export function levelOf(xp: number) {
  let level = 1
  let left = xp
  while (left >= xpFor(level)) left -= xpFor(level++)
  return { level, into: left, need: xpFor(level) }
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

function makeOrder(served: number): Order {
  const customer = CUSTOMERS[served % CUSTOMERS.length]
  const piment = Math.random() < 0.6
  const price = Math.random() < 0.35 ? 1000 : 500
  const line = pick(piment ? customer.orderPiment : customer.orderSans).replace('{p}', String(price))
  return { id: served, customer, price, piment, line }
}

let flashId = 0

export const useGame = create<State>((set, get) => ({
  phase: 'title',
  name: '',
  commune: 'Yopougon',
  money: 500,
  xp: 0,
  served: 0,
  order: null,
  scores: { cut: 0, fry: 0, serve: 0 },
  plate: [],
  result: null,
  upgrades: {},
  shopOpen: false,
  flash: null,

  start: (name) => set({ name: name.trim() || 'Boss', phase: 'arriving', order: makeOrder(0) }),
  customerArrived: () => set({ phase: 'order' }),
  acceptOrder: () => set({ phase: 'cut', plate: [] }),
  finishCut: (cut) => set((s) => ({ phase: 'fry', scores: { ...s.scores, cut } })),
  finishFry: (fry) => set((s) => ({ phase: 'serve', scores: { ...s.scores, fry } })),
  addToPlate: (item) => set((s) => ({ plate: [...s.plate, item] })),
  finishServe: (serve) => {
    const s = get()
    const { cut, fry } = s.scores
    const total = cut * 0.35 + fry * 0.4 + serve * 0.25
    const stars = total >= 0.8 ? 3 : total >= 0.55 ? 2 : 1
    const c = s.order!.customer
    const tipBase = stars === 3 ? 200 : stars === 2 ? 100 : 0
    const tip = s.upgrades.bache && tipBase ? tipBase + 100 : tipBase
    const pay = stars === 1 ? Math.round(s.order!.price * 0.6) : s.order!.price
    set({
      phase: 'result',
      scores: { cut, fry, serve },
      result: { stars, pay, tip, line: pick(stars === 3 ? c.happy : stars === 2 ? c.ok : c.angry), cut, fry, serve },
      money: s.money + pay + tip,
      xp: s.xp + stars * 10,
      served: s.served + 1,
    })
  },
  nextCustomer: () => set((s) => ({ phase: 'arriving', order: makeOrder(s.served), result: null, plate: [] })),
  buy: (id) =>
    set((s) => (s.upgrades[id] || s.money < UPGRADES[id].price ? s : { money: s.money - UPGRADES[id].price, upgrades: { ...s.upgrades, [id]: true } })),
  setShop: (shopOpen) => set({ shopOpen }),
  say: (text, tone) => set({ flash: { id: ++flashId, text, tone } }),
}))
