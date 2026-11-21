import { Icon } from './Icons'
import { Food, hasSection } from './Food'
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
  const STEP_ICONS = ['knife', recipe.cook.on === 'pot' ? 'pot' : 'fire', 'plate'] as const
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex flex-col overflow-hidden select-none" onPointerDown={stop} style={{ touchAction: 'none' }}>
      <Kitchen />
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

/** The kitchen behind: a tiled wall, a strip of wax print, the wooden worktop, warm light. */
function Kitchen() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-0 top-0 h-[42%] bg-[#eef4f6] bg-[repeating-linear-gradient(0deg,#cfdde3_0_2px,transparent_2px_44px),repeating-linear-gradient(90deg,#cfdde3_0_2px,transparent_2px_44px)]" />
      <div className="absolute inset-x-0 top-[42%] h-5 border-y-[3px] border-[#2b1a12] bg-[repeating-linear-gradient(45deg,#f08c00_0_12px,#2f9e44_12px_24px,#e8432e_24px_36px,#ffd43b_36px_48px)]" />
      <div className="absolute inset-x-0 top-[calc(42%+20px)] bottom-0 bg-[#b9773d] bg-[repeating-linear-gradient(90deg,rgba(0,0,0,.06)_0_3px,transparent_3px_38px),linear-gradient(#c98a4b,#9c5f2c)]" />
      <div className="absolute inset-x-0 top-[calc(42%+20px)] h-4 bg-gradient-to-b from-black/25 to-transparent" />
      {/* the warm light of the kitchen, darker in the corners */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,236,190,.35),transparent_55%,rgba(40,20,5,.35))]" />
    </div>
  )
}

/** A knife, drawn (blade + wooden handle), pointing down-left. */
function Knife({ size = 90 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="kblade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".5" stopColor="#cfd8dc" />
          <stop offset="1" stopColor="#78909c" />
        </linearGradient>
      </defs>
      <path d="M8 92L58 34l10 10L20 96c-6 2-12 0-12-4z" fill="url(#kblade)" stroke="#455a64" strokeWidth="2" />
      <rect x="60" y="14" width="14" height="40" rx="5" transform="rotate(45 67 34)" fill="#6d4c41" stroke="#3e2723" strokeWidth="2" />
      <circle cx="68" cy="26" r="2" fill="#ffe082" />
      <circle cx="76" cy="18" r="2" fill="#ffe082" />
    </svg>
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
  const finished = cuts.length === GUIDES.length
  return (
    <div className="absolute inset-0 touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <Say text={text} />
      <Hint title={`Coupe ${item.name.toLowerCase()} !`} sub="Glisse le couteau de haut en bas, sur les pointillés" count={`${idx + 1}/${items.length}`} />
      {/* the chopping board, on the worktop */}
      <div className="absolute top-[54%] left-1/2 h-[330px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[44px] border-[5px] border-[#6d4321] bg-[#d9a066] bg-[repeating-linear-gradient(92deg,rgba(120,70,30,.12)_0_2px,transparent_2px_17px),radial-gradient(ellipse_at_30%_25%,#f0c590,#cf955a_70%)] shadow-[0_14px_0_#7a4f27,0_24px_34px_rgba(0,0,0,.35)]">
        <div className="absolute top-4 left-1/2 h-5 w-14 -translate-x-1/2 rounded-full bg-[#7a4f27]/70 shadow-inner" />
      </div>
      <div ref={board} className="pointer-events-none absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: BOX, height: BOX }}>
        {/* the slices: the same picture, cut into pieces that move apart; once all cut, the rounds tumble out */}
        {!finished &&
          edges.slice(0, -1).map((l, i) => {
            const r = edges[i + 1]
            const spread = (i - (edges.length - 2) / 2) * 16
            return (
              <div
                key={`${idx}-${i}`}
                className="absolute inset-0 grid place-items-center transition-transform duration-300 ease-out"
                style={{ clipPath: `inset(0 ${((BOX / 2 - r) / BOX) * 100}% 0 ${((l + BOX / 2) / BOX) * 100}%)`, transform: `translateX(${spread}px) rotate(${spread * 0.25}deg)` }}
              >
                <Food icon={item.icon} size={BOX * 0.82} />
              </div>
            )
          })}
        {finished && (
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            {[0, 1, 2, 3].map((k) => (
              <div key={k} className="tumble" style={{ animationDelay: `${k * 60}ms`, ['--r' as string]: `${(k - 1.5) * 24}deg` }}>
                <Food icon={item.icon} size={hasSection(item.icon) ? 62 : 70} section />
              </div>
            ))}
          </div>
        )}
        {/* dotted lines where to cut */}
        {!finished &&
          GUIDES.map((g, i) => (
            <div key={i} className="absolute top-[-18px] bottom-[-18px] w-0 border-l-[4px] border-dashed transition-opacity duration-300" style={{ left: BOX / 2 + g - 2, borderColor: '#ffffff', opacity: used.current[i] ? 0 : 0.95, filter: 'drop-shadow(0 0 3px rgba(0,0,0,.35))' }} />
          ))}
        {/* the cuts: a white flash and drops of juice */}
        {sorted.map((x) => (
          <div key={`${idx}-s${x}`} className="pointer-events-none absolute inset-y-[-30px]" style={{ left: BOX / 2 + x - 3 }}>
            <div className="slash h-full w-1.5 rounded-full bg-white shadow-[0_0_12px_#fff]" />
            {Array.from({ length: 7 }, (_, k) => (
              <div key={k} className="juice absolute top-1/2 h-2.5 w-2.5 rounded-full" style={{ background: JUICE[item.icon] ?? '#ffe082', ['--dx' as string]: `${(k - 3) * 14}px`, ['--dy' as string]: `${-30 - ((k * 17) % 40)}px` }} />
            ))}
          </div>
        ))}
      </div>
      {/* how to: a hand showing the gesture, on the first vegetable */}
      {idx === 0 && cuts.length === 0 && !knife && <div className="swipe-hint pointer-events-none absolute top-1/2 left-1/2"><Icon name="hand" size={56} /></div>}
      {knife && (
        <div className="pointer-events-none absolute top-[56%] left-1/2" style={{ transform: `translate(${knife.x - 12}px, ${knife.y - 82}px)` }}>
          <Knife />
        </div>
      )}
    </div>
  )
}
/** the colour of the juice when you cut */
const JUICE: Partial<Record<string, string>> = { tomato: '#ff5252', onion: '#f3e5f5', chili: '#ff1744', pepper: '#aed581', aubergine: '#f5f0dc', plantain: '#fff3c4', leaves: '#7cb342' }

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
  const burnt = Math.max(0, shown - 0.85) / 0.3
  const filter = `sepia(${Math.min(1, shown * 1.6)}) saturate(${1 + shown * 1.8}) brightness(${1.05 - shown * 0.15 - burnt * 0.5}) hue-rotate(${-shown * 8}deg)`
  const inZone = v >= zone[0] && v <= zone[1]
  return (
    <div className="absolute inset-0">
      <Say text={text} />
      <Hint title={`${cook.verb} !`} sub={cook.on === 'pot' ? 'Touche quand l’aiguille est dans le doré, puis retire du feu' : 'Retourne quand l’aiguille est dans le doré, puis sors-le'} />
      {/* the stove: the fire under the pan / grill / pot */}
      <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-90">
        <div className="absolute -bottom-9 left-1/2 h-10 w-72 -translate-x-1/2 rounded-[50%] bg-[#212529] shadow-[0_6px_0_#000]" />
        <div className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 gap-1">
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <div key={k} className="flicker h-12 w-7 origin-bottom rounded-[50%_50%_40%_40%] bg-[radial-gradient(ellipse_at_50%_90%,#fff3bf,#ffd43b_30%,#ff6b00_65%,transparent_72%)]" style={{ animationDelay: `${(k * 0.07) % 0.3}s`, animationDuration: `${0.16 + (k % 3) * 0.05}s` }} />
          ))}
        </div>
        {cook.on === 'pan' && (
          <div className="relative h-64 w-64 rounded-full bg-[radial-gradient(circle_at_40%_35%,#6c757d,#212529_70%)] p-3 shadow-[0_12px_0_#111,0_20px_30px_rgba(0,0,0,.4)]">
            <div className="absolute top-1/2 -right-36 h-7 w-36 -translate-y-1/2 rounded-r-full bg-[linear-gradient(#5c3b24,#3e2716)] shadow-[0_4px_0_#1e130a]" />
            <div className="relative h-full w-full overflow-hidden rounded-full bg-[radial-gradient(circle_at_45%_40%,#f7dc7a,#d9a73a_60%,#a1741f)]">
              <div className="shimmer absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,.45)_50%,transparent_65%)]" />
            </div>
          </div>
        )}
        {cook.on === 'grill' && (
          <div className="relative h-60 w-72 overflow-hidden rounded-3xl border-[8px] border-[#343a40] bg-[radial-gradient(circle,#ff8a00,#c92a2a_45%,#3b0a00_85%)] shadow-[0_12px_0_#111,0_20px_30px_rgba(0,0,0,.4)]">
            <div className="shimmer absolute inset-0 bg-[radial-gradient(circle_at_30%_60%,rgba(255,200,0,.5),transparent_30%),radial-gradient(circle_at_70%_40%,rgba(255,120,0,.5),transparent_30%)]" />
            {Array.from({ length: 8 }, (_, k) => (
              <div key={k} className="absolute inset-y-0 w-2.5 bg-[linear-gradient(90deg,#adb5bd,#495057)]" style={{ left: 12 + k * 34 }} />
            ))}
          </div>
        )}
        {cook.on === 'pot' && (
          <div className="relative h-56 w-72 rounded-t-3xl rounded-b-[120px] border-[10px] border-[#343a40] bg-[radial-gradient(ellipse_at_50%_15%,#ff7a3d,#c2410c_55%,#7c2d12)] shadow-[0_12px_0_#111,0_20px_30px_rgba(0,0,0,.4)]">
            <div className="absolute top-6 -left-12 h-6 w-12 rounded-l-full bg-[#495057]" />
            <div className="absolute top-6 -right-12 h-6 w-12 rounded-r-full bg-[#495057]" />
            <div className="shimmer absolute inset-x-4 top-2 h-10 rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)]" />
          </div>
        )}
        {/* oil / sauce: bubbles and spatters, the steam above */}
        {!done.current &&
          Array.from({ length: 12 }, (_, k) => (
            <div key={k} className="bubble absolute h-3 w-3 rounded-full bg-[#fff3bf]/80" style={{ left: 40 + ((k * 53) % 190), top: 50 + ((k * 37) % 140), animationDelay: `${(k * 0.17) % 1}s` }} />
          ))}
        {!done.current &&
          cook.on !== 'pot' &&
          Array.from({ length: 8 }, (_, k) => (
            <div key={`s${k}`} className="spatter absolute top-1/2 left-1/2 h-1.5 w-1.5 rounded-full bg-[#fff8e1]" style={{ animationDelay: `${(k * 0.23) % 1.4}s`, ['--dx' as string]: `${Math.cos(k * 0.8) * 120}px`, ['--dy' as string]: `${-50 - ((k * 29) % 70)}px` }} />
          ))}
        {[0, 1, 2].map((k) => (
          <div key={`v${k}`} className="steam absolute -top-6 h-20 w-12 rounded-full bg-white/50 blur-md" style={{ left: 60 + k * 60, animationDelay: `${k * 0.6}s` }} />
        ))}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2"
          style={{ transform: `translate(-50%, ${-50 - Math.sin(f * Math.PI) * 70}%) rotateX(${side.current && cook.on !== 'pot' ? (1 - f) * 180 - 180 : 0}deg) rotate(${cook.on === 'pot' ? Math.sin(c.current[side.current] * 40) * 6 : 0}deg)`, filter }}
        >
          <Food icon={cook.food.icon} size={170} />
        </div>
        {/* smoke when it burns */}
        {shown > 0.9 && <div className="smoke absolute -top-24 left-1/2 h-28 w-28 rounded-full bg-[#495057]/50 blur-xl" />}
      </div>
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
      {/* the plate, with a wax-print rim, filling up */}
      <div className="absolute top-[47%] left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[repeating-conic-gradient(#f08c00_0_10deg,#2f9e44_10deg_20deg,#ffd43b_20deg_30deg)] p-3 shadow-[0_10px_0_rgba(0,0,0,.25),0_18px_28px_rgba(0,0,0,.3)]">
        <div className="relative grid h-full w-full place-items-center rounded-full bg-[radial-gradient(circle_at_40%_35%,#ffffff,#eef1f3_70%)] shadow-inner">
          {plate.slice(0, n).map((p, i) => {
            const a = (i / Math.max(1, plate.length - 1)) * Math.PI * 2 - Math.PI / 2
            const r = i === 0 ? 0 : 56
            return (
              <div key={i} className="drop-in absolute" style={{ ['--x' as string]: `${Math.cos(a) * r}px`, ['--y' as string]: `${Math.sin(a) * r}px` }}>
                <Food icon={p.icon} size={i === 0 ? 96 : 58} />
              </div>
            )
          })}
          {n >= plate.length && <div className="sparkle-ring absolute inset-[-14px] rounded-full border-4 border-[#ffe066]" />}
        </div>
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
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
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
