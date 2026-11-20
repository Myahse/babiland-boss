import { RoundButton } from './HudButton'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { levelOf, PLACES } from './places'
import { sfx } from './sfx'
import { popText, totalServed, useArcade } from './store'
import { DISTRICTS, ownersOf } from './turf'
import { vipCall } from './vip'
import { api, ApiError, buy, checkPurchase, connect, hasPass, ONLINE_ON, pullSave, pushSave, refreshMe, SHOUTS, shopView, signIn, signOut, spend, syncTurf, useOnline, liveSend, type ShopView } from './online'

// Playing online: the account, who is online, the news of the place, the ranking, the shop (diamonds, Pass Boss,
// boosts) — and, out of sight, the live connection, the districts kept in step, the game saved on the server.

const stop = (e: React.PointerEvent) => e.stopPropagation()
const fcfa = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ')

/** Out of sight: connects, keeps the districts and the save in step, comes back from a payment page. */
export function OnlineRuntime() {
  const token = useOnline((s) => s.token)
  const current = useArcade((s) => s.current)
  useEffect(() => {
    if (!token || !ONLINE_ON) return
    void refreshMe()
    connect(current)
    void syncTurf(current)
    const fame = () => useArcade.getState().fame
    const t1 = setInterval(() => void syncTurf(useArcade.getState().current), 20000)
    const t2 = setInterval(() => void pushSave(fame()), 45000)
    const hide = () => document.hidden && void pushSave(fame())
    document.addEventListener('visibilitychange', hide)
    return () => {
      clearInterval(t1)
      clearInterval(t2)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [token, current])
  // back from GeniusPay / Stripe: ?achat=<id>
  useEffect(() => {
    if (!token) return
    const q = new URLSearchParams(location.search)
    const id = q.get('achat')
    if (!id) return
    history.replaceState(null, '', location.pathname)
    if (q.get('echec')) {
      popText('Paiement annulé')
      return
    }
    let n = 0
    const look = async () => {
      try {
        const p = await checkPurchase(id)
        if (p.credited) {
          sfx.unlock()
          popText(p.item === 'pass' ? '👑 Pass Boss activé !' : `💎 +${p.diamonds} diamants !`)
          void refreshMe()
          return
        }
      } catch {
        /* try again */
      }
      if (++n < 20) setTimeout(look, 3000)
      else popText('⏳ Paiement en attente : il arrivera tout seul')
    }
    void look()
  }, [token])
  return null
}

/** The latest news of the place (an attack, a conquest, a shout-out), a few seconds each. */
export function LiveFeed() {
  const feed = useOnline((s) => s.feed)
  const last = feed[feed.length - 1]
  const [shown, setShown] = useState<number | null>(null)
  useEffect(() => {
    if (!last) return
    setShown(last.id)
    const t = setTimeout(() => setShown(null), 4500)
    return () => clearTimeout(t)
  }, [last])
  if (!last || shown !== last.id) return null
  return (
    <div key={last.id} className="pop pointer-events-none absolute inset-x-0 top-[8.5rem] z-20 flex justify-center px-6">
      <div className="max-w-xs truncate rounded-full bg-[#2b1a12]/85 px-3 py-1 text-xs font-extrabold text-white shadow">📡 {last.text}</div>
    </div>
  )
}

/** 🌐 button: connect, or who is online and what's going on. */
export function OnlineButton() {
  const token = useOnline((s) => s.token)
  const live = useOnline((s) => s.live)
  const presence = useOnline((s) => s.presence)
  const tribute = useOnline((s) => s.me?.tribute ?? 0)
  const [open, setOpen] = useState(false)
  if (!ONLINE_ON) return null
  return (
    <>
      <RoundButton icon={token ? (live ? '🟢' : '🟠') : '🌐'} label={token ? `En ligne · ${presence.length}` : 'En ligne'} color="#0b7285" badge={tribute > 0 ? '💰' : null} onClick={() => setOpen(true)} />
      {open && createPortal(token ? <LivePanel onClose={() => setOpen(false)} /> : <AccountPanel onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" onPointerDown={stop} onClick={onClose}>
      <div className="card pop max-h-[88%] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">{title}</h2>
          <button className="text-2xl font-extrabold" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function AccountPanel({ onClose }: { onClose: () => void }) {
  const [create, setCreate] = useState(true)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    setErr('')
    try {
      await signIn(name.trim(), password, create)
      // a new phone: bring back the game saved online
      if (!create && totalServed(useArcade.getState()) < 3 && (await pullSave())) {
        location.reload()
        return
      }
      void pushSave(useArcade.getState().fame)
      sfx.unlock()
      onClose()
    } catch (e) {
      setErr((e as ApiError).message)
    }
    setBusy(false)
  }
  return (
    <Sheet title="🌐 Jouer en ligne" onClose={onClose}>
      <p className="mt-1 text-sm font-semibold">Les quartiers appartiennent à de vrais joueurs. Le premier qui trahit le boss d’un quartier devient le boss pour tout le monde : les nouveaux travaillent pour lui… jusqu’à ce qu’ils le trahissent. Les duels se jouent en direct.</p>
      <div className="mt-3 flex gap-1 rounded-xl bg-[#f1e4cc] p-1 text-sm font-extrabold">
        {[true, false].map((c) => (
          <button key={String(c)} className={`flex-1 rounded-lg py-1.5 ${create === c ? 'bg-white shadow' : 'opacity-60'}`} onClick={() => setCreate(c)}>
            {c ? 'Créer mon compte' : 'J’ai déjà un compte'}
          </button>
        ))}
      </div>
      <input className="mt-3 w-full rounded-xl border-2 border-[var(--color-ink)] px-3 py-2 font-bold" placeholder="Ton nom de boss" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
      <input className="mt-2 w-full rounded-xl border-2 border-[var(--color-ink)] px-3 py-2 font-bold" placeholder="Mot de passe (6 caractères au moins)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <div className="mt-2 text-sm font-extrabold text-[#e03131]">{err}</div>}
      <button className="btn btn-green mt-3 w-full !py-3" disabled={busy || name.trim().length < 3 || password.length < 6} onClick={go}>
        {busy ? '…' : create ? 'C’est parti !' : 'Me connecter'}
      </button>
      <p className="mt-2 text-center text-[11px] font-semibold opacity-60">Ta partie est sauvegardée en ligne : tu la retrouves sur un autre téléphone.</p>
    </Sheet>
  )
}

function LivePanel({ onClose }: { onClose: () => void }) {
  const me = useOnline((s) => s.me)
  const name = useOnline((s) => s.name)
  const presence = useOnline((s) => s.presence)
  const feed = useOnline((s) => s.feed)
  const live = useOnline((s) => s.live)
  const current = useArcade((s) => s.current)
  const [ranking, setRanking] = useState<{ name: string; districts: number; fame: number; pass: boolean }[] | null>(null)
  useEffect(() => {
    api<typeof ranking>('GET', '/ranking').then(setRanking).catch(() => undefined)
  }, [])
  const collect = async () => {
    const r = await api<{ amount: number }>('POST', '/me/tribute')
    if (r.amount > 0) {
      useArcade.setState((s) => ({ money: s.money + r.amount }))
      popText(`💰 La part de tes employés : +${fcfa(r.amount)} F`)
      sfx.cash()
    }
    void refreshMe()
  }
  return (
    <Sheet title={`${live ? '🟢' : '🟠'} ${name}`} onClose={onClose}>
      {(me?.tribute ?? 0) > 0 && (
        <div className="vip-glow mt-2 flex items-center gap-2 rounded-2xl border-[3px] border-[#2f9e44] bg-[#d3f9d8] p-2.5">
          <span className="text-3xl">💰</span>
          <div className="min-w-0 flex-1 text-sm leading-tight font-extrabold">Tes employés t’ont envoyé ta part : {fcfa(me!.tribute)} F</div>
          <button className="btn btn-green !px-3 !py-1.5 !text-sm" onClick={collect}>
            Prendre
          </button>
        </div>
      )}
      <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">À {PLACES[current].name} en ce moment</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {presence.map((n) => (
          <span key={n} className={`rounded-full border-2 px-2 py-0.5 text-xs font-extrabold ${n === name ? 'border-[#2f9e44] bg-[#d3f9d8]' : 'border-[var(--color-ink)] bg-white'}`}>
            {n === name ? '😎 toi' : `👤 ${n}`}
          </span>
        ))}
        {!presence.length && <span className="text-sm font-semibold opacity-60">{live ? 'Personne' : 'Connexion…'}</span>}
      </div>
      <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">Crier dans le quartier</div>
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        {SHOUTS.map((t, i) => (
          <button key={t} className="rounded-xl border-2 border-[var(--color-ink)] bg-white px-2 py-1 text-left text-xs font-bold active:translate-y-0.5" onClick={() => liveSend({ t: 'shout', shout: i })}>
            {t}
          </button>
        ))}
      </div>
      {feed.length > 0 && (
        <>
          <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">Ce qui se passe</div>
          <div className="mt-1 space-y-1">
            {[...feed].reverse().map((f) => (
              <div key={f.id} className="rounded-lg bg-white px-2 py-1 text-xs font-bold">
                {f.text}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">🏆 Les plus grands boss</div>
      <div className="mt-1 space-y-1">
        {(ranking ?? []).slice(0, 10).map((r, i) => (
          <div key={r.name} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold ${r.name === name ? 'bg-[#fff3bf]' : 'bg-white'}`}>
            <span className="w-6 text-center font-extrabold">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
            <span className="min-w-0 flex-1 truncate">
              {r.name} {r.pass && '👑'}
            </span>
            <span className="text-xs">🏙️ {r.districts}</span>
            <span className="text-xs">📣 {r.fame}</span>
          </div>
        ))}
        {!ranking && <div className="text-sm font-semibold opacity-60">…</div>}
      </div>
      <button
        className="mt-4 w-full text-center text-xs font-bold underline opacity-60"
        onClick={() => {
          signOut()
          onClose()
        }}
      >
        Me déconnecter
      </button>
    </Sheet>
  )
}

/** 💎 next to the money: the diamonds you have; the shop. */
export function DiamondButton() {
  const token = useOnline((s) => s.token)
  const diamonds = useOnline((s) => s.me?.diamonds ?? 0)
  const pass = useOnline(() => hasPass())
  const [open, setOpen] = useState(false)
  if (!ONLINE_ON) return null
  return (
    <>
      <button
        className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-xl bg-white py-1 pr-2.5 pl-1.5 shadow-[0_4px_0_rgba(0,0,0,.2)] active:translate-y-0.5"
        onPointerDown={stop}
        onClick={() => setOpen(true)}
        aria-label="Boutique"
      >
        <span className="text-lg">{pass ? '👑' : '💎'}</span>
        <span className="text-lg font-extrabold text-[#343a40]">{token ? diamonds : '+'}</span>
      </button>
      {open && createPortal(token ? <ShopPanel onClose={() => setOpen(false)} /> : <AccountPanel onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

function ShopPanel({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState<ShopView | null>(null)
  const [err, setErr] = useState('')
  const [pay, setPay] = useState<{ pack?: string; pass?: boolean; label: string; price: number } | null>(null)
  const [target, setTarget] = useState<{ boost: string; label: string } | null>(null)
  const me = useOnline((s) => s.me)
  const current = useArcade((s) => s.current)
  const load = () => shopView().then(setV).catch((e: ApiError) => setErr(e.message))
  useEffect(() => {
    void load()
    void refreshMe() // the diamonds as they are now (bought on another phone, just credited)
  }, [])
  const open = async (method: 'mobile' | 'carte', operator?: string) => {
    if (!pay) return
    setErr('')
    try {
      const r = await buy({ pack: pay.pack, pass: pay.pass, method, operator })
      void pushSave(useArcade.getState().fame)
      location.href = r.url
    } catch (e) {
      setErr((e as ApiError).message)
    }
  }
  const use = async (boost: string, at?: { place: string; idx: number }) => {
    setErr('')
    try {
      const r = await spend({ boost, ...at, level: levelOf(totalServed(useArcade.getState())) })
      sfx.unlock()
      if (r.money) {
        useArcade.setState((s) => ({ money: s.money + r.money! }))
        popText(`💰 +${fcfa(r.money)} F`)
      }
      if (boost === 'x2') popText('🔥 Ventes ×2 pendant 30 minutes !')
      if (boost === 'vip') {
        vipCall.now()
        popText('👑 Un VIP arrive !')
      }
      if (at) void syncTurf(current)
      void refreshMe()
      void load()
      setTarget(null)
    } catch (e) {
      setErr((e as ApiError).message)
    }
  }
  const myDistricts = ownersOf(current)
    .map((o, i) => ({ o, i }))
    .filter((x) => x.o === 'me')
  return (
    <Sheet title="💎 La boutique" onClose={onClose}>
      <div className="mt-1 flex items-center gap-2 text-sm font-bold">
        <span className="rounded-full bg-white px-2.5 py-0.5 font-extrabold">💎 {me?.diamonds ?? 0}</span>
        {hasPass() && <span className="rounded-full bg-[#fff3bf] px-2.5 py-0.5 font-extrabold">👑 Pass Boss</span>}
        {me?.boostUntil && Date.parse(me.boostUntil) > Date.now() && <span className="rounded-full bg-[#ffe3e3] px-2.5 py-0.5 font-extrabold">🔥 ×2</span>}
      </div>
      {err && <div className="mt-2 rounded-lg bg-[#ffe3e3] px-2 py-1 text-sm font-extrabold text-[#c92a2a]">{err}</div>}
      {!v ? (
        <div className="mt-4 text-center font-bold opacity-60">…</div>
      ) : (
        <>
          {v.sandbox && <div className="mt-2 rounded-lg bg-[#fff3bf] px-2 py-1 text-xs font-bold">Mode test : rien n’est vraiment payé.</div>}
          <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">Utiliser mes diamants</div>
          <div className="mt-1 space-y-1.5">
            {v.boosts.map((b) => (
              <div key={b.id} className="flex items-center gap-2 rounded-xl border-2 border-[var(--color-ink)] bg-white px-2.5 py-1.5">
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-sm font-extrabold">{b.label}</div>
                  <div className="text-[11px] font-semibold opacity-75">{b.text}</div>
                </div>
                <button className="btn !px-2.5 !py-1.5 !text-sm" disabled={(me?.diamonds ?? 0) < b.diamonds || (b.district && !myDistricts.length)} onClick={() => (b.district ? setTarget({ boost: b.id, label: b.label }) : use(b.id))}>
                  💎 {b.diamonds}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">Acheter</div>
          <div className="mt-1 flex items-center gap-2 rounded-2xl border-[3px] border-[#f59f00] bg-[#fff3bf] px-2.5 py-2">
            <span className="text-3xl">👑</span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-sm font-extrabold">Pass Boss · 30 jours</div>
              <div className="text-[11px] font-semibold">+25 % sur chaque vente, dans tous tes maquis, et la couronne à ton nom dans le classement</div>
            </div>
            <button className="btn btn-green !px-2.5 !py-1.5 !text-sm" onClick={() => setPay({ pass: true, label: 'Pass Boss · 30 jours', price: v.passPrice })}>
              {fcfa(v.passPrice)} F
            </button>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {v.packs.map((p) => (
              <button key={p.id} className="relative rounded-xl border-2 border-[var(--color-ink)] bg-white px-2 py-2 text-center active:translate-y-0.5" onClick={() => setPay({ pack: p.id, label: `${p.diamonds} diamants`, price: p.price })}>
                {p.bonus && <span className="absolute -top-2 right-1 rounded-full bg-[#e03131] px-1.5 text-[10px] font-extrabold text-white">{p.bonus}</span>}
                <div className="text-lg font-extrabold">💎 {p.diamonds}</div>
                <div className="text-[11px] font-bold opacity-70">{p.label}</div>
                <div className="mt-0.5 text-sm font-extrabold text-[#2b8a3e]">{fcfa(p.price)} F</div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] font-semibold opacity-60">Le jeu se joue gratuitement du début à la fin : les diamants vont juste plus vite.</p>
        </>
      )}
      {pay &&
        v &&
        createPortal(
          <Sheet title="Payer" onClose={() => setPay(null)}>
            <div className="mt-1 text-sm font-bold">
              {pay.label} · <span className="font-extrabold">{fcfa(pay.price)} F</span>
            </div>
            {!v.mobile && !v.card && <div className="mt-3 rounded-lg bg-[#fff3bf] px-2 py-2 text-sm font-bold">La boutique ouvre bientôt.</div>}
            {v.mobile && (
              <>
                <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">Mobile Money</div>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {v.operators.map((o) => (
                    <button key={o.id} className="rounded-xl border-2 border-[var(--color-ink)] bg-white px-2 py-2 text-sm font-extrabold active:translate-y-0.5" onClick={() => open('mobile', o.id)}>
                      {o.label}
                      <div className="text-[10px] font-bold opacity-60">+{Math.ceil((pay.price * o.rate) / 100)} F de frais</div>
                    </button>
                  ))}
                </div>
              </>
            )}
            {v.card && (
              <button className="btn mt-3 w-full !py-2.5" onClick={() => open('carte')}>
                💳 Payer par carte
              </button>
            )}
            {err && <div className="mt-2 text-sm font-extrabold text-[#c92a2a]">{err}</div>}
          </Sheet>,
          document.body,
        )}
      {target &&
        createPortal(
          <Sheet title={target.label} onClose={() => setTarget(null)}>
            <div className="mt-1 text-sm font-bold">Sur lequel de tes quartiers ?</div>
            <div className="mt-2 space-y-1.5">
              {myDistricts.map(({ i }) => (
                <button key={i} className="w-full rounded-xl border-2 border-[var(--color-ink)] bg-white px-3 py-2 text-left text-sm font-extrabold" onClick={() => use(target.boost, { place: current, idx: i })}>
                  {DISTRICTS[current][i].name}
                </button>
              ))}
            </div>
          </Sheet>,
          document.body,
        )}
    </Sheet>
  )
}

