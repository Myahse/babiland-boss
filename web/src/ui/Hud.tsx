import { useEffect, useRef, useState } from 'react'
import { levelOf, UPGRADES, useGame, type UpgradeId } from '../store'
import { useMini } from '../game/mini'

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`

// Yopougon is playable. The rest show where the game goes next (dishes to confirm with people from there).
const COMMUNES = [
  { name: 'Yopougon', dish: 'Garba', open: true },
  { name: 'Cocody', dish: 'Commune d’Abidjan' },
  { name: 'Abobo', dish: 'Commune d’Abidjan' },
  { name: 'Treichville', dish: 'Commune d’Abidjan' },
  { name: 'Bouaké', dish: 'Kedjenou' },
  { name: 'Korhogo', dish: 'Tô' },
  { name: 'Gagnoa', dish: 'Sauce kplala' },
  { name: 'Man', dish: 'Sauce feuille' },
]

export function Title() {
  const start = useGame((s) => s.start)
  const [name, setName] = useState('')
  return (
    <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/45 via-transparent to-transparent p-4 sm:items-center">
      <div className="card pop w-full max-w-md">
        <h1 className="text-center text-5xl leading-none font-extrabold text-[var(--color-orange)]" style={{ textShadow: '3px 3px 0 #2b1a12' }}>
          BABILAND <span className="text-[var(--color-green)]">BOSS</span>
        </h1>
        <p className="mt-1 text-center text-base font-semibold">Pars de ton petit coin de garba et deviens le boss de la bouffe à Babi.</p>
        <label className="mt-4 block text-sm font-extrabold">Ton nom</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 14))}
          placeholder="Ex. : Tantie Aya"
          className="mt-1 w-full rounded-2xl border-[3px] border-[var(--color-ink)] bg-white px-4 py-2.5 text-lg font-bold outline-none"
        />
        <div className="mt-3 text-sm font-extrabold">Ta commune</div>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {COMMUNES.map((c) => (
            <div key={c.name} className={`rounded-xl border-2 px-2.5 py-1.5 leading-tight ${c.open ? 'border-[var(--color-ink)] bg-[#ffe8cc]' : 'border-dashed border-[#c9b79c] opacity-60'}`}>
              <div className="text-sm font-extrabold">
                {c.name} {!c.open && '🔒'}
              </div>
              <div className="text-xs font-semibold">{c.open ? c.dish : `${c.dish} · bientôt`}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-green mt-4 w-full text-xl" onClick={() => start(name)}>
          On y va !
        </button>
      </div>
    </div>
  )
}

function TopBar() {
  const money = useGame((s) => s.money)
  const xp = useGame((s) => s.xp)
  const commune = useGame((s) => s.commune)
  const setShop = useGame((s) => s.setShop)
  const phase = useGame((s) => s.phase)
  const { level, into, need } = levelOf(xp)
  const [bump, setBump] = useState(0)
  const prev = useRef(money)
  useEffect(() => {
    if (money > prev.current) setBump((b) => b + 1)
    prev.current = money
  }, [money])
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
      <div className="pointer-events-auto rounded-2xl border-[3px] border-[var(--color-ink)] bg-[var(--color-cream)] px-3 py-1.5 shadow-md">
        <div className="text-[11px] font-extrabold tracking-wide uppercase">
          {commune} · Niveau {level}
        </div>
        <div className="mt-0.5 h-2.5 w-32 overflow-hidden rounded-full border-2 border-[var(--color-ink)] bg-white">
          <div className="h-full bg-[var(--color-green)] transition-all duration-500" style={{ width: `${(into / need) * 100}%` }} />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div key={bump} className={`rounded-2xl border-[3px] border-[var(--color-ink)] bg-[#ffd43b] px-3 py-1.5 text-lg font-extrabold shadow-md ${bump ? 'pop' : ''}`}>
          💰 {fcfa(money)}
        </div>
        {(phase === 'result' || phase === 'order' || phase === 'arriving') && (
          <button className="btn pointer-events-auto !px-3 !py-1.5 !text-sm" onClick={() => setShop(true)}>
            🛠️ Améliorer
          </button>
        )}
      </div>
    </div>
  )
}

function Flash() {
  const flash = useGame((s) => s.flash)
  if (!flash) return null
  const col = flash.tone === 'good' ? '#2f9e44' : flash.tone === 'ok' ? '#f59f00' : '#e03131'
  return (
    <div key={flash.id} className="float-up pointer-events-none absolute top-[28%] left-1/2 text-4xl font-extrabold whitespace-nowrap text-white" style={{ textShadow: `3px 3px 0 ${col}, -2px -2px 0 #2b1a12, 2px -2px 0 #2b1a12, -2px 2px 0 #2b1a12, 2px 2px 0 #2b1a12` }}>
      {flash.text}
    </div>
  )
}

function Steps() {
  const phase = useGame((s) => s.phase)
  const steps = [
    ['cut', '🔪 Couper'],
    ['fry', '🍳 Frire'],
    ['serve', '🍽️ Servir'],
  ] as const
  const at = steps.findIndex(([p]) => p === phase)
  if (at < 0) return null
  return (
    <div className="absolute top-20 left-1/2 flex -translate-x-1/2 gap-1.5">
      {steps.map(([p, label], i) => (
        <div key={p} className={`rounded-full border-2 border-[var(--color-ink)] px-2.5 py-0.5 text-xs font-extrabold ${i === at ? 'bg-[var(--color-orange)] text-white' : i < at ? 'bg-[var(--color-green)] text-white' : 'bg-white/80'}`}>
          {label}
        </div>
      ))}
    </div>
  )
}

/** Hint + gauge + the big tap button of the cut and fry mini-games. Tapping anywhere also works. */
function MiniOverlay() {
  const { hint, action, gauge, zone, onTap } = useMini()
  return (
    <div className="absolute inset-0" onPointerDown={() => action && onTap?.()}>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        {hint && <div className="card !p-3 max-w-md text-center text-base font-bold">{hint}</div>}
        {gauge !== null && zone && (
          <div className="relative h-7 w-full max-w-sm overflow-hidden rounded-full border-[3px] border-[var(--color-ink)] bg-[#f1f3f5]">
            <div className="absolute inset-y-0 bg-[#69db7c]" style={{ left: `${(zone[0] / 1.15) * 100}%`, width: `${((zone[1] - zone[0]) / 1.15) * 100}%` }} />
            <div className="absolute inset-y-0 right-0 bg-[#ff8787]" style={{ left: `${(0.95 / 1.15) * 100}%` }} />
            <div className="absolute inset-y-0 w-1.5 -translate-x-1/2 bg-[var(--color-ink)]" style={{ left: `${(gauge / 1.15) * 100}%` }} />
            <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px] font-extrabold">
              <span>CRU</span>
              <span>DORÉ</span>
              <span>BRÛLÉ</span>
            </div>
          </div>
        )}
        {action && <button className="btn w-full max-w-sm !py-4 text-2xl">{action}</button>}
      </div>
    </div>
  )
}

const INGREDIENTS = [
  { id: 'attieke', label: 'Attiéké', icon: '🍚' },
  { id: 'poisson', label: 'Poisson', icon: '🐟' },
  { id: 'tomate', label: 'Tomate-oignon', icon: '🍅' },
  { id: 'piment', label: 'Piment', icon: '🌶️' },
]

/** Servir : put the garba together in the right order — attiéké, poisson, tomate-oignon, then piment if asked. */
function ServePanel() {
  const order = useGame((s) => s.order)!
  const plate = useGame((s) => s.plate)
  const add = useGame((s) => s.addToPlate)
  const say = useGame((s) => s.say)
  const finish = useGame((s) => s.finishServe)
  const [mistakes, setMistakes] = useState(0)
  const want = ['attieke', 'poisson', 'tomate', ...(order.piment ? ['piment'] : [])]
  const next = want[plate.length]
  const complete = plate.length === want.length

  function tap(id: string) {
    if (plate.includes(id)) return
    if (id === 'piment' && !order.piment) {
      setMistakes((m) => m + 2)
      say('Il a dit sans piment !', 'bad')
      return
    }
    if (id !== next) {
      setMistakes((m) => m + 1)
      say(plate.length === 0 ? 'L’attiéké d’abord !' : 'Pas dans cet ordre !', 'bad')
      return
    }
    add(id)
  }

  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="card !p-3 max-w-md text-center text-base font-bold">
        Monte le garba : attiéké, poisson, tomate-oignon{order.piment ? ', piment' : ''}.{' '}
        <span className={order.piment ? 'text-[#e03131]' : 'text-[var(--color-green)]'}>{order.piment ? 'Avec piment 🌶️' : 'SANS piment !'}</span>
      </div>
      <div className="grid w-full max-w-md grid-cols-4 gap-2">
        {INGREDIENTS.map((g) => (
          <button
            key={g.id}
            onClick={() => tap(g.id)}
            disabled={plate.includes(g.id) || complete}
            className="flex flex-col items-center rounded-2xl border-[3px] border-[var(--color-ink)] bg-white py-2 font-extrabold shadow-[0_4px_0_rgba(43,26,18,.25)] active:translate-y-0.5 disabled:opacity-40"
          >
            <span className="text-3xl">{g.icon}</span>
            <span className="text-[12px] leading-tight">{g.label}</span>
          </button>
        ))}
      </div>
      {complete && (
        <button className="btn btn-green pop w-full max-w-sm !py-4 text-2xl" onClick={() => finish(Math.max(0, 1 - mistakes * 0.25))}>
          Servir à {order.customer.name} !
        </button>
      )}
    </div>
  )
}

function OrderPanel() {
  const order = useGame((s) => s.order)!
  const accept = useGame((s) => s.acceptOrder)
  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="card !p-3 flex w-full max-w-sm items-center justify-between gap-2">
        <div>
          <div className="text-xs font-extrabold uppercase">Commande</div>
          <div className="text-lg leading-tight font-extrabold">
            Garba {order.price} · {order.piment ? 'avec piment 🌶️' : 'sans piment'}
          </div>
        </div>
        <div className="text-xl font-extrabold text-[var(--color-green)]">{fcfa(order.price)}</div>
      </div>
      <button className="btn btn-green w-full max-w-sm !py-4 text-2xl" onClick={accept}>
        Y’a pas drap, je prépare !
      </button>
    </div>
  )
}

function ResultCard() {
  const r = useGame((s) => s.result)!
  const next = useGame((s) => s.nextCustomer)
  const bar = (label: string, v: number) => (
    <div className="flex items-center gap-2 text-sm font-bold">
      <span className="w-16">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-[var(--color-ink)] bg-white">
        <div className="h-full bg-[var(--color-orange)]" style={{ width: `${v * 100}%` }} />
      </div>
    </div>
  )
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center p-4 sm:justify-start sm:pl-6" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="card pop w-full max-w-sm">
        <div className="text-center text-4xl">{[1, 2, 3].map((i) => (i <= r.stars ? '⭐' : '☆')).join(' ')}</div>
        <div className="mt-2 space-y-1">
          {bar('Couper', r.cut)}
          {bar('Frire', r.fry)}
          {bar('Servir', r.serve)}
        </div>
        <div className="mt-3 text-center text-2xl font-extrabold text-[var(--color-green)]">
          +{fcfa(r.pay)}
          {r.tip > 0 && <span className="block text-base text-[var(--color-orange)]">dont pourboire {fcfa(r.tip)}</span>}
        </div>
        <button className="btn btn-green mt-3 w-full text-xl" onClick={next}>
          Client suivant
        </button>
      </div>
    </div>
  )
}

function Shop() {
  const open = useGame((s) => s.shopOpen)
  const setShop = useGame((s) => s.setShop)
  const money = useGame((s) => s.money)
  const owned = useGame((s) => s.upgrades)
  const buy = useGame((s) => s.buy)
  if (!open) return null
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4" onClick={() => setShop(false)}>
      <div className="card pop w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">🛠️ Améliorer le coin</h2>
          <button className="text-2xl font-extrabold" onClick={() => setShop(false)} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {(Object.keys(UPGRADES) as UpgradeId[]).map((id) => {
            const u = UPGRADES[id]
            return (
              <div key={id} className="flex items-center gap-3 rounded-2xl border-2 border-[var(--color-ink)] bg-white p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold">{u.label}</div>
                  <div className="text-sm leading-tight">{u.desc}</div>
                </div>
                <button className="btn !px-3 !py-2 !text-sm" disabled={!!owned[id] || money < u.price} onClick={() => buy(id)}>
                  {owned[id] ? 'Acheté ✓' : fcfa(u.price)}
                </button>
              </div>
            )
          })}
        </div>
        <div className="mt-3 rounded-2xl border-2 border-dashed border-[#c9b79c] p-3 text-sm font-semibold opacity-80">
          🔒 Bientôt : un maquis à Yopougon, embaucher un vendeur, des livreurs à moto, et attaquer les autres boss de la commune.
        </div>
      </div>
    </div>
  )
}

export function Hud() {
  const phase = useGame((s) => s.phase)
  if (phase === 'title') return <Title />
  return (
    <>
      <TopBar />
      <Steps />
      {(phase === 'cut' || phase === 'fry') && <MiniOverlay />}
      {phase === 'serve' && <ServePanel key={useGame.getState().order?.id} />}
      {phase === 'order' && <OrderPanel />}
      {phase === 'result' && <ResultCard />}
      <Flash />
      <Shop />
    </>
  )
}
