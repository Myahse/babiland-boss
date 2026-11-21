import { Icon } from './Icons'
import { Food } from './Food'
import { cookLive, GUIDE_X, HALF, KitchenCanvas, pickBoard, useKitchen } from './Kitchen3D'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PLACES } from './places'
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
  // the 3D kitchen follows the steps
  useEffect(() => {
    useKitchen.setState({ step })
  }, [step])
  useEffect(() => {
    useKitchen.setState({ step: 0, item: null, cuts: [], used: [false, false, false], flashes: [], finished: false, knife: null, on: recipe.cook.on, food: recipe.cook.food.icon, plate: recipe.plate.map((p) => p.icon), placed: 0 })
  }, [recipe])
  const STEP_ICONS = ['knife', recipe.cook.on === 'pot' ? 'pot' : 'fire', 'plate'] as const
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col overflow-hidden select-none" onPointerDown={stop} style={{ touchAction: 'none' }}>
      <KitchenCanvas />
      {/* header: the VIP's card and the three steps */}
      <div className="relative z-10 mx-3 mt-3 rounded-3xl border-[3px] border-[#2b1a12] bg-white/90 px-3 py-2 shadow-[0_5px_0_rgba(43,26,18,.25)] backdrop-blur" style={{ marginTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[3px] border-[#2b1a12] bg-[radial-gradient(circle_at_35%_30%,#fff3bf,#fab005_70%,#e67700)] shadow-[0_3px_0_#2b1a12]">
            <Icon name="crown" size={28} />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[11px] font-extrabold tracking-wide text-[#c77700] uppercase">Commande spéciale · {name}</div>
            <div className="text-lg font-extrabold">
              {PLACES[place].dishLabel} <span className="text-[#c77700]">× {want}</span>
            </div>
          </div>
          <div className="shrink-0 rounded-xl bg-[#2b1a12] px-2 py-1 text-xs font-extrabold text-[#ffe066]">jusqu’à ×3</div>
        </div>
        {/* the steps: three medals on a line that fills */}
        <div className="relative mt-2 flex items-center justify-between px-6">
          <div className="absolute inset-x-10 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#f1e3c6]" />
          <div className="absolute top-1/2 left-10 h-1.5 -translate-y-1/2 rounded-full bg-[#40c057] transition-all duration-500" style={{ width: `calc((100% - 5rem) * ${Math.min(step, 2) / 2})` }} />
          {STEPS.map((label, i) => (
            <div key={label} className="relative flex flex-col items-center">
              <div className={`grid h-9 w-9 place-items-center rounded-full border-[3px] transition-all duration-300 ${i < step ? 'border-[#2b8a3e] bg-[#d3f9d8]' : i === step ? 'scale-110 border-[#2b1a12] bg-[#ffe066] shadow-[0_0_0_4px_rgba(255,212,59,.45)]' : 'border-[#d9c39a] bg-white opacity-70'}`}>
                <Icon name={i < step ? 'check' : STEP_ICONS[i]} size={20} />
              </div>
              <span className="mt-0.5 text-[10px] font-extrabold">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative flex-1">
        <div key={step} className="step-in absolute inset-0">
          {step === 0 && <CutStep items={recipe.cut} onDone={next} />}
          {step === 1 && <CookStep cook={recipe.cook} onDone={next} />}
          {step === 2 && <PlateStep plate={recipe.plate} decoy={recipe.decoy} onDone={next} />}
          {step === 3 && <Result score={score} pay={vipPay(place, want, score)} name={name} />}
        </div>
      </div>
    </div>
  )
}

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
// (in the 3D kitchen's units: the ingredient spans x -HALF..HALF on the board, the guides at GUIDE_X)
function CutStep({ items, onDone }: { items: Ing[]; onDone: (s: number) => void }) {
  const [idx, setIdx] = useState(0)
  const [cuts, setCuts] = useState<number[]>([])
  const [touching, setTouching] = useState(false)
  const [text, say] = useSay()
  const used = useRef([false, false, false])
  const scores = useRef<number[]>([])
  const stroke = useRef<{ x: number; z: number; top: number; bottom: number; cross: number | null; cut: boolean } | null>(null)
  const busy = useRef(false)
  const flashId = useRef(0)
  const item = items[idx]
  // the 3D board shows this ingredient and its cuts
  useEffect(() => {
    useKitchen.setState({ item: item.icon, cuts, used: [...used.current], finished: cuts.length === GUIDE_X.length })
  }, [item, cuts])

  const down = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const p = pickBoard(e.clientX, e.clientY)
    if (!p) return
    stroke.current = { x: p[0], z: p[1], top: p[1], bottom: p[1], cross: null, cut: false }
    useKitchen.setState({ knife: p })
    setTouching(true)
  }
  const move = (e: React.PointerEvent) => {
    const s = stroke.current
    const p = pickBoard(e.clientX, e.clientY)
    if (!s || !p) return
    const [x, z] = p
    // where the knife crossed the middle of the ingredient
    if ((s.z < 0 && z >= 0) || (s.z > 0 && z <= 0)) s.cross = s.x + ((x - s.x) * (0 - s.z)) / (z - s.z || 1e-6)
    s.top = Math.min(s.top, z)
    s.bottom = Math.max(s.bottom, z)
    s.x = x
    s.z = z
    useKitchen.setState({ knife: p })
    // a cut: the knife went through most of the ingredient, front to back (or back)
    if (!s.cut && !busy.current && s.cross !== null && s.top < -HALF * 0.5 && s.bottom > HALF * 0.5) {
      s.cut = true
      cut(s.cross)
    }
  }
  const up = () => {
    stroke.current = null
    useKitchen.setState({ knife: null })
    setTouching(false)
  }
  function cut(at: number) {
    if (Math.abs(at) > HALF - 0.07) return
    const free = GUIDE_X.map((g, i) => ({ i, d: Math.abs(g - at) })).filter((o) => !used.current[o.i])
    const best = free.sort((a, b) => a.d - b.d)[0]
    if (!best) return
    used.current[best.i] = true
    const s = best.d < 0.1 ? 1 : best.d < 0.2 ? 0.7 : best.d < 0.36 ? 0.4 : 0.15
    scores.current.push(s)
    sfx.chop()
    if (navigator.vibrate) navigator.vibrate(15)
    say(s === 1 ? 'Parfait !' : s >= 0.7 ? 'Bien !' : s > 0.3 ? 'Bof…' : 'Raté !', s >= 0.7)
    const x = Math.max(-HALF + 0.12, Math.min(HALF - 0.12, at))
    useKitchen.setState((k) => ({ flashes: [...k.flashes.slice(-4), { x, id: ++flashId.current }] }))
    setCuts((c) => [...c, x])
    if (used.current.every(Boolean)) {
      busy.current = true
      setTimeout(() => {
        if (idx + 1 < items.length) {
          setIdx(idx + 1)
          setCuts([])
          used.current = [false, false, false]
          useKitchen.setState({ flashes: [] })
          busy.current = false
        } else onDone(scores.current.reduce((a, b) => a + b, 0) / scores.current.length)
      }, 900)
    }
  }
  return (
    <div className="absolute inset-0 touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <Say text={text} />
      <Hint title={`Coupe ${item.name.toLowerCase()} !`} sub="Glisse le couteau du haut vers le bas, sur les pointillés" count={`${idx + 1}/${items.length}`} />
      {/* how to: a hand showing the gesture, on the first ingredient */}
      {idx === 0 && cuts.length === 0 && !touching && <div className="swipe-hint pointer-events-none absolute top-1/2 left-1/2"><Icon name="hand" size={56} /></div>}
    </div>
  )
}

/** the instruction at the top of a step */
function Hint({ title, sub, count }: { title: string; sub: string; count?: string }) {
  return (
    <div className="absolute inset-x-4 top-3 z-10 mx-auto max-w-sm rounded-2xl bg-[#2b1a12]/85 px-3 py-2 text-center text-white shadow-lg">
      <div className="text-lg leading-tight font-extrabold">
        {title} {count && <span className="ml-1 rounded-full bg-[#ffd43b] px-2 text-sm text-[#2b1a12]">{count}</span>}
      </div>
      <div className="text-xs font-bold opacity-80">{sub}</div>
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
  const inZone = v >= zone[0] && v <= zone[1]
  // what the 3D pan shows
  cookLive.shown = shown
  cookLive.side = side.current
  cookLive.flip = f
  cookLive.done = done.current
  return (
    <div className="absolute inset-0">
      <Say text={text} />
      <Hint title={`${cook.verb} !`} sub={cook.on === 'pot' ? 'Touche quand l’aiguille est dans le doré, puis retire du feu' : 'Retourne quand l’aiguille est dans le doré, puis sors-le'} />
      {/* the gauge: raw, golden, burnt, and the needle */}
      <div className="absolute inset-x-6 bottom-32 mx-auto max-w-sm">
        <div className="relative h-8 rounded-full border-4 border-[#2b1a12] bg-[linear-gradient(90deg,#ffe3c4,#ffc078_45%,#d9480f_80%,#3b1d0b)] shadow-[0_4px_0_rgba(0,0,0,.25)]">
          <div className={`absolute inset-y-[-6px] rounded-lg border-[3px] border-white ${inZone ? 'shadow-[0_0_16px_#ffd43b]' : ''}`} style={{ left: `${(zone[0] / 1.15) * 100}%`, width: `${((zone[1] - zone[0]) / 1.15) * 100}%`, background: 'rgba(255,212,59,.55)' }} />
          <div className="absolute -top-4 -bottom-4 w-2 rounded-full bg-[#2b1a12] shadow-[0_0_0_2px_#fff]" style={{ left: `calc(${(v / 1.15) * 100}% - 4px)` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-xs font-extrabold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.7)]">
          <span>cru</span>
          <span>doré</span>
          <span>brûlé</span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-center p-5" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <button className={`w-full max-w-sm rounded-3xl border-4 border-white py-4 text-2xl font-extrabold text-white transition-colors active:translate-y-1 ${inZone ? 'pulse-btn bg-[#2f9e44] shadow-[0_6px_0_#1b5e20]' : 'bg-[#e8432e] shadow-[0_6px_0_#8f1d10]'}`} onPointerDown={tap}>
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
  // the 3D plate fills up
  useEffect(() => {
    useKitchen.setState({ placed: n })
  }, [n])
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
      <Hint title="Monte l’assiette dans l’ordre !" sub="Touche les ingrédients comme sur la recette" />
      {/* the recipe card, pinned to the wall */}
      <div className="absolute top-[86px] left-1/2 flex -translate-x-1/2 -rotate-1 gap-1.5 rounded-xl border-[3px] border-[#2b1a12] bg-[#fffdf3] px-3 py-2 shadow-[0_5px_0_rgba(43,26,18,.3)]">
        <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-[#e8432e] shadow" />
        {plate.map((p, i) => (
          <div key={i} className={`grid h-12 w-12 place-items-center rounded-xl transition-all ${i < n ? 'bg-[#d3f9d8] opacity-50' : i === n ? 'scale-110 bg-[#fff3bf] ring-[3px] ring-[#f59f00]' : 'bg-[#f1f3f5]'}`}>
            <Food icon={p.icon} size={38} />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 mx-auto grid max-w-sm grid-cols-3 gap-2.5 p-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        {choices.map((c, b) => {
          const used = c.i >= 0 && c.i < n
          return (
            <button
              key={b}
              disabled={used}
              className={`flex flex-col items-center rounded-2xl border-[3px] border-[#2b1a12] bg-[#fffdf3] py-2 shadow-[0_5px_0_#2b1a12] transition-opacity active:translate-y-1 active:shadow-none disabled:opacity-25 ${shake === b ? 'shake' : ''}`}
              onPointerDown={() => pick(c.i, b)}
            >
              <Food icon={c.icon} size={44} />
              <span className="mt-1 text-[11px] leading-tight font-extrabold">{c.name}</span>
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
  // the money rolls up
  const [money, setMoney] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0 - 900) / 900)
      if (k > 0) setMoney(Math.round(pay * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
      else sfx.cash()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pay])
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 p-5 pb-8">
      {/* confetti */}
      {stars >= 2 &&
        Array.from({ length: 28 }, (_, k) => (
          <div key={k} className="confetti absolute top-[-20px] h-3 w-2 rounded-sm" style={{ left: `${(k * 37) % 100}%`, background: ['#ffd43b', '#e8432e', '#2f9e44', '#1c7ed6', '#f08c00'][k % 5], animationDelay: `${(k * 0.09) % 1.2}s`, ['--r' as string]: `${(k % 2 ? 1 : -1) * (200 + k * 20)}deg` }} />
        ))}
      <div className="rounded-3xl border-[3px] border-[#2b1a12] bg-white/95 px-6 py-5 text-center shadow-[0_6px_0_rgba(43,26,18,.3)]">
        <div className="text-2xl font-extrabold">{stars === 3 ? 'Le VIP est ravi !' : stars === 2 ? 'Le VIP est content' : 'Le VIP mange quand même…'}</div>
        <div className="mt-3 flex justify-center gap-2">
          {[0, 1, 2].map((k) => (
            <span key={k} className={k < shown ? 'star-in' : 'scale-75 opacity-25 grayscale'}>
              <Icon name="star" size={64} />
            </span>
          ))}
        </div>
        <div className="mt-3 inline-block rounded-2xl border-4 border-white bg-[#69db3c] px-5 py-2 text-3xl font-extrabold text-white shadow-[0_5px_0_#2b8a3e]" style={{ textShadow: '2px 2px 0 #2b8a3e' }}>
          +{money.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} F
        </div>
        <div className="mt-2 text-sm font-bold opacity-75">{name} paie ×{(1 + 2 * score).toFixed(1)}, pourboire compris</div>
      </div>
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
