import { RoundButton } from './HudButton'
import { STEPS, tier } from './looks'
import { STYLE_PARTS, stylePrice, type StyleKey } from './styles'
import { Icon, type IconName } from './Icons'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { DISHES, placeDishes, PLACES } from './places'
import { FAME_AT, fameLevel, fameNews, fameText, STAGES } from './growth'
import { bossName, useTurf } from './turf'
import { sfx } from './sfx'
import { popText, useArcade } from './store'
import { ITEMS, itemPrice, type Item } from './items'
import { CHEST, claim, freshMissions, MISSION_ICON, missionEvent, missionText, readyCount, useMissions } from './missions'

const stop = (e: React.PointerEvent) => e.stopPropagation()
const fcfa = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ')

/** 🎯 Missions: the button (with how many rewards wait) and the panel of the day. */
export function MissionsButton() {
  const ready = useMissions(readyCount)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    freshMissions()
    // the day can change while playing
    const iv = setInterval(freshMissions, 60000)
    return () => clearInterval(iv)
  }, [])
  return (
    <>
      <RoundButton
        icon={<Icon name="target" size={28} />}
        label="Missions"
        color="#7048e8"
        badge={ready || null}
        glow={ready > 0}
        onClick={() => {
          freshMissions()
          setOpen(true)
        }}
      />
      {open && createPortal(<MissionsPanel onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

function MissionsPanel({ onClose }: { onClose: () => void }) {
  const s = useMissions()
  const take = (i: number) => {
    const m = claim(i)
    if (m) {
      sfx.cash()
      sfx.unlock()
      popText(`+${fcfa(m)} FCFA`)
    }
  }
  const all = s.list.length > 0 && s.list.every((m) => m.claimed)
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" onPointerDown={stop} onClick={onClose}>
      <div className="card pop w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold"><Icon name="target" size={26} className="mr-1.5 align-[-4px]" />Missions du jour</h2>
          <button className="text-2xl font-extrabold" onClick={onClose} aria-label="Fermer">
            <Icon name="cross" size={22} />
          </button>
        </div>
        <p className="text-sm font-semibold opacity-75">Trois missions par jour. Fais-les toutes pour ouvrir le coffre !</p>
        <div className="mt-3 flex flex-col gap-2">
          {s.list.map((m, i) => {
            const done = m.n >= m.goal
            return (
              <div key={i} className={`flex items-center gap-2 rounded-xl border-2 border-[var(--color-ink)] px-2.5 py-2 ${m.claimed ? 'bg-[#d3f9d8]' : 'bg-white'}`}>
                <Icon name={MISSION_ICON[m.kind]} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-tight font-extrabold">{missionText(m)}</div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[#e9ecef]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#9775fa] to-[#7048e8]" style={{ width: `${(m.n / m.goal) * 100}%` }} />
                  </div>
                  <div className="mt-0.5 text-[11px] font-bold opacity-70">
                    {m.kind === 'stand' ? `${fcfa(m.n)} / ${fcfa(m.goal)} F` : `${m.n} / ${m.goal}`} · récompense {fcfa(m.reward)} F
                  </div>
                </div>
                {m.claimed ? (
                  <Icon name="check" size={24} />
                ) : (
                  <button className="btn btn-green !px-3 !py-1.5 !text-sm" disabled={!done} onClick={() => take(i)}>
                    {done ? 'Prendre' : '…'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className={`mt-3 flex items-center gap-3 rounded-2xl border-[3px] p-3 ${all && !s.chest ? 'vip-glow border-[#f59f00] bg-[#fff3bf]' : 'border-dashed border-[#c9b79c]'}`}>
          <Icon name={s.chest ? 'chestOpen' : 'gift'} size={44} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-base font-extrabold">Coffre du jour</div>
            <div className="text-xs font-bold opacity-75">{s.chest ? 'Ouvert ! Nouvelles missions demain.' : `Les 3 missions faites : +${fcfa(CHEST(s))} F en plus`}</div>
          </div>
          {!s.chest && (
            <button className="btn !px-3 !py-1.5 !text-sm" disabled={!all} onClick={() => take(-1)}>
              Ouvrir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** The bulk order in progress: who, how many plates of what, the time left. */
export function BulkBanner() {
  const bulk = useArcade((s) => s.bulk)
  const place = useArcade((s) => s.current)
  if (!bulk) return null
  const d = DISHES[placeDishes(PLACES[place])[bulk.dish]]
  const left = Math.ceil(bulk.left)
  const hurry = left <= 20
  return (
    <div className="absolute top-[6.4rem] right-3 w-44 rounded-2xl border-[3px] border-white bg-[#fff3bf] px-2.5 py-1.5 shadow-md" style={{ marginTop: 'env(safe-area-inset-top)' }}>
      <div className="truncate text-[11px] font-extrabold opacity-80"><Icon name="box" size={14} className="mr-1 align-[-2px]" />{bulk.name}</div>
      <div className="flex items-center justify-between text-base font-extrabold">
        <span>
          <Icon name={d.icon} size={20} className="mr-1 align-[-4px]" />{bulk.got}/{bulk.want}
        </span>
        <span className={hurry ? 'animate-pulse text-[#e03131]' : ''}>
          ⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e9ecef]">
        <div className={`h-full rounded-full ${hurry ? 'bg-[#e03131]' : 'bg-[#f59f00]'}`} style={{ width: `${(bulk.left / bulk.time) * 100}%` }} />
      </div>
      <div className="mt-0.5 text-[10px] leading-tight font-bold opacity-70">Pose les plats dans la caisse jaune, près de la rue</div>
    </div>
  )
}

/** Who knows you here, and how far to the next level (under the place's name). */
/** the picture of each stage of a place (growth.ts) */
export const STAGE_ICONS: IconName[] = ['stool', 'house', 'cloche', 'crown']

export function FameChip({ level }: { level: number }) {
  const place = useArcade((s) => s.current)
  const fame = useArcade((s) => s.fame)
  const stage = useArcade((s) => s.stage)
  const owners = useTurf((s) => s.owners[place])
  const boss = owners?.[0] !== 'me' ? bossName(place, 0) : null
  const lv = fameLevel(fame)
  const next = FAME_AT[lv + 1]
  const k = next ? (fame - FAME_AT[lv]) / (next - FAME_AT[lv]) : 1
  return (
    <div className="w-48 rounded-2xl bg-white/85 px-2.5 py-1.5 shadow backdrop-blur-sm">
      <div className="flex items-baseline justify-between gap-1 text-[12px] leading-tight font-extrabold">
        <span className="flex min-w-0 items-center gap-1 truncate">
          <Icon name={STAGE_ICONS[stage]} size={16} /> {PLACES[place].name}
        </span>
        <span className="shrink-0 rounded-full bg-[#e8432e] px-1.5 text-[10px] text-white">niv {level}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 truncate text-[10.5px] leading-tight font-bold opacity-80">
        <Icon name="megaphone" size={13} /> {fameText(place, lv)}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e9ecef]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#ffa94d] to-[#f76707] transition-all" style={{ width: `${k * 100}%` }} />
      </div>
      {boss && (
        <div className="mt-1 flex items-center gap-1 truncate text-[10px] leading-tight font-extrabold text-[#7048e8]">
          <Icon name="boss" size={13} /> {boss} prend 20 %
        </div>
      )}
    </div>
  )
}

/** The place just grew (a big card), or more people know you (a banner that goes away by itself). */
export function NewsLayer() {
  const news = useArcade((s) => s.news)
  const place = useArcade((s) => s.current)
  useEffect(() => {
    if (news?.kind !== 'fame') return
    const t = setTimeout(() => useArcade.setState({ news: null }), 3800)
    return () => clearTimeout(t)
  }, [news])
  if (!news) return null
  if (news.kind === 'fame') {
    const st = STAGES.find((x) => x.fame === news.level)
    return (
      <div key={news.id} className="pop pointer-events-none absolute inset-x-0 top-[22%] z-30 flex justify-center px-4">
        <div className="max-w-sm rounded-3xl border-4 border-white bg-gradient-to-b from-[#ffa94d] to-[#f76707] px-5 py-3 text-center text-white shadow-xl" style={{ textShadow: '1px 1px 0 #a33a00' }}>
          <div className="flex justify-center"><Icon name="megaphone" size={36} /></div>
          <div className="text-lg leading-tight font-extrabold">{fameText(place, news.level)} !</div>
          <div className="text-sm font-bold">{fameNews(place, news.level)}</div>
          {st && <div className="mt-1 rounded-xl bg-white/25 px-2 py-0.5 text-xs font-extrabold"><Icon name={st.icon} size={16} className="mr-1 align-[-3px]" />Tu peux devenir un {st.name.toLowerCase()} : va sur le carré doré</div>}
        </div>
      </div>
    )
  }
  const st = STAGES[news.level]
  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onPointerDown={stop}>
      <div className="card pop w-full max-w-sm !p-5 text-center">
        <div className="flex justify-center"><Icon name={st.icon} size={72} /></div>
        <div className="mt-1 text-xs font-extrabold tracking-wide text-[#e8590c] uppercase">{PLACES[place].name} · ça grandit !</div>
        <div className="text-2xl leading-tight font-extrabold">{news.level === 1 ? 'Ton petit coin devient un maquis !' : `Ton maquis devient un ${st.name.toLowerCase()} !`}</div>
        <ul className="mt-3 space-y-1 text-left text-sm font-bold">
          {st.news.map((n) => (
            <li key={n} className="flex gap-2 rounded-xl bg-white px-2.5 py-1.5">
              <Icon name="sparkle" size={18} />
              <span>{n}</span>
            </li>
          ))}
        </ul>
        <button className="btn btn-green mt-4 w-full !py-3 !text-xl" onClick={() => useArcade.setState({ news: null })}>
          On y va !
        </button>
      </div>
    </div>,
    document.body,
  )
}

/** 🛠️ Aménager: hire assistants and fit out the room (items.ts), from the moment the place is a maquis. */
export function AmenagerButton() {
  const stage = useArcade((s) => s.stage)
  const [open, setOpen] = useState(false)
  if (stage < 1) return null
  return (
    <>
      <RoundButton icon={<Icon name="tools" size={28} />} label="Aménager" color="#e8590c" onClick={() => setOpen(true)} />
      {open && createPortal(<AmenagerPanel onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

function AmenagerPanel({ onClose }: { onClose: () => void }) {
  const place = useArcade((s) => s.current)
  const money = useArcade((s) => s.money)
  const items = useArcade((s) => s.items)
  const state = useArcade((s) => s)
  const buy = (it: Item) => {
    const price = itemPrice(place, it)
    const s = useArcade.getState()
    if (s.money < price || s.items.includes(it.id)) return
    useArcade.setState({ money: s.money - price, items: [...s.items, it.id] })
    missionEvent('unlock')
    sfx.unlock()
    popText(`${it.label} !`)
  }
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" onPointerDown={stop} onClick={onClose}>
      <div className="card pop max-h-[88%] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold"><Icon name="tools" size={26} className="mr-1.5 align-[-4px]" />Aménager</h2>
          <button className="text-2xl font-extrabold" onClick={onClose} aria-label="Fermer">
            <Icon name="cross" size={22} />
          </button>
        </div>
        <p className="text-sm font-semibold opacity-75">{PLACES[place].name} : prends du monde avec toi et équipe ta salle.</p>
        <StyleSection />
        {(['staff', 'room'] as const).map((kind) => (
          <div key={kind}>
            <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">{kind === 'staff' ? 'Assistants' : 'La salle'}</div>
            <div className="mt-1 space-y-1.5">
              {ITEMS.filter((it) => it.kind === kind).map((it) => {
                const owned = items.includes(it.id)
                const blocked = it.needs?.(state) ?? null
                const price = itemPrice(place, it)
                return (
                  <div key={it.id} className={`flex items-center gap-2 rounded-xl border-2 px-2.5 py-1.5 ${owned ? 'border-[#2f9e44] bg-[#d3f9d8]' : 'border-[var(--color-ink)] bg-white'}`}>
                    <Icon name={it.icon} size={36} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-sm font-extrabold">{it.label}</div>
                      <div className="text-[11px] font-semibold opacity-75">{blocked && !owned ? blocked : it.text}</div>
                    </div>
                    {owned ? (
                      <Icon name="check" size={24} />
                    ) : (
                      <button className="btn !px-2.5 !py-1.5 !text-sm" disabled={!!blocked || money < price} onClick={() => buy(it)}>
                        {fcfa(price)} F
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** « Le style »: each part of the maquis goes through the ten looks (looks.ts); each level shows and helps. */
function StyleSection() {
  const place = useArcade((s) => s.current)
  const money = useArcade((s) => s.money)
  const style = useArcade((s) => s.style)
  const buy = (key: StyleKey) => {
    const s = useArcade.getState()
    const to = s.style[key] + 1
    const price = stylePrice(place, key, to)
    if (to > STEPS || s.money < price) return
    useArcade.setState({ money: s.money - price, style: { ...s.style, [key]: to } })
    missionEvent('unlock')
    sfx.unlock()
    popText(`${STYLE_PARTS.find((p) => p.key === key)!.label} : ${tier(to).name} !`)
  }
  const nameOf = (key: StyleKey, l: number) => (key === 'facade' && l === 1 ? 'Les couleurs de la maison' : tier(l).name)
  return (
    <div>
      <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">Le style · 10 looks chacun</div>
      <div className="mt-1 space-y-1.5">
        {STYLE_PARTS.map((p) => {
          const l = style[p.key]
          const max = l >= STEPS
          const price = max ? 0 : stylePrice(place, p.key, l + 1)
          const next = tier(l + 1)
          return (
            <div key={p.key} className="rounded-xl border-2 border-[var(--color-ink)] bg-white px-2.5 py-1.5">
              <div className="flex items-center gap-2">
                <Icon name={p.icon} size={34} />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-sm font-extrabold">{p.label}</div>
                  <div className="text-[11px] font-bold text-[#e8590c]">
                    Niveau {l}/{STEPS} · {nameOf(p.key, l)}
                  </div>
                </div>
                {max ? (
                  <span className="rounded-full bg-[#fff3bf] px-2 py-0.5 text-xs font-extrabold">MAX</span>
                ) : (
                  <button className="btn !px-2.5 !py-1.5 !text-sm" disabled={money < price} onClick={() => buy(p.key)}>
                    {fcfa(price)} F
                  </button>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <div className="flex flex-1 gap-0.5">
                  {Array.from({ length: STEPS }, (_, i) => (
                    <span key={i} className={`h-1.5 flex-1 rounded-full ${i < l ? 'bg-[#40c057]' : 'bg-[#e9ecef]'}`} />
                  ))}
                </div>
                {!max && (
                  <span className="flex shrink-0 items-center gap-1 text-[10px] font-extrabold opacity-80">
                    suivant : {next.name}
                    {[next.body, next.front, next.trim].map((c, i) => (
                      <span key={i} className="inline-block h-3 w-3 rounded-full border border-[var(--color-ink)]" style={{ background: c }} />
                    ))}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold opacity-60">{p.bonus}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
