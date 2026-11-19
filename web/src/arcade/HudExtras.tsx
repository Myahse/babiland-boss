import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { DISHES, placeDishes, PLACES } from './places'
import { sfx } from './sfx'
import { popText, useArcade } from './store'
import { CHEST, claim, freshMissions, MISSION_ICON, missionText, readyCount, useMissions } from './missions'

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
      <button
        className={`pointer-events-auto relative flex items-center gap-1 rounded-2xl border-[3px] border-white bg-[#7048e8] px-3 py-1.5 text-sm font-extrabold text-white shadow-[0_4px_0_rgba(0,0,0,.2)] active:translate-y-0.5 ${ready ? 'vip-glow' : ''}`}
        onPointerDown={stop}
        onClick={() => {
          freshMissions()
          setOpen(true)
        }}
      >
        🎯 Missions
        {ready > 0 && <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[#e03131] text-xs">{ready}</span>}
      </button>
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
      popText(`🎯 +${fcfa(m)} FCFA`)
    }
  }
  const all = s.list.length > 0 && s.list.every((m) => m.claimed)
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" onPointerDown={stop} onClick={onClose}>
      <div className="card pop w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">🎯 Missions du jour</h2>
          <button className="text-2xl font-extrabold" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <p className="text-sm font-semibold opacity-75">Trois missions par jour. Fais-les toutes pour ouvrir le coffre !</p>
        <div className="mt-3 flex flex-col gap-2">
          {s.list.map((m, i) => {
            const done = m.n >= m.goal
            return (
              <div key={i} className={`flex items-center gap-2 rounded-xl border-2 border-[var(--color-ink)] px-2.5 py-2 ${m.claimed ? 'bg-[#d3f9d8]' : 'bg-white'}`}>
                <span className="text-2xl">{MISSION_ICON[m.kind]}</span>
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
                  <span className="text-xl">✅</span>
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
          <span className="text-4xl">{s.chest ? '📭' : '🎁'}</span>
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
    <div className="absolute top-[4.6rem] right-3 w-44 rounded-2xl border-[3px] border-white bg-[#fff3bf] px-2.5 py-1.5 shadow-md" style={{ marginTop: 'env(safe-area-inset-top)' }}>
      <div className="truncate text-[11px] font-extrabold opacity-80">📦 {bulk.name}</div>
      <div className="flex items-center justify-between text-base font-extrabold">
        <span>
          {d.icon} {bulk.got}/{bulk.want}
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
