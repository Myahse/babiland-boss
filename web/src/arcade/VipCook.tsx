import { Icon } from './Icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DISHES, PLACES } from './places'
import { sfx } from './sfx'
import { useArcade } from './store'
import { RECIPES, starsOf, useVip, vipPay, VIP_PATIENCE, type Ing, type Recipe } from './vip'

// The VIP's order, cooked by hand like in Cooking Mama: cut (swipe the knife along the dotted lines), cook
// (tap in the golden zone), plate up (tap the ingredients in the right order). The shop waits meanwhile.

const stop = (e: React.PointerEvent) => e.stopPropagation()

/** The golden button when a VIP waits at the counter, and the cooking screen once you tap it. */
export function VipLayer() {
  const ready = useVip((s) => s.ready)
  const open = useVip((s) => s.open)
  const place = useArcade((s) => s.current)
  const recipe = RECIPES[PLACES[place].dish]
  if (!ready || !recipe) return null
  if (open) return <VipCook recipe={recipe} name={ready.name} want={ready.want} />
  const left = Math.max(0, 1 - ready.wait / VIP_PATIENCE)
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
      <button
        className="vip-glow pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-b from-[#ffe066] to-[#f59f00] px-4 py-3 text-left shadow-[0_6px_0_#b35c00] active:translate-y-1 active:shadow-[0_2px_0_#b35c00]"
        onPointerDown={stop}
        onClick={() => useVip.setState({ open: true })}
      >
        <div className="flex items-center gap-3">
          <Icon name="crown" size={44} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-xs font-extrabold tracking-wide text-[#7a3d00] uppercase">Client VIP · {ready.name}</div>
            <div className="text-lg font-extrabold text-[#2b1a12]">
              {ready.want} {PLACES[place].dishLabel.toLowerCase()} faits main · jusqu’à ×3
            </div>
          </div>
          <span className="rounded-2xl bg-[#2b1a12] px-3 py-2 text-base font-extrabold text-[#ffe066]">Cuisiner !</span>
        </div>
        {/* his patience */}
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#7a3d00]/30">
          <div className="h-full rounded-full bg-[#2b1a12] transition-[width] duration-300" style={{ width: `${left * 100}%` }} />
        </div>
      </button>
    </div>
  )
}

function VipCook({ recipe, name, want }: { recipe: Recipe; name: string; want: number }) {
  const place = useArcade((s) => s.current)
  const [step, setStep] = useState(0)
  const scores = useRef<number[]>([])
  const next = (s: number) => {
    scores.current.push(s)
    setStep((k) => k + 1)
  }
  const score = scores.current.length ? scores.current.reduce((a, b) => a + b, 0) / scores.current.length : 0
  const STEPS = ['Couper', recipe.cook.on === 'pot' ? 'Mijoter' : recipe.cook.on === 'grill' ? 'Griller' : 'Frire', 'Dresser']
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#fff4d6,#f5c97b)] select-none" onPointerDown={stop} style={{ touchAction: 'none' }}>
      {/* header: who it is for, the steps */}
      <div className="flex items-center gap-2 px-3 pt-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <Icon name="crown" size={36} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[11px] font-extrabold tracking-wide text-[#a05a00] uppercase">Commande spéciale · {name}</div>
          <div className="text-lg font-extrabold">
            <Icon name={DISHES[PLACES[place].dish].icon} size={20} className="mr-1 align-[-4px]" />{PLACES[place].dishLabel} × {want}
          </div>
        </div>
      </div>
      <div className="mt-2 flex justify-center gap-1.5 px-3">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-xs font-extrabold ${i === step ? 'border-[#2b1a12] bg-white' : i < step ? 'border-[#2f9e44] bg-[#d3f9d8] text-[#2b8a3e]' : 'border-[#d9a85b] text-[#a0783c]'}`}>
            {i < step ? '✓' : i + 1} {s}
          </div>
        ))}
      </div>
      <div className="relative flex-1">
        {step === 0 && <CutStep items={recipe.cut} onDone={next} />}
        {step === 1 && <CookStep cook={recipe.cook} onDone={next} />}
        {step === 2 && <PlateStep plate={recipe.plate} decoy={recipe.decoy} onDone={next} />}
        {step === 3 && <Result score={score} pay={vipPay(place, want, score)} name={name} />}
      </div>
    </div>
  )
}

/** A word that pops up and floats away (« Parfait ! »). */
function Say({ text }: { text: { id: number; t: string; good: boolean } | null }) {
  if (!text) return null
  return (
    <div key={text.id} className="float-up pointer-events-none absolute top-[12%] left-1/2 z-10 text-4xl font-extrabold whitespace-nowrap" style={{ color: text.good ? '#ffe066' : '#ffffff', textShadow: '3px 3px 0 #2b1a12, -2px -2px 0 #2b1a12, 2px -2px 0 #2b1a12, -2px 2px 0 #2b1a12' }}>
      {text.t}
    </div>
  )
}
function useSay() {
  const [text, set] = useState<{ id: number; t: string; good: boolean } | null>(null)
  const n = useRef(0)
  return [text, (t: string, good: boolean) => set({ id: ++n.current, t, good })] as const
}

// ---------------------------------------------------------------- 1. cut
const BOX = 240 // size of the vegetable on screen (px)
const GUIDES = [-54, 0, 54] // dotted lines, from its centre

function CutStep({ items, onDone }: { items: Ing[]; onDone: (s: number) => void }) {
  const [idx, setIdx] = useState(0)
  const [cuts, setCuts] = useState<number[]>([])
  const [knife, setKnife] = useState<{ x: number; y: number } | null>(null)
  const [text, say] = useSay()
  const used = useRef([false, false, false])
  const scores = useRef<number[]>([])
  const board = useRef<HTMLDivElement>(null)
  const stroke = useRef<{ x: number; y: number; top: number; bottom: number; cross: number | null; cut: boolean } | null>(null)
  const busy = useRef(false)

  const centre = () => {
    const r = board.current!.getBoundingClientRect()
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
  }
  const down = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const { cx, cy } = centre()
    const x = e.clientX - cx
    const y = e.clientY - cy
    stroke.current = { x, y, top: y, bottom: y, cross: null, cut: false }
    setKnife({ x, y })
  }
  const move = (e: React.PointerEvent) => {
    const s = stroke.current
    if (!s) return
    const { cx, cy } = centre()
    const x = e.clientX - cx
    const y = e.clientY - cy
    // where the knife crossed the middle of the vegetable
    if ((s.y < 0 && y >= 0) || (s.y > 0 && y <= 0)) s.cross = s.x + ((x - s.x) * (0 - s.y)) / (y - s.y || 1)
    s.top = Math.min(s.top, y)
    s.bottom = Math.max(s.bottom, y)
    s.x = x
    s.y = y
    setKnife({ x, y })
    // a cut: the knife went through most of the vegetable, top to bottom (or back)
    if (!s.cut && !busy.current && s.cross !== null && s.top < -BOX * 0.28 && s.bottom > BOX * 0.28) {
      s.cut = true
      cut(s.cross)
    }
  }
  const up = () => {
    stroke.current = null
    setKnife(null)
  }
  function cut(at: number) {
    if (Math.abs(at) > BOX / 2 - 8) return
    const free = GUIDES.map((g, i) => ({ i, d: Math.abs(g - at) })).filter((o) => !used.current[o.i])
    const best = free.sort((a, b) => a.d - b.d)[0]
    if (!best) return
    used.current[best.i] = true
    const s = best.d < 11 ? 1 : best.d < 22 ? 0.7 : best.d < 40 ? 0.4 : 0.15
    scores.current.push(s)
    sfx.chop()
    say(s === 1 ? 'Parfait !' : s >= 0.7 ? 'Bien !' : s > 0.3 ? 'Bof…' : 'Raté !', s >= 0.7)
    setCuts((c) => [...c, Math.max(-BOX / 2 + 14, Math.min(BOX / 2 - 14, at))])
    if (used.current.every(Boolean)) {
      busy.current = true
      setTimeout(() => {
        if (idx + 1 < items.length) {
          setIdx(idx + 1)
          setCuts([])
          used.current = [false, false, false]
          busy.current = false
        } else onDone(scores.current.reduce((a, b) => a + b, 0) / scores.current.length)
      }, 700)
    }
  }
  const sorted = [...cuts].sort((a, b) => a - b)
  const edges = [-BOX / 2, ...sorted, BOX / 2]
  const item = items[idx]
  return (
    <div className="absolute inset-0 touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <Say text={text} />
      <div className="absolute inset-x-0 top-3 text-center text-base font-extrabold">
        Coupe {item.name.toLowerCase()} ! <span className="opacity-60">({idx + 1}/{items.length})</span>
        <div className="text-sm font-bold opacity-75">Glisse le couteau de haut en bas, sur les pointillés</div>
      </div>
      {/* the chopping board */}
      <div className="absolute top-1/2 left-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-[36px] border-[6px] border-[#9c6b3c] bg-[repeating-linear-gradient(90deg,#d9a066_0_22px,#cf955a_22px_44px)] shadow-[0_12px_0_#7a4f27,0_18px_30px_rgba(0,0,0,.25)]" />
      <div ref={board} className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: BOX, height: BOX }}>
        {/* the slices: the same picture, cut into pieces that move apart */}
        {edges.slice(0, -1).map((l, i) => {
          const r = edges[i + 1]
          const spread = (i - (edges.length - 2) / 2) * 22
          return (
            <div
              key={`${idx}-${i}`}
              className="absolute inset-0 grid place-items-center transition-transform duration-200"
              style={{ clipPath: `inset(0 ${((BOX / 2 - r) / BOX) * 100}% 0 ${((l + BOX / 2) / BOX) * 100}%)`, transform: `translateX(${spread}px) rotate(${spread * 0.15}deg)`, fontSize: BOX * 0.8, lineHeight: 1 }}
            >
              <span className="drop-shadow-[0_6px_0_rgba(0,0,0,.18)]"><Icon name={item.icon} size={BOX * 0.8} /></span>
            </div>
          )
        })}
        {/* dotted lines where to cut */}
        {GUIDES.map((g, i) => (
          <div key={i} className="absolute top-[-14px] bottom-[-14px] w-0 border-l-[4px] border-dashed transition-opacity" style={{ left: BOX / 2 + g - 2, borderColor: '#ffffff', opacity: used.current[i] ? 0.15 : 0.95 }} />
        ))}
      </div>
      {/* how to: a hand showing the gesture, on the first vegetable */}
      {idx === 0 && cuts.length === 0 && !knife && <div className="swipe-hint pointer-events-none absolute top-1/2 left-1/2"><Icon name="hand" size={56} /></div>}
      {knife && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 text-6xl" style={{ transform: `translate(${knife.x - 20}px, ${knife.y - 50}px) rotate(-45deg)` }}>
          <Icon name="knife" size={56} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- 2. cook
function CookStep({ cook, onDone }: { cook: Recipe['cook']; onDone: (s: number) => void }) {
  const [, frame] = useState(0)
  const [text, say] = useSay()
  const c = useRef([0, 0])
  const side = useRef(0)
  const flip = useRef(0)
  const scores = useRef<number[]>([])
  const done = useRef(false)
  const zone: [number, number] = [0.6, 0.82]
  const labels = cook.on === 'pot' ? ['Remuer !', 'Retirer du feu !'] : cook.on === 'grill' ? ['Retourner !', 'Retirer !'] : ['Retourner !', 'Sortir !']
  const finish = () => {
    done.current = true
    setTimeout(() => onDone(scores.current.reduce((a, b) => a + b, 0) / scores.current.length), 800)
  }
  const tap = () => {
    if (done.current || flip.current > 0) return
    const v = c.current[side.current]
    const mid = (zone[0] + zone[1]) / 2
    const half = (zone[1] - zone[0]) / 2
    const s = v >= zone[0] && v <= zone[1] ? 1 - (Math.abs(v - mid) / half) * 0.25 : Math.max(0, 0.6 - (Math.abs(v - mid) - half) * 2.5)
    scores.current.push(s)
    if (s >= 0.85) sfx.good()
    else if (s < 0.5) sfx.wrong()
    say(s >= 0.85 ? (cook.on === 'pot' ? 'Bien mijoté !' : 'Bien doré !') : s >= 0.5 ? 'Pas mal !' : v < zone[0] ? 'Pas assez cuit !' : 'Ça a brûlé !', s >= 0.85)
    if (side.current === 0) {
      side.current = 1
      flip.current = 1
    } else finish()
  }
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (!done.current && flip.current <= 0) {
        c.current[side.current] += dt * (side.current ? 0.34 : 0.28)
        sfx.sizzle()
        if (c.current[side.current] > 1.15) {
          scores.current.push(0)
          sfx.wrong()
          say('Ça a brûlé !', false)
          if (side.current === 0) {
            side.current = 1
            flip.current = 1
          } else finish()
        }
      }
      flip.current = Math.max(0, flip.current - dt * 2.2)
      frame((n) => n + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const v = Math.min(1.15, c.current[side.current])
  // what you see: the side facing up (once flipped, the side that cooked first)
  const shown = cook.on === 'pot' ? v : side.current === 0 ? c.current[0] * 0.3 : c.current[0]
  const f = flip.current
  const burnt = Math.max(0, shown - 0.85) / 0.3
  const filter = `sepia(${Math.min(1, shown * 1.6)}) saturate(${1 + shown * 1.8}) brightness(${1.05 - shown * 0.15 - burnt * 0.5}) hue-rotate(${-shown * 8}deg)`
  return (
    <div className="absolute inset-0">
      <Say text={text} />
      <div className="absolute inset-x-0 top-3 text-center text-base font-extrabold">
        {cook.verb} !<div className="text-sm font-bold opacity-75">{cook.on === 'pot' ? 'Remue quand la jauge est dans le doré, puis retire du feu' : 'Retourne quand la jauge est dans le doré, puis sors-le'}</div>
      </div>
      {/* the fire, the pan / grill / pot, the food */}
      <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flame absolute -bottom-6 left-1/2 h-16 w-56 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_50%_100%,#ff922b,#ffd43b_40%,transparent_70%)] blur-[2px]" />
        {cook.on === 'pan' && (
          <div className="relative h-64 w-64 rounded-full border-[10px] border-[#343a40] bg-[radial-gradient(circle_at_45%_40%,#f2d16b,#c99a2e_70%,#8a6a1e)] shadow-[0_10px_0_#212529]">
            <div className="absolute top-1/2 -right-32 h-6 w-32 -translate-y-1/2 rounded-r-full bg-[#495057]" />
          </div>
        )}
        {cook.on === 'grill' && (
          <div className="relative h-60 w-72 overflow-hidden rounded-2xl border-[8px] border-[#343a40] bg-[radial-gradient(circle,#ff6b00,#7a1f00_75%)] shadow-[0_10px_0_#212529]">
            {Array.from({ length: 8 }, (_, k) => (
              <div key={k} className="absolute inset-y-0 w-2 bg-[#495057]" style={{ left: 14 + k * 34 }} />
            ))}
          </div>
        )}
        {cook.on === 'pot' && (
          <div className="relative h-56 w-72 rounded-b-[120px] rounded-t-3xl border-[10px] border-[#343a40] bg-[radial-gradient(ellipse_at_50%_20%,#d9480f,#9c2a00_80%)] shadow-[0_10px_0_#212529]">
            <div className="absolute top-6 -left-10 h-5 w-10 rounded-l-full bg-[#495057]" />
            <div className="absolute top-6 -right-10 h-5 w-10 rounded-r-full bg-[#495057]" />
          </div>
        )}
        {/* bubbles of oil / sauce */}
        {!done.current &&
          Array.from({ length: 10 }, (_, k) => (
            <div key={k} className="bubble absolute h-3 w-3 rounded-full bg-[#fff3bf]/80" style={{ left: 40 + ((k * 53) % 190), top: 50 + ((k * 37) % 140), animationDelay: `${(k * 0.17) % 1}s` }} />
          ))}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 text-[150px] leading-none"
          style={{ transform: `translate(-50%, ${-50 - Math.sin(f * Math.PI) * 60}%) rotateX(${side.current && cook.on !== 'pot' ? (1 - f) * 180 - 180 : 0}deg) rotate(${cook.on === 'pot' ? Math.sin(c.current[side.current] * 40) * 6 : 0}deg)`, filter }}
        >
          <Icon name={cook.food.icon} size={150} />
        </div>
        {/* smoke when it burns */}
        {shown > 0.9 && <div className="smoke absolute -top-24 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-[#495057]/40 blur-xl" />}
      </div>
      {/* the gauge and the button */}
      <div className="absolute inset-x-6 bottom-28 mx-auto max-w-sm">
        <div className="relative h-7 overflow-hidden rounded-full border-4 border-[#2b1a12] bg-[#fff3d6]">
          <div className="absolute inset-y-0 bg-gradient-to-r from-[#ffd43b] to-[#f59f00]" style={{ left: `${(zone[0] / 1.15) * 100}%`, width: `${((zone[1] - zone[0]) / 1.15) * 100}%` }} />
          <div className="absolute inset-y-0 left-0 bg-[#e8590c]/40" style={{ width: `${(v / 1.15) * 100}%` }} />
          <div className="absolute inset-y-[-4px] w-1.5 rounded bg-[#2b1a12]" style={{ left: `calc(${(v / 1.15) * 100}% - 3px)` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-extrabold opacity-70">
          <span>cru</span>
          <span>doré</span>
          <span>brûlé</span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-center p-5" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <button className="w-full max-w-sm rounded-3xl border-4 border-white bg-[#e8432e] py-4 text-2xl font-extrabold text-white shadow-[0_6px_0_#8f1d10] active:translate-y-1 active:shadow-[0_2px_0_#8f1d10]" onPointerDown={tap}>
          {labels[side.current]}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- 3. plate up
function PlateStep({ plate, decoy, onDone }: { plate: Ing[]; decoy: Ing[]; onDone: (s: number) => void }) {
  const [n, setN] = useState(0)
  const [shake, setShake] = useState(-1)
  const [text, say] = useSay()
  const wrong = useRef(0)
  const t0 = useRef(0)
  useEffect(() => {
    t0.current = performance.now()
  }, [])
  // the buttons, shuffled (each ingredient once, plus the decoy)
  const choices = useMemo(() => {
    const all = [...plate.map((p, i) => ({ ...p, i })), ...decoy.map((p) => ({ ...p, i: -1 }))]
    for (let k = all.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1))
      ;[all[k], all[j]] = [all[j], all[k]]
    }
    return all
  }, [plate, decoy])
  const pick = (i: number, b: number) => {
    if (n >= plate.length) return
    if (i === n) {
      sfx.good()
      const k = n + 1
      setN(k)
      if (k === plate.length) {
        const secs = (performance.now() - t0.current) / 1000
        const s = Math.max(0.1, Math.min(1, 1 - wrong.current * 0.25 - Math.max(0, secs - plate.length * 1.6) * 0.04))
        say(s >= 0.85 ? 'Magnifique !' : s >= 0.55 ? 'Joli !' : 'Bon…', s >= 0.55)
        setTimeout(() => onDone(s), 900)
      }
    } else {
      wrong.current++
      sfx.wrong()
      say(i === -1 ? 'Pas ça !' : 'Pas encore !', false)
      setShake(b)
      setTimeout(() => setShake(-1), 400)
    }
  }
  return (
    <div className="absolute inset-0">
      <Say text={text} />
      <div className="absolute inset-x-0 top-3 text-center text-base font-extrabold">
        Monte l’assiette dans l’ordre !<div className="text-sm font-bold opacity-75">Touche les ingrédients comme sur la recette</div>
      </div>
      {/* the recipe card */}
      <div className="absolute top-16 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-2xl border-[3px] border-[#2b1a12] bg-white px-3 py-2 shadow-md">
        {plate.map((p, i) => (
          <div key={i} className={`grid h-11 w-11 place-items-center rounded-xl text-2xl ${i < n ? 'bg-[#d3f9d8] opacity-50' : i === n ? 'bg-[#fff3bf] ring-[3px] ring-[#f59f00]' : 'bg-[#f1f3f5]'}`}>
            <Icon name={p.icon} size={30} />
          </div>
        ))}
      </div>
      {/* the plate, filling up */}
      <div className="absolute top-[40%] left-1/2 grid h-56 w-56 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[10px] border-[#e9ecef] bg-white shadow-[0_10px_0_#ced4da,0_16px_24px_rgba(0,0,0,.2)]">
        {plate.slice(0, n).map((p, i) => {
          const a = (i / Math.max(1, plate.length - 1)) * Math.PI * 2
          const r = i === 0 ? 0 : 58
          return (
            <div key={i} className="pop absolute text-5xl" style={{ transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px)` }}>
              <Icon name={p.icon} size={52} />
            </div>
          )
        })}
      </div>
      <div className="absolute inset-x-0 bottom-0 mx-auto grid max-w-sm grid-cols-3 gap-2 p-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        {choices.map((c, b) => {
          const used = c.i >= 0 && c.i < n
          return (
            <button
              key={b}
              disabled={used}
              className={`flex flex-col items-center rounded-2xl border-[3px] border-[#2b1a12] bg-white py-2 shadow-[0_4px_0_#2b1a12] active:translate-y-1 active:shadow-none disabled:opacity-30 ${shake === b ? 'shake' : ''}`}
              onPointerDown={() => pick(c.i, b)}
            >
              <Icon name={c.icon} size={36} />
              <span className="mt-1 text-[11px] font-extrabold leading-tight">{c.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- the end
function Result({ score, pay, name }: { score: number; pay: number; name: string }) {
  const stars = starsOf(score)
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const ts = [0, 1, 2].map((k) =>
      setTimeout(() => {
        if (k < stars) {
          setShown(k + 1)
          sfx.star(k)
        }
      }, 350 + k * 380),
    )
    return () => ts.forEach(clearTimeout)
  }, [stars])
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-2xl font-extrabold">{stars === 3 ? 'Le VIP est ravi !' : stars === 2 ? 'Le VIP est content' : 'Le VIP mange quand même…'}</div>
      <div className="flex gap-2">
        {[0, 1, 2].map((k) => (
          <span key={k} className={`text-6xl transition-all duration-300 ${k < shown ? 'scale-110' : 'scale-75 opacity-25 grayscale'}`}>
            <Icon name="star" size={64} />
          </span>
        ))}
      </div>
      <div className="rounded-2xl border-4 border-white bg-[#69db3c] px-5 py-2 text-3xl font-extrabold text-white shadow-[0_5px_0_#2b8a3e]" style={{ textShadow: '2px 2px 0 #2b8a3e' }}>
        +{pay} F
      </div>
      <div className="text-sm font-bold opacity-75">{name} paie ×{(1 + 2 * score).toFixed(1)}, pourboire compris</div>
      <button
        className="mt-2 w-full max-w-xs rounded-3xl border-4 border-white bg-[#e8432e] py-4 text-2xl font-extrabold text-white shadow-[0_6px_0_#8f1d10] active:translate-y-1"
        onPointerDown={() => {
          const r = useVip.getState().ready
          if (r) useVip.setState({ open: false, done: { id: r.id, score } })
        }}
      >
        Servir !
      </button>
    </div>
  )
}
