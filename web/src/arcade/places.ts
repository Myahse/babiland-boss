import { createContext } from 'react'

// The places you can own, each with its own dish (see docs/VISION.md): you start in Yopougon with garba,
// then buy a maquis in other communes of Abidjan and in other cities as your level goes up.

export type Dish =
  | 'garba' | 'alloco' | 'choukouya' | 'poisson' | 'kedjenou' | 'to' | 'kplala' | 'feuille'
  | 'porc' | 'the' | 'poulet' | 'bissap' | 'gnamakoudji' | 'claclo' | 'foutou' | 'rizgras' | 'degue' | 'foutoubanane' | 'cafe' | 'rizarachide'

/** Every dish of the game: its name, its icon in the bubbles, and how it looks on the plate. */
export const DISHES: Record<Dish, { label: string; icon: string; look: 'garba' | 'alloco' | 'choukouya' | 'poisson' | 'kedjenou' | 'to' | 'kplala' | 'feuille' | 'meat' | 'drink' | 'balls' | 'mound'; color?: string; sauce?: string }> = {
  garba: { label: 'Garba', icon: '🐟', look: 'garba' },
  alloco: { label: 'Alloco', icon: '🍌', look: 'alloco' },
  choukouya: { label: 'Choukouya', icon: '🍖', look: 'choukouya' },
  poisson: { label: 'Poisson braisé', icon: '🐠', look: 'poisson' },
  kedjenou: { label: 'Kedjenou', icon: '🍗', look: 'kedjenou' },
  to: { label: 'Tô', icon: '🥣', look: 'to' },
  kplala: { label: 'Sauce kplala', icon: '🍲', look: 'kplala' },
  feuille: { label: 'Sauce feuille', icon: '🥬', look: 'feuille' },
  porc: { label: 'Porc au four', icon: '🥓', look: 'meat', color: '#b5562a' },
  the: { label: 'Thé', icon: '🍵', look: 'drink', color: '#8a4b1c' },
  poulet: { label: 'Poulet braisé', icon: '🍗', look: 'meat', color: '#c8641c' },
  bissap: { label: 'Bissap', icon: '🥤', look: 'drink', color: '#a61e4d' },
  gnamakoudji: { label: 'Gnamakoudji', icon: '🧃', look: 'drink', color: '#f2c94c' },
  claclo: { label: 'Claclo', icon: '🟠', look: 'balls', color: '#d9822b' },
  foutou: { label: 'Foutou igname', icon: '⚪', look: 'mound', color: '#fff9db', sauce: '#c2410c' },
  rizgras: { label: 'Riz gras', icon: '🍛', look: 'mound', color: '#e8590c', sauce: '#c92a2a' },
  degue: { label: 'Dêguê', icon: '🥛', look: 'drink', color: '#f8f9fa' },
  foutoubanane: { label: 'Foutou banane', icon: '🟡', look: 'mound', color: '#ffd43b', sauce: '#4a2a12' },
  cafe: { label: 'Café', icon: '☕', look: 'drink', color: '#3b2314' },
  rizarachide: { label: 'Riz sauce arachide', icon: '🥜', look: 'mound', color: '#ffffff', sauce: '#b8621b' },
}
export type PlaceId = 'yopougon' | 'cocody' | 'abobo' | 'treichville' | 'bouake' | 'korhogo' | 'gagnoa' | 'man'

export type Place = {
  name: string
  dish: Dish
  dishLabel: string // on the sign: « GARBA CHEZ … »
  level: number // level needed to buy it
  price: number // price of the maquis
  plate: number // price of one plate there (FCFA)
  wall: string
  awning: [string, string]
  city: boolean // another city, not a commune of Abidjan
  /** the particular dishes of the place, each with its own station to unlock */
  extras: [Dish, Dish]
}

export const PLACES: Record<PlaceId, Place> = {
  yopougon: { name: 'Yopougon', dish: 'garba', dishLabel: 'Garba', level: 1, price: 0, plate: 500, wall: '#ff922b', awning: ['#2f9e44', '#ffffff'], city: false , extras: ['porc', 'the'] },
  cocody: { name: 'Cocody', dish: 'alloco', dishLabel: 'Alloco', level: 3, price: 4000, plate: 600, wall: '#74c0fc', awning: ['#f59f00', '#ffffff'], city: false , extras: ['poulet', 'bissap'] },
  abobo: { name: 'Abobo', dish: 'choukouya', dishLabel: 'Choukouya', level: 5, price: 10000, plate: 800, wall: '#e8590c', awning: ['#212529', '#fcc419'], city: false , extras: ['garba', 'gnamakoudji'] },
  treichville: { name: 'Treichville', dish: 'poisson', dishLabel: 'Poisson braisé', level: 7, price: 20000, plate: 1000, wall: '#4dabf7', awning: ['#1864ab', '#ffffff'], city: false , extras: ['claclo', 'bissap'] },
  bouake: { name: 'Bouaké', dish: 'kedjenou', dishLabel: 'Kedjenou', level: 10, price: 40000, plate: 1500, wall: '#e64980', awning: ['#ffd43b', '#c2255c'], city: true , extras: ['foutou', 'gnamakoudji'] },
  korhogo: { name: 'Korhogo', dish: 'to', dishLabel: 'Tô', level: 12, price: 60000, plate: 1500, wall: '#d9480f', awning: ['#fff3bf', '#862e9c'], city: true , extras: ['rizgras', 'degue'] },
  gagnoa: { name: 'Gagnoa', dish: 'kplala', dishLabel: 'Sauce kplala', level: 14, price: 80000, plate: 1800, wall: '#5c940d', awning: ['#ffffff', '#e67700'], city: true , extras: ['foutoubanane', 'cafe'] },
  man: { name: 'Man', dish: 'feuille', dishLabel: 'Sauce feuille', level: 16, price: 120000, plate: 2000, wall: '#0b7285', awning: ['#ffd43b', '#2b8a3e'], city: true , extras: ['rizarachide', 'gnamakoudji'] },
}
export const PLACE_IDS = Object.keys(PLACES) as PlaceId[]

/** The main dish of the maquis you are in (a plate drawn without its own dish shows this one). */
export const DishCtx = createContext<Dish>('garba')

/** Dishes of a place by slot: 0 = main dish, 1 and 2 = the particular dishes. */
export const placeDishes = (p: Place): Dish[] => [p.dish, ...p.extras]
/** Extra prices: the particular dishes sell a bit more than the main one. */
export const dishPrice = (p: Place, slot: number) => Math.round(p.plate * [1, 1.3, 0.8][slot])

/** Customers served per level. */
export const PER_LEVEL = 20
export const levelOf = (served: number) => 1 + Math.floor(served / PER_LEVEL)
