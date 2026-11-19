import { STATION_LEVELS } from './layout'
import { dishPrice, PLACES, type PlaceId } from './places'
import { placeState, useArcade } from './store'
import { bonusOf, cutFor, ownersOf, RENT, RENT_EVERY } from './turf'
import { SIDE, sidePerMin } from './side'

// While you are away your staff keeps the maquis open (docs/VISION.md: « embaucher des gens pour vendre pour
// toi »): a maquis with a server AND a cashier sells by itself, slower than when you are there. When you come
// back, « Pendant ton absence… » shows what each maquis made and the rent of your districts.

const SEEN = 'babiland-seen'
export const OFFLINE_MAX = 2 * 3600 // seconds counted at most (come back often!)
export const OFFLINE_MIN = 120 // under 2 minutes away, nothing to show
const RATE = 0.08 // part of what you would sell yourself (staff alone are slower)
const CUSTOMERS_PER_MIN = 2 // customers a quiet maquis gets in a minute
const PLATES = 2 // plates per customer
const RENT_RATE = 0.2 // districts pay less when you are not there to collect

export type OfflineRow = { place: PlaceId; amount: number; staff: string[]; missing?: string }
export type Offline = { away: number; rows: OfflineRow[]; rent: number; total: number }

/** What one maquis makes in a minute without you (0 if it has no server and cashier). */
/** What the stands on the pavement make in a minute without you (their sellers stay, but sell less at night). */
export const standsPerMinute = (id: PlaceId) => placeState(id).side.reduce((n, l, i) => n + sidePerMin(id, i, l) * 0.3, 0)

export function idlePerMinute(id: PlaceId) {
  const p = placeState(id)
  const u = p.unlocks
  if (!u.serveur || !u.caisse) return standsPerMinute(id)
  const place = PLACES[id]
  const menu = [0, ...(u.plat1 ? [1] : []), ...(u.plat2 ? [2] : [])]
  const price = menu.reduce((n, k) => n + dishPrice(place, k), 0) / menu.length
  // faster stations, a fast server and the terrace all help
  const cook = p.level.reduce((n, l) => n + 2.6 / STATION_LEVELS[l - 1].cook, 0) / p.level.length
  const k = cook * (u.rapide ? 1.3 : 1) * (u.table ? 1.2 : 1) * (1 + 0.1 * (menu.length - 1))
  const customers = CUSTOMERS_PER_MIN * (1 + bonusOf(id, 'customers'))
  let perMin = customers * PLATES * price * k * RATE * (1 + bonusOf(id, 'sales')) * (1 - cutFor(id))
  // the livreur keeps delivering phone orders
  if (u.moto && u.livreur) perMin += 0.3 * 4.5 * place.plate * 1.4 * RATE * (1 - cutFor(id))
  return perMin + standsPerMinute(id)
}

/** Who works there, and what is missing to earn while you are away. */
function staffOf(id: PlaceId) {
  const u = placeState(id).unlocks
  const side = placeState(id).side
  const staff = [u.serveur && (u.rapide ? 'serveur rapide' : 'serveur'), u.caisse && 'caissière', u.livreur && 'livreur', ...SIDE.filter((_, i) => side[i]).map((b) => b.short.toLowerCase())].filter(Boolean) as string[]
  const need = [!u.serveur && 'un serveur', !u.caisse && 'une caissière'].filter(Boolean) as string[]
  return { staff, missing: need.length ? `Embauche ${need.join(' et ')} pour gagner sans toi` : undefined }
}

export function offlineReport(away: number): Offline | null {
  if (away < OFFLINE_MIN) return null
  const t = Math.min(away, OFFLINE_MAX)
  const s = useArcade.getState()
  const rows = s.owned.map((id) => ({ place: id, amount: Math.round((idlePerMinute(id) * t) / 60), ...staffOf(id) }))
  // rent of every district you own, in all your places
  const districts = s.owned.reduce((n, id) => n + ownersOf(id).filter((o) => o === 'me').length, 0)
  const rent = Math.round(((districts * RENT) / RENT_EVERY) * t * RENT_RATE)
  const total = rows.reduce((n, r) => n + r.amount, 0) + rent
  return { away, rows, rent, total }
}

/** When you were last here (read once at start, before it is updated). */
let lastSeen = 0
try {
  lastSeen = Number(localStorage.getItem(SEEN)) || 0
} catch {
  /* private mode */
}
export const awaySinceStart = () => (lastSeen ? (Date.now() - lastSeen) / 1000 : 0)
export function markSeen() {
  try {
    localStorage.setItem(SEEN, String(Date.now()))
  } catch {
    /* private mode */
  }
}
/** keep « last seen » up to date while playing; returns a function to stop */
export function watchSeen(onBack: (away: number) => void) {
  markSeen()
  const iv = setInterval(markSeen, 10000)
  let hidden = 0
  const vis = () => {
    if (document.hidden) {
      hidden = Date.now()
      markSeen()
    } else if (hidden) {
      onBack((Date.now() - hidden) / 1000)
      hidden = 0
      markSeen()
    }
  }
  document.addEventListener('visibilitychange', vis)
  window.addEventListener('pagehide', markSeen)
  return () => {
    clearInterval(iv)
    document.removeEventListener('visibilitychange', vis)
    window.removeEventListener('pagehide', markSeen)
  }
}
if (import.meta.env.DEV) Object.assign(window, { offlineReport, idlePerMinute })
