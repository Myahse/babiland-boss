import { create } from 'zustand'
import type { PersonId } from '../three/RealPerson'
import type { PlaceId } from './places'

// Who you are (docs/VISION.md: « au début tu t'inscris, et tu viens d'un endroit du pays ») : your name, the
// character you play, and the place you come from — where your story starts, with the dish of your family.

/** `outfit`: what your character wears, 1..10 (Outfit.tsx), bought in « Aménager », the same in every place */
export type Profile = { name: string; who: PersonId; home: PlaceId; outfit?: number }

export const CHARACTERS: { who: PersonId; label: string; text: string }[] = [
  { who: 'aya', label: 'Tantie Aya', text: 'Le pagne, le sourire et la main la plus rapide du quartier.' },
  { who: 'awa', label: 'Awa', text: 'Jeune et pressée : elle veut son maquis avant ses 25 ans.' },
  { who: 'koffi', label: 'Koffi', text: 'Ancien gbakaman, il connaît toutes les rues de Babi.' },
  { who: 'yao', label: 'Yao', text: 'Il a appris à cuisiner chez sa mère et il ne rate jamais un plat.' },
  { who: 'fatou', label: 'Fatou', text: 'La reine du choukouya, et elle ne lâche rien.' },
]

const KEY = 'babiland-profile'
function load(): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null')
    return p?.name && p?.who && p?.home ? p : null
  } catch {
    return null
  }
}
export const useProfile = create<{ profile: Profile | null }>(() => ({ profile: load() }))
useProfile.subscribe((s) => {
  try {
    if (s.profile) localStorage.setItem(KEY, JSON.stringify(s.profile))
  } catch {
    /* private mode */
  }
})

/** The character you play (Tantie Aya until you choose). */
export const playerWho = (): PersonId => useProfile.getState().profile?.who ?? 'aya'
/** The staff and the customers: never the same person as you. */
export function others(list: PersonId[]): PersonId[] {
  const me = playerWho()
  return list.map((w) => (w === me ? 'aya' : w))
}

/** What your character wears (1 to 10). */
export const playerOutfit = () => Math.max(1, Math.min(10, useProfile.getState().profile?.outfit ?? 1))
