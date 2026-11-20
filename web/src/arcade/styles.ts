import type { IconName } from './Icons'
import { PLACES, type PlaceId } from './places'
import { STEPS } from './looks'

// The style of each part of a maquis, level 1 to 10 (the ten looks of looks.ts), bought in « Aménager ». Each
// level changes the look and gives a little more: a nicer counter keeps people waiting longer, a nicer terrace
// brings bigger tips, a nicer room more customers, a nicer front more fame, a better-dressed team cooks faster.

export type StyleKey = 'counter' | 'terrace' | 'room' | 'facade' | 'team'
export type Style = Record<StyleKey, number>
export const FRESH_STYLE: Style = { counter: 1, terrace: 1, room: 1, facade: 1, team: 1 }

export const STYLE_PARTS: { key: StyleKey; icon: IconName; label: string; bonus: string; factor: number }[] = [
  { key: 'counter', icon: 'register', label: 'Le comptoir', bonus: '+5 % de patience des clients par niveau', factor: 1 },
  { key: 'terrace', icon: 'chair', label: 'La terrasse', bonus: '+6 % de pourboires par niveau', factor: 1.2 },
  { key: 'room', icon: 'house', label: 'La salle', bonus: '+3 % de clients par niveau', factor: 1.5 },
  { key: 'facade', icon: 'city', label: 'La façade', bonus: '+4 % de renommée par niveau', factor: 2 },
  { key: 'team', icon: 'chef', label: 'Les tenues de l’équipe', bonus: '+3 % de vitesse en cuisine par niveau', factor: 1.3 },
]

/** price to go from level n-1 to level n (n = 2..10) */
const BASE = [0, 0, 800, 1800, 3500, 6000, 10000, 15000, 22000, 32000, 45000]
export const stylePrice = (place: PlaceId, key: StyleKey, to: number) => {
  const part = STYLE_PARTS.find((p) => p.key === key)!
  return Math.round((BASE[Math.min(STEPS, to)] * part.factor * Math.max(1, PLACES[place].plate / 500)) / 100) * 100
}

/** A saved style (or none, from before the styles): every part at its level, 1..10. */
export function normStyle(s: unknown): Style {
  const o = (s && typeof s === 'object' ? s : {}) as Partial<Style>
  const out = { ...FRESH_STYLE }
  for (const k of Object.keys(out) as StyleKey[]) if (typeof o[k] === 'number') out[k] = Math.max(1, Math.min(STEPS, Math.round(o[k]!)))
  return out
}

/** What the styles do (1 = nothing), used with the items' effects. */
export const styleFx = (s: Style) => ({
  patience: 1 + 0.05 * (s.counter - 1),
  tips: 1 + 0.06 * (s.terrace - 1),
  customers: 1 + 0.03 * (s.room - 1),
  fame: 1 + 0.04 * (s.facade - 1),
  cook: 1 + 0.03 * (s.team - 1),
})

/** A place from before the styles: it gets the look that goes with how much it has grown (a grand restaurant
 *  does not go back to crates and oil drums). */
export const grownStyle = (stage: number): Style => {
  const l = Math.max(1, Math.min(4, 1 + stage))
  return { counter: l, terrace: Math.max(2, l), room: l, facade: 1, team: 1 }
}
