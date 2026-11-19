import { create } from 'zustand'

/** What the current mini-game shows on screen (hint, big button, gauge) and does on a tap. */
type Mini = {
  hint: string
  action: string | null
  gauge: number | null
  zone: [number, number] | null
  onTap: (() => void) | null
  set: (m: Partial<Omit<Mini, 'set'>>) => void
}

export const useMini = create<Mini>((set) => ({
  hint: '',
  action: null,
  gauge: null,
  zone: null,
  onTap: null,
  set: (m) => set(m),
}))

export const resetMini = () => useMini.getState().set({ hint: '', action: null, gauge: null, zone: null, onTap: null })
