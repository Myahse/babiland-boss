import { create } from 'zustand'
import { levelOf } from './places'
import { totalServed, useArcade } from './store'

// Daily missions: three small goals a day (serve customers, cook for a VIP, deliver a bulk order, pick up the
// money of your stands, unlock things, win a district). Each one pays; doing all three opens the chest of the day.

export type MissionKind = 'serve' | 'vip' | 'vip3' | 'bulk' | 'stand' | 'unlock' | 'district'
export type Mission = { kind: MissionKind; goal: number; n: number; reward: number; claimed: boolean }
type State = { day: string; list: Mission[]; chest: boolean }

const TEXT: Record<MissionKind, (g: number) => string> = {
  serve: (g) => `Sers ${g} clients`,
  vip: (g) => (g > 1 ? `Cuisine pour ${g} clients VIP` : 'Cuisine pour un client VIP'),
  vip3: () => 'Fais un plat VIP parfait ⭐⭐⭐',
  bulk: (g) => (g > 1 ? `Livre ${g} commandes en gros` : 'Livre une commande en gros'),
  stand: (g) => `Ramasse ${g.toLocaleString('fr-FR')} F à tes petits business`,
  unlock: (g) => `Débloque ou améliore ${g} choses`,
  district: () => 'Gagne un duel de quartier',
}
export const missionText = (m: Mission) => TEXT[m.kind](m.goal)
export const MISSION_ICON: Record<MissionKind, string> = { serve: '🍛', vip: '👑', vip3: '⭐', bulk: '📦', stand: '🍵', unlock: '🔓', district: '⚔️' }

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}
/** same missions for everybody on the same day and level (a little random from the date) */
function rng(seed: number) {
  let s = seed % 2147483647 || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}
function make(day: string): Mission[] {
  const s = useArcade.getState()
  const lvl = levelOf(totalServed(s))
  const r = rng([...day].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) + lvl)
  const pay = (base: number) => Math.round((base * (1 + 0.5 * (lvl - 1))) / 50) * 50
  const pool: Mission[] = [
    { kind: 'vip', goal: lvl < 4 ? 1 : 2, n: 0, reward: pay(900), claimed: false },
    { kind: 'vip3', goal: 1, n: 0, reward: pay(1200), claimed: false },
    { kind: 'bulk', goal: lvl < 5 ? 1 : 2, n: 0, reward: pay(1000), claimed: false },
    { kind: 'unlock', goal: 2, n: 0, reward: pay(700), claimed: false },
    ...(lvl >= 2 ? [{ kind: 'stand' as const, goal: 500 * lvl, n: 0, reward: pay(800), claimed: false }] : []),
    ...(lvl >= 3 ? [{ kind: 'district' as const, goal: 1, n: 0, reward: pay(1500), claimed: false }] : []),
  ]
  const pick: Mission[] = []
  while (pick.length < 2) {
    const m = pool.splice(Math.floor(r() * pool.length), 1)[0]
    pick.push(m)
  }
  return [{ kind: 'serve', goal: 20 + 10 * Math.min(6, lvl), n: 0, reward: pay(600), claimed: false }, ...pick]
}

const KEY = 'babiland-missions'
function load(): State {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (j && j.day === today()) return j
  } catch {
    /* private mode */
  }
  return { day: '', list: [], chest: false }
}
export const useMissions = create<State>(() => load())
useMissions.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* private mode */
  }
})
/** a new day: new missions (called when the game starts and when the panel opens) */
export function freshMissions() {
  const d = today()
  if (useMissions.getState().day !== d) useMissions.setState({ day: d, list: make(d), chest: false })
}

/** Something happened in the game that a mission may count. */
export function missionEvent(kind: MissionKind, n = 1) {
  const s = useMissions.getState()
  if (!s.list.some((m) => m.kind === kind && m.n < m.goal)) return
  useMissions.setState({ list: s.list.map((m) => (m.kind === kind ? { ...m, n: Math.min(m.goal, m.n + n) } : m)) })
}

export const CHEST = (s: State) => s.list.reduce((n, m) => n + m.reward, 0)
/** Take the reward of mission i (or the chest, i = -1). */
export function claim(i: number) {
  const s = useMissions.getState()
  let money = 0
  if (i < 0) {
    if (s.chest || !s.list.every((m) => m.claimed)) return 0
    money = CHEST(s)
    useMissions.setState({ chest: true })
  } else {
    const m = s.list[i]
    if (!m || m.claimed || m.n < m.goal) return 0
    money = m.reward
    useMissions.setState({ list: s.list.map((x, k) => (k === i ? { ...x, claimed: true } : x)) })
  }
  useArcade.setState((a) => ({ money: a.money + money }))
  return money
}
export const readyCount = (s: State) => s.list.filter((m) => !m.claimed && m.n >= m.goal).length + (!s.chest && s.list.length > 0 && s.list.every((m) => m.claimed) ? 1 : 0)
if (import.meta.env.DEV) Object.assign(window, { missions: useMissions, missionEvent })
