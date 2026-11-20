import type { IconName } from './Icons'
import { dishPrice, PLACES, type PlaceId } from './places'

// You start small (docs/VISION.md: « tu commences dans un petit coin »): a table and a stove on the pavement.
// The more customers you serve, the more people talk about you — first your street, then your quarter, the whole
// commune, the city… That fame brings more customers and lets your little place grow: maquis, restaurant, grand
// restaurant. Every place you buy starts small too, and grows on its own.

export type Stage = {
  name: string
  icon: IconName
  /** fame level needed to grow into it */
  fame: number
  /** price to grow into it (x the price of a plate there) */
  price: number
  /** what a plate costs here, compared to the menu price */
  priceMul: number
  /** how many people can queue */
  queue: number
  /** how often customers come (x) */
  spawn: number
  /** what changes when you grow into it */
  news: string[]
}

export const STAGES: Stage[] = [
  { name: 'Petit coin', icon: 'stool', fame: 0, price: 0, priceMul: 1, queue: 4, spawn: 0.7, news: [] },
  {
    name: 'Maquis',
    icon: 'house',
    fame: 1,
    price: 4,
    priceMul: 1,
    queue: 8,
    spawn: 1,
    news: ['Le local est à toi : cuisine, comptoir, auvent', 'Embauche ton équipe : serveur, caissière, livreur', 'La terrasse, les plats particuliers, les clients VIP et les commandes en gros', 'Les petits business sur le trottoir'],
  },
  { name: 'Restaurant', icon: 'cloche', fame: 3, price: 30, priceMul: 1.25, queue: 10, spawn: 1.2, news: ['L’étage ouvre : terrasse avec vue, guirlandes, grande enseigne', 'Les plats se vendent 25 % plus cher', 'Plus de clients et une file plus longue'] },
  { name: 'Grand restaurant', icon: 'crown', fame: 5, price: 120, priceMul: 1.5, queue: 12, spawn: 1.4, news: ['Enseigne dorée et tapis rouge', 'Les plats se vendent 50 % plus cher', 'Les clients VIP viennent plus souvent'] },
]
export const stagePrice = (id: PlaceId, stage: number) => STAGES[stage].price * PLACES[id].plate

/** Fame: points from customers, VIPs, bulk orders; the levels say who knows you. */
export const FAME_AT = [0, 15, 60, 160, 380, 800, 1600]
const WHO = (city: boolean) => ['Personne ne te connaît encore', 'On te connaît dans ta rue', 'On te connaît dans ton quartier', city ? 'Toute la ville te connaît' : 'Toute la commune te connaît', city ? 'On parle de toi dans toute la région' : 'Tout Abidjan te connaît', 'Tout le pays parle de toi', 'Légende ivoirienne']
export const fameLevel = (points: number) => FAME_AT.reduce((l, at, i) => (points >= at ? i : l), 0)
export const fameText = (id: PlaceId, level: number) => WHO(PLACES[id].city)[level]
/** what was just reached, said by the people of the place */
export const FAME_NEWS = ['', 'Les gens de ta rue parlent de ton {dish} !', 'Tout le quartier vient goûter ton {dish} !', 'Toute la {where} parle de toi !', '{big} connaît ton {dish} !', 'On parle de toi à la télé !', 'Tu es une légende !']
export const fameNews = (id: PlaceId, level: number) =>
  FAME_NEWS[level].replace('{dish}', PLACES[id].dishLabel.toLowerCase()).replace('{where}', PLACES[id].city ? 'ville' : 'commune').replace('{big}', PLACES[id].city ? 'Toute la région' : 'Tout Abidjan')
/** fame brings customers: +6 % per level */
export const fameSpawn = (points: number) => 1 + 0.06 * fameLevel(points)
/** fame points per thing done */
export const FAME = { customer: 1, vip: 4, vipStar: 2, bulk: 8, district: 10 }

/** What one plate of dish slot `slot` sells for in this place, at its stage. */
export const sellPrice = (id: PlaceId, slot: number, stage: number) => Math.round(dishPrice(PLACES[id], slot) * STAGES[stage].priceMul)
