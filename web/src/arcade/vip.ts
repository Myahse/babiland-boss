import { create } from 'zustand'
import { dishPrice, PLACES, type Dish, type PlaceId } from './places'
import { bonusOf, cutFor } from './turf'

// VIP customers (docs/VISION.md: « sessions de cuisine à la Cooking Mama »). Now and then a VIP comes to the
// maquis: a golden customer who wants the main dish made in front of him. When he reaches the counter you cook it
// yourself in three little games (cut, cook, plate), and he pays up to 3 times the price, plus a tip.

/** One ingredient: icon + name. */
export type Ing = { icon: string; name: string }
export type Recipe = {
  /** cut these, one after the other (three cuts each, on the dotted lines) */
  cut: Ing[]
  /** cook: in the pan (frying), on the grill, or in the pot */
  cook: { verb: string; food: Ing; on: 'pan' | 'grill' | 'pot' }
  /** plate up in this order; `decoy` is there to trick you */
  plate: Ing[]
  decoy: Ing[]
}

const I = (icon: string, name: string): Ing => ({ icon, name })
const oignon = I('🧅', 'Oignon')
const tomate = I('🍅', 'Tomate')
const piment = I('🌶️', 'Piment')
const attieke = I('🍚', 'Attiéké')
const oeuf = I('🥚', 'Œuf')

/** The recipe of each main dish (the VIP always wants the dish the place is known for). */
export const RECIPES: Partial<Record<Dish, Recipe>> = {
  garba: { cut: [oignon, tomate, piment], cook: { verb: 'Frire le thon', food: I('🐟', 'Thon'), on: 'pan' }, plate: [attieke, I('🐟', 'Thon frit'), oignon, tomate, piment], decoy: [oeuf] },
  alloco: { cut: [I('🍌', 'Banane plantain'), I('🍌', 'Banane plantain')], cook: { verb: 'Frire l’alloco', food: I('🍌', 'Alloco'), on: 'pan' }, plate: [I('🍌', 'Alloco'), oeuf, oignon, piment], decoy: [attieke] },
  choukouya: { cut: [oignon, I('🫑', 'Poivron'), tomate], cook: { verb: 'Griller la viande', food: I('🥩', 'Mouton'), on: 'grill' }, plate: [attieke, I('🥩', 'Choukouya'), oignon, piment], decoy: [I('🍌', 'Alloco')] },
  poisson: { cut: [tomate, oignon], cook: { verb: 'Braiser le poisson', food: I('🐟', 'Carpe'), on: 'grill' }, plate: [attieke, I('🐟', 'Poisson braisé'), I('🥗', 'Sauce crudités'), piment], decoy: [oeuf] },
  kedjenou: { cut: [tomate, oignon, I('🍆', 'Aubergine')], cook: { verb: 'Mijoter le poulet', food: I('🍗', 'Poulet'), on: 'pot' }, plate: [I('🍚', 'Riz'), I('🍗', 'Poulet'), I('🥘', 'Sauce kedjenou'), piment], decoy: [I('🍌', 'Alloco')] },
  to: { cut: [I('🥬', 'Feuilles de baobab'), oignon], cook: { verb: 'Tourner le tô', food: I('🥣', 'Pâte de maïs'), on: 'pot' }, plate: [I('🥣', 'Tô'), I('🥬', 'Sauce feuilles'), I('🐟', 'Poisson fumé'), piment], decoy: [attieke] },
  kplala: { cut: [I('🥬', 'Feuilles de kplala'), oignon, tomate], cook: { verb: 'Mijoter la sauce', food: I('🍲', 'Sauce kplala'), on: 'pot' }, plate: [I('🟡', 'Foutou banane'), I('🍲', 'Sauce kplala'), I('🐟', 'Poisson fumé'), piment], decoy: [oeuf] },
  feuille: { cut: [I('🥬', 'Feuilles de manioc'), oignon], cook: { verb: 'Mijoter la sauce', food: I('🥬', 'Sauce feuille'), on: 'pot' }, plate: [I('🍚', 'Riz'), I('🥬', 'Sauce feuille'), I('🍖', 'Viande'), piment], decoy: [I('🍌', 'Alloco')] },
}

/** Who the VIP is (made-up people, the kind who come with a driver). */
export const VIPS = ['Le Ministre', 'Une star du coupé-décalé', 'Le footballeur pro', 'Le DG de la banque', 'La chanteuse de zouglou', 'Le grand commerçant', 'Le maire', 'L’influenceuse', 'Le boss de Babi', 'Le chef de canton']

export const VIP_EVERY: [number, number] = [70, 110] // seconds of play between two VIPs
export const VIP_FIRST = 35
export const VIP_PATIENCE = 45 // seconds he waits at the counter before leaving
export const VIP_MIN_SERVED = 5 // not before you have served a few customers in this maquis
/** what the plates are worth: x1 (bad) to x3 (perfect) */
export const vipFactor = (score: number) => 1 + 2 * score
export const starsOf = (score: number) => (score >= 0.85 ? 3 : score >= 0.55 ? 2 : 1)

/** What the VIP pays for his plates (the boss of your district still takes his cut), tip included. */
export const vipPay = (place: PlaceId, want: number, score: number) =>
  Math.round(want * dishPrice(PLACES[place], 0) * vipFactor(score) * (1 + bonusOf(place, 'sales')) * (1 - cutFor(place)) * (1 + 0.05 * starsOf(score)))

type Vip = {
  /** the VIP waiting at the counter (the customer id), his name and how many plates he wants */
  ready: { id: number; name: string; want: number; wait: number } | null
  /** the cooking screen is open: the shop is paused */
  open: boolean
  /** set by the cooking screen when done, read by the simulation (which pays and sends him to eat) */
  done: { id: number; score: number } | null
}
export const useVip = create<Vip>(() => ({ ready: null, open: false, done: null }))
if (import.meta.env.DEV) Object.assign(window, { vip: useVip })
