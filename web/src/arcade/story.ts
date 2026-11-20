import { create } from 'zustand'
import * as THREE from 'three'
import { CASH, COUNTER, GROW_PAD, PADS, STATIONS } from './layout'
import { FAME_AT, STAGES } from './growth'
import { PLACES, type PlaceId } from './places'
import { useProfile } from './profile'
import { placeState, popText, useArcade } from './store'
import { DISTRICTS, ownersOf } from './turf'

// The story (docs/VISION.md): Mami Adjoua, your grandmother, fed the whole quarter with her dish. She goes back
// to the village and leaves you her stove and her recipe. The boss of the district takes his share of everything
// sold. Make your street know your dish, then the commune, open your maquis, free your district, and one day be
// the boss of Babi. Chapters of a few goals each; the first one teaches the game, an arrow shows where to go.

export type Speaker = 'mami' | 'boss' | 'me' | 'voice'
export type Line = { who: Speaker; text: string }
type Ctx = { home: PlaceId; dish: string; commune: string; boss: string; name: string }
export type Step = { text: string; done: () => boolean; target?: () => THREE.Vector3 | null }
export type Chapter = { title: string; intro: (c: Ctx) => Line[]; outro: (c: Ctx) => Line[]; steps: (c: Ctx) => Step[]; reward: number }

const st = () => useArcade.getState()
const homeState = (c: Ctx) => placeState(c.home)

export const CHAPTERS: Chapter[] = [
  {
    title: 'Le petit coin',
    reward: 500,
    intro: (c) => [
      { who: 'mami', text: `Voilà mon réchaud, mon enfant. Les plats sortent tout seuls : toi, tu les portes au comptoir et les clients les prennent.` },
      { who: 'mami', text: `Va, glisse ton doigt sur l'écran pour marcher. La flèche te montre où aller.` },
    ],
    steps: () => [
      { text: 'Va au réchaud et prends les plats', done: () => st().carried.length > 0 || st().served > 0, target: () => STATIONS[0] },
      { text: 'Pose-les sur le comptoir', done: () => st().counter.some((n) => n > 0) || st().served > 0, target: () => COUNTER },
      { text: 'Sers 3 clients', done: () => st().served >= 3, target: () => COUNTER },
      { text: 'Ramasse l’argent par terre', done: () => st().money >= 300 || st().served >= 6, target: () => (st().cash > 0 ? CASH : null) },
      { text: 'Achète un 2e réchaud : reste sur son carré', done: () => !!st().unlocks.pan2, target: () => PADS.pan2.pos },
    ],
    outro: () => [{ who: 'mami', text: 'Deux réchauds ! Ta grand-mère est fière de toi. Maintenant, il faut que les gens parlent de toi.' }],
  },
  {
    title: 'Le bouche-à-oreille',
    reward: 1000,
    intro: (c) => [
      { who: 'voice', text: `Chaque client content le dit à quelqu'un. Bientôt, toute ta rue connaîtra ton ${c.dish.toLowerCase()}.` },
      { who: 'mami', text: 'Quand ta rue te connaîtra, le patron de la boutique fermée te la louera. Tu auras un vrai maquis !' },
    ],
    steps: (c) => [
      { text: 'Fais-toi connaître dans ta rue (sers des clients)', done: () => homeState(c).fame >= FAME_AT[1] },
      { text: `Deviens un maquis : le carré doré`, done: () => homeState(c).stage >= 1, target: () => GROW_PAD },
    ],
    outro: (c) => [{ who: 'me', text: `Mon maquis à ${c.commune} ! Mami, si tu voyais ça…` }],
  },
  {
    title: 'Une vraie équipe',
    reward: 2000,
    intro: () => [{ who: 'mami', text: 'Un maquis, ça ne se tient pas seul. Prends du monde avec toi : un serveur, une caissière, et installe des tables.' }],
    steps: (c) => [
      { text: 'Embauche un serveur', done: () => !!homeState(c).unlocks.serveur, target: () => PADS.serveur.pos },
      { text: 'Embauche une caissière', done: () => !!homeState(c).unlocks.caisse, target: () => PADS.caisse.pos },
      { text: 'Ouvre la terrasse (tables et chaises)', done: () => !!homeState(c).unlocks.table, target: () => PADS.table.pos },
    ],
    outro: () => [{ who: 'voice', text: 'Le maquis tourne. Mais quelqu’un est venu voir… et il n’a pas l’air content.' }],
  },
  {
    title: 'Le boss du quartier',
    reward: 3000,
    intro: (c) => [
      { who: 'boss', text: `Toi là ! Ici c'est le quartier de ${c.boss}. Tout ce qui se vend, je prends 20 %. C'est comme ça.` },
      { who: 'mami', text: `Ne baisse pas la tête. Gagne le respect des clients, et un jour tu le trahis : le quartier sera à toi.` },
    ],
    steps: (c) => [
      { text: 'Gagne le respect : 15 clients servis ici', done: () => homeState(c).served >= 15 },
      { text: `Trahis ${c.boss} (bouton Quartiers)`, done: () => ownersOf(c.home)[0] === 'me' },
    ],
    outro: (c) => [{ who: 'me', text: `Plus personne ne prend ma part à ${c.commune}. Le quartier est à moi !` }],
  },
  {
    title: 'Plus loin',
    reward: 5000,
    intro: () => [{ who: 'mami', text: 'Ton nom traverse le pont… Ouvre un petit coin dans une autre commune, ou dans une autre ville.' }],
    steps: () => [{ text: 'Ouvre un 2e lieu (bouton Carte)', done: () => st().owned.length >= 2 }],
    outro: () => [{ who: 'voice', text: 'Deux adresses. Les autres boss commencent à parler de toi.' }],
  },
  {
    title: 'Le restaurant',
    reward: 8000,
    intro: (c) => [{ who: 'mami', text: `Un maquis c'est bien. Un restaurant à étage, avec la terrasse en haut, c'est mieux. Que tout ${c.commune} vienne !` }],
    steps: () => [{ text: 'Fais grandir un maquis en restaurant', done: () => st().owned.some((id) => placeState(id).stage >= 2) }],
    outro: () => [{ who: 'me', text: 'Un restaurant. Avec mon nom dessus.' }],
  },
  {
    title: 'Le boss de Babi',
    reward: 20000,
    intro: () => [{ who: 'voice', text: 'Il reste le plus dur : prendre les quartiers, un par un, et faire de ton restaurant le plus grand de Babi.' }],
    steps: (c) => [
      { text: 'Tiens 6 quartiers', done: () => st().owned.reduce((n, id) => n + ownersOf(id).filter((o) => o === 'me').length, 0) >= 6 },
      { text: `Ouvre un ${STAGES[3].name.toLowerCase()}`, done: () => st().owned.some((id) => placeState(id).stage >= 3) },
      { text: 'Atteins le niveau 15', done: () => st().owned.reduce((n, id) => n + placeState(id).served, 0) >= 280 },
    ],
    outro: (c) => [
      { who: 'mami', text: `Mon enfant… tout Babi connaît ton ${c.dish.toLowerCase()}. Tu es le boss.` },
      { who: 'voice', text: 'Mais un boss, on veut toujours lui prendre sa place. En ligne, les autres boss arrivent…' },
    ],
  },
]

type S = { chapter: number; step: number; talking: Line[] | null; told: number; done: boolean }
const KEY = 'babiland-story'
function load(): S {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (j) return { chapter: j.chapter ?? 0, step: j.step ?? 0, told: j.told ?? -1, done: !!j.done, talking: null }
  } catch {
    /* private mode */
  }
  return { chapter: 0, step: 0, told: -1, done: false, talking: null }
}
export const useStory = create<S>(() => load())
useStory.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ chapter: s.chapter, step: s.step, told: s.told, done: s.done }))
  } catch {
    /* private mode */
  }
})

export function storyCtx(): Ctx {
  const p = useProfile.getState().profile
  const home = p?.home ?? 'yopougon'
  return { home, dish: PLACES[home].dishLabel, commune: PLACES[home].name, boss: DISTRICTS[home][0].boss, name: p?.name ?? 'Boss' }
}
export const currentChapter = () => CHAPTERS[useStory.getState().chapter]
export function currentStep(): Step | null {
  const s = useStory.getState()
  const ch = CHAPTERS[s.chapter]
  return ch && !s.done ? (ch.steps(storyCtx())[s.step] ?? null) : null
}

/** Checked a few times a second: the next goal, the next chapter, the dialogues. */
export function tickStory() {
  const s = useStory.getState()
  if (s.done || s.talking) return
  const ch = CHAPTERS[s.chapter]
  if (!ch) return
  const ctx = storyCtx()
  if (s.told < s.chapter) {
    useStory.setState({ told: s.chapter, talking: ch.intro(ctx) })
    return
  }
  const steps = ch.steps(ctx)
  let k = s.step
  while (k < steps.length && steps[k].done()) k++
  if (k !== s.step) useStory.setState({ step: k })
  if (k >= steps.length) {
    useArcade.setState((a) => ({ money: a.money + ch.reward }))
    popText(`Chapitre terminé : +${ch.reward} FCFA`)
    const next = s.chapter + 1
    useStory.setState({ talking: ch.outro(ctx), chapter: next, step: 0, done: next >= CHAPTERS.length })
  }
}

/** Skip the tutorial: an old player who already knows the game. */
export function skipToProgress() {
  const a = useArcade.getState()
  if (a.served > 0 || a.owned.length > 1) useStory.setState({ chapter: 1, step: 0, told: 0 })
}
