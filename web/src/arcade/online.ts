import { create } from 'zustand'
import type { PlaceId } from './places'

// Playing online (backend/, as in Babi Life): an account, the game saved on the server, the districts held by
// real players (your rivals), live duels between bosses, the share your workers send you, the shop.
// VITE_API_URL is the server's address; without it the game stays offline, exactly as before.

export const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
export const ONLINE_ON = API !== ''

/** A district held by a real player, as the server says. */
export type Rival = { idx: number; id: string; name: string; mine: boolean; online: boolean; guards: number; shieldUntil?: string }
export type Me = { id: string; name: string; diamonds: number; passUntil?: string; boostUntil?: string; tribute: number }
export type ShopView = {
  mobile: boolean
  card: boolean
  sandbox?: boolean
  packs: { id: string; label: string; price: number; diamonds: number; bonus?: string }[]
  passPrice: number
  boosts: { id: string; label: string; text: string; diamonds: number; district?: boolean }[]
  operators: { id: string; label: string; rate: number }[]
  diamonds: number
}

type Online = {
  token: string | null
  name: string | null
  me: Me | null
  live: boolean
  /** bosses online in the place you are in */
  presence: string[]
  /** the districts real players hold, per place */
  rivals: Partial<Record<PlaceId, Rival[]>>
  /** the latest shout-outs and news of the place */
  feed: { id: number; text: string }[]
}

const KEY = 'babiland-online'
function load(): Pick<Online, 'token' | 'name'> {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { token: j.token ?? null, name: j.name ?? null }
  } catch {
    return { token: null, name: null }
  }
}
export const useOnline = create<Online>(() => ({ me: null, live: false, presence: [], rivals: {}, feed: [], ...load() }))
useOnline.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token: s.token, name: s.name }))
  } catch {
    /* private mode */
  }
})
export const isOnline = () => ONLINE_ON && !!useOnline.getState().token

export class ApiError extends Error {
  status: number
  constructor(status: number, msg: string) {
    super(msg)
    this.status = status
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const host = () => API.replace(/^https?:\/\//, '')

/** The server is up: GET /stats answers. On Render's free plan it falls asleep after 15 minutes without players
 *  and takes up to a minute to wake up: keep asking for up to ~75 s. */
export async function wake(maxMs = 75000) {
  const until = Date.now() + maxMs
  for (;;) {
    try {
      const r = await fetch(`${API}/api/v1/stats`, { signal: AbortSignal.timeout(20000) })
      if (r.ok) return true
    } catch {
      /* asleep, or not reachable */
    }
    if (Date.now() > until) return false
    await sleep(3000)
  }
}

/** One call to the server, with the ways it can fail said plainly: no address, the server asleep or out of reach,
 *  the server restarting, or its own message (« ce nom est déjà pris »). */
async function call(method: string, path: string, body?: unknown, auth = true): Promise<{ r: Response; j: Record<string, unknown> }> {
  if (!API) throw new ApiError(0, 'Le jeu n’a pas l’adresse du serveur (VITE_API_URL manque sur Vercel).')
  const tok = auth ? useOnline.getState().token : null
  const send = () =>
    fetch(`${API}/api/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(75000),
    })
  for (let attempt = 0; ; attempt++) {
    let r: Response
    try {
      r = await send()
    } catch {
      // the request never got an answer: the server is probably waking up. Wait until it answers, then once more.
      if (attempt === 0 && (await wake())) continue
      throw new ApiError(0, `Impossible de joindre le serveur (${host()}). S’il dormait, il se réveille : réessaie dans une minute. Sinon il est arrêté, ou il refuse ce site (ALLOWED_ORIGINS).`)
    }
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    // Render answers 502/503/504 for a moment while the server starts
    if (r.status >= 502 && r.status <= 504 && !j.error && attempt < 4) {
      await sleep(4000)
      continue
    }
    if (!r.ok && !j.error) j.error = r.status >= 500 ? `Le serveur a un problème (erreur ${r.status}). Réessaie dans un instant.` : `Le serveur a refusé (erreur ${r.status}).`
    return { r, j }
  }
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const tok = useOnline.getState().token
  const { r, j } = await call(method, path, body)
  if (r.status === 401 && tok) signOut()
  if (!r.ok) throw new ApiError(r.status, String(j.error))
  return j as T
}

// ------------------------------------------------------------------ account
export async function signIn(name: string, password: string, create: boolean) {
  const s = await api<{ token: string; name: string; id: string }>('POST', create ? '/auth/register' : '/auth/login', { name, password })
  useOnline.setState({ token: s.token, name: s.name })
  return s
}
/** Signed in with Google's button: the boss of that Google account, or `needName` (a new one: his boss name first). */
export async function googleSignIn(credential: string, name?: string): Promise<{ name: string; created: boolean } | { needName: true; suggestion?: string; error?: string }> {
  const { r, j } = await call('POST', '/auth/google', { credential, ...(name ? { name } : {}) }, false)
  if (j.needName) return { needName: true, suggestion: j.suggestion as string | undefined, error: name ? (j.error as string | undefined) : undefined }
  if (!r.ok) throw new ApiError(r.status, String(j.error))
  useOnline.setState({ token: j.token as string, name: j.name as string })
  return { name: j.name as string, created: !!name }
}
export const GOOGLE_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''

export function signOut() {
  sock?.close()
  sock = null
  useOnline.setState({ token: null, name: null, me: null, live: false, presence: [], rivals: {} })
}
export async function refreshMe() {
  if (!isOnline()) return null
  const me = await api<Me>('GET', '/me')
  useOnline.setState({ me })
  return me
}

// ------------------------------------------------------------------ the live connection
type Handlers = {
  attack: (m: { duel: string; place: PlaceId; idx: number; district: string; by: string; target: number; seconds: number }) => void
  duel: (m: { duel: string; attack: number; defence: number; left: number }) => void
  ended: (m: { t: 'lost' | 'held'; place: PlaceId; idx: number; district: string; by: string }) => void
  repelled: (m: { duel: string; place: PlaceId; idx: number; district: string; by: string }) => void
  news: (text: string) => void
  tribute: (amount: number) => void
}
let sock: WebSocket | null = null
let handlers: Partial<Handlers> = {}
let place: PlaceId = 'yopougon'
let retry = 0
let feedId = 0
export const onLive = (h: Partial<Handlers>) => (handlers = { ...handlers, ...h })

const pushFeed = (text: string) => useOnline.setState((s) => ({ feed: [...s.feed.slice(-5), { id: ++feedId, text }] }))

export function connect(at: PlaceId) {
  place = at
  if (!isOnline()) return
  if (sock && sock.readyState <= 1) {
    if (sock.readyState === 1) sock.send(JSON.stringify({ t: 'place', place }))
    return
  }
  const { token, name } = useOnline.getState()
  const url = `${API.replace(/^http/, 'ws')}/api/v1/live?token=${encodeURIComponent(token!)}&name=${encodeURIComponent(name ?? '')}&place=${place}`
  const ws = new WebSocket(url)
  sock = ws
  ws.onopen = () => {
    retry = 0
    useOnline.setState({ live: true })
  }
  ws.onclose = () => {
    if (sock !== ws) return
    sock = null
    useOnline.setState({ live: false, presence: [] })
    // come back by itself (a phone loses the network now and then)
    if (isOnline()) setTimeout(() => connect(place), Math.min(30000, 1000 * 2 ** retry++))
  }
  ws.onmessage = (e) => {
    let m: { t: string; [k: string]: unknown }
    try {
      m = JSON.parse(e.data)
    } catch {
      return
    }
    switch (m.t) {
      case 'presence':
        if (m.place === place) useOnline.setState({ presence: (m.names as string[]) ?? [] })
        break
      case 'news':
        pushFeed(m.text as string)
        handlers.news?.(m.text as string)
        void syncTurf(place)
        break
      case 'shout':
        pushFeed(`${m.name} : ${m.text}`)
        break
      case 'attack':
        handlers.attack?.(m as never)
        break
      case 'duel':
        handlers.duel?.(m as never)
        break
      case 'lost':
      case 'held':
        handlers.ended?.(m as never)
        void syncTurf(m.place as PlaceId)
        break
      case 'repelled':
        handlers.repelled?.(m as never)
        void syncTurf(m.place as PlaceId)
        break
      case 'tribute':
        handlers.tribute?.(m.amount as number)
        void refreshMe()
        break
      case 'me':
        void refreshMe()
        break
    }
  }
}
export function liveSend(m: object) {
  if (sock?.readyState === 1) sock.send(JSON.stringify(m))
}
export const SHOUTS = ['Mon garba est le meilleur !', 'Je suis le boss ici', 'Je viens pour ton quartier', 'Viens si tu es fort', 'Bien joué', 'Doucement !', 'Respect au boss', 'Venez manger chez moi']

// ------------------------------------------------------------------ the districts
/** What the server says of a place's districts; the callback (turf.ts) applies it. */
let applyTurf: ((p: PlaceId, rivals: Rival[]) => void) | null = null
export const onTurf = (f: (p: PlaceId, rivals: Rival[]) => void) => (applyTurf = f)
export async function syncTurf(p: PlaceId) {
  if (!isOnline()) return
  try {
    const r = await api<{ owners: Rival[] }>('GET', `/turf/${p}`)
    useOnline.setState((s) => ({ rivals: { ...s.rivals, [p]: r.owners } }))
    applyTurf?.(p, r.owners)
  } catch {
    /* offline for a moment: the next one */
  }
}

// ------------------------------------------------------------------ the share for the boss
let owed = 0
let lastSent = 0
/** a sale's share for the boss of your home district (a real player): sent every half minute */
export function owe(p: PlaceId, amount: number) {
  if (!isOnline() || amount <= 0) return
  owed += amount
  if (Date.now() - lastSent < 25000) return
  lastSent = Date.now()
  const n = Math.round(owed)
  owed = 0
  api('POST', `/turf/${p}/tribute`, { amount: n }).catch(() => (owed += n))
}

// ------------------------------------------------------------------ the shop
export const shopView = () => api<ShopView>('GET', '/shop')
export const buy = (b: { pack?: string; pass?: boolean; method: 'mobile' | 'carte'; operator?: string }) => api<{ id: string; url: string }>('POST', '/shop/buy', b)
export const checkPurchase = (id: string) => api<{ status: string; credited: boolean; item: string; diamonds: number }>('POST', `/shop/purchase/${id}`)
export const spend = (b: { boost: string; place?: string; idx?: number; level?: number }) => api<{ diamonds: number; boost: string; money?: number; boostUntil?: string }>('POST', '/shop/spend', b)

/** x2 boost, Pass Boss: what a sale is worth more (1 = nothing) */
export function saleBoost() {
  const me = useOnline.getState().me
  if (!me) return 1
  const now = Date.now()
  return (me.boostUntil && Date.parse(me.boostUntil) > now ? 2 : 1) * (me.passUntil && Date.parse(me.passUntil) > now ? 1.25 : 1)
}
export const hasPass = () => {
  const me = useOnline.getState().me
  return !!me?.passUntil && Date.parse(me.passUntil) > Date.now()
}

// ------------------------------------------------------------------ the game saved online
const SAVE_KEYS = ['babiland-arcade-v2', 'babiland-turf-v3', 'babiland-missions', 'babiland-seen', 'babiland-profile', 'babiland-story']
export async function pushSave(fame: number) {
  if (!isOnline()) return
  const save: Record<string, string | null> = {}
  for (const k of SAVE_KEYS) save[k] = localStorage.getItem(k)
  await api('PUT', '/me/save', { save, fame }).catch(() => undefined)
}
/** a new phone: the game saved online, put back (true: reload to play it) */
export async function pullSave(): Promise<boolean> {
  const r = await api<{ save: Record<string, string | null> | null }>('GET', '/me/save')
  if (!r.save) return false
  for (const k of SAVE_KEYS) if (r.save[k]) localStorage.setItem(k, r.save[k]!)
  return true
}
