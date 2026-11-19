import { createContext } from 'react'

// The places you can own, each with its own dish (see docs/VISION.md): you start in Yopougon with garba,
// then buy a maquis in other communes of Abidjan and in other cities as your level goes up.

export type Dish = 'garba' | 'alloco' | 'choukouya' | 'poisson' | 'kedjenou' | 'to' | 'kplala' | 'feuille'
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
}

export const PLACES: Record<PlaceId, Place> = {
  yopougon: { name: 'Yopougon', dish: 'garba', dishLabel: 'Garba', level: 1, price: 0, plate: 500, wall: '#ff922b', awning: ['#2f9e44', '#ffffff'], city: false },
  cocody: { name: 'Cocody', dish: 'alloco', dishLabel: 'Alloco', level: 3, price: 4000, plate: 600, wall: '#74c0fc', awning: ['#f59f00', '#ffffff'], city: false },
  abobo: { name: 'Abobo', dish: 'choukouya', dishLabel: 'Choukouya', level: 5, price: 10000, plate: 800, wall: '#e8590c', awning: ['#212529', '#fcc419'], city: false },
  treichville: { name: 'Treichville', dish: 'poisson', dishLabel: 'Poisson braisé', level: 7, price: 20000, plate: 1000, wall: '#4dabf7', awning: ['#1864ab', '#ffffff'], city: false },
  bouake: { name: 'Bouaké', dish: 'kedjenou', dishLabel: 'Kedjenou', level: 10, price: 40000, plate: 1500, wall: '#e64980', awning: ['#ffd43b', '#c2255c'], city: true },
  korhogo: { name: 'Korhogo', dish: 'to', dishLabel: 'Tô', level: 12, price: 60000, plate: 1500, wall: '#d9480f', awning: ['#fff3bf', '#862e9c'], city: true },
  gagnoa: { name: 'Gagnoa', dish: 'kplala', dishLabel: 'Sauce kplala', level: 14, price: 80000, plate: 1800, wall: '#5c940d', awning: ['#ffffff', '#e67700'], city: true },
  man: { name: 'Man', dish: 'feuille', dishLabel: 'Sauce feuille', level: 16, price: 120000, plate: 2000, wall: '#0b7285', awning: ['#ffd43b', '#2b8a3e'], city: true },
}
export const PLACE_IDS = Object.keys(PLACES) as PlaceId[]

/** What is on the plates of the maquis you are in (plates read it, wherever they are drawn). */
export const DishCtx = createContext<Dish>('garba')

/** Customers served per level. */
export const PER_LEVEL = 20
export const levelOf = (served: number) => 1 + Math.floor(served / PER_LEVEL)
