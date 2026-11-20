import { V } from './layout'
import { PLACES, type PlaceId } from './places'
import type { IconName } from './Icons'

// The small businesses (docs/VISION.md: « d'autres petits business : viande séchée / choukouya, thé… qu'on
// débloque avec de l'argent et du niveau »). Each maquis can open three stands on its pavement, each with its own
// seller: they sell to the people walking past, the money piles up on the stand, you walk by to pick it up.

export type Side = { name: string; short: string; icon: string; art: IconName; level: number; price: number; perMin: number; look: 'the' | 'choukouya' | 'bissap'; color: string }
export const SIDE: Side[] = [
  { name: 'Vendeuse de thé', short: 'Thé', icon: '🍵', art: 'tea', level: 2, price: 800, perMin: 150, look: 'the', color: '#2f9e44' },
  { name: 'Choukouya du soir', short: 'Choukouya', icon: '🍖', art: 'meat', level: 4, price: 2500, perMin: 300, look: 'choukouya', color: '#e8590c' },
  { name: 'Vendeuse de bissap', short: 'Bissap', icon: '🥤', art: 'bottle', level: 6, price: 4000, perMin: 420, look: 'bissap', color: '#a61e4d' },
]
export const SIDE_MAX = 5 // stand levels
/** where the stands stand, on the pavement in front of the terrace (the seller behind, facing the street) */
export const SIDE_POS = [V(-4.6, 4.5), V(-1.8, 4.5), V(1.0, 4.5)]
/** the pad to open / improve a stand, beside it (so picking up its money doesn't spend yours) */
export const SIDE_PAD = SIDE_POS.map((p) => V(p.x + 1.35, 4.0))
export const SIDE_SOLIDS = SIDE_POS.map((c) => ({ c, hx: 0.6, hz: 0.35 }))
/** price to open (level 0 -> 1) or improve a stand */
export const sidePrice = (i: number, level: number) => SIDE[i].price * (level === 0 ? 1 : level + 1)
/** what a stand makes in a minute (bigger where plates cost more) */
export const sidePerMin = (place: PlaceId, i: number, level: number) => (level ? SIDE[i].perMin * level * Math.sqrt(PLACES[place].plate / 500) : 0)
/** the stand keeps at most this much: come and collect it */
export const sideCap = (place: PlaceId, i: number, level: number) => Math.round(sidePerMin(place, i, level) * 3)
