import { useEffect, useState } from 'react'
import { PLACES } from './places'
import { sfx } from './sfx'
import { useArcade } from './store'
import { awaySinceStart, offlineReport, OFFLINE_MAX, watchSeen, type Offline } from './offline'

const time = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${Math.max(1, m)} min`
}
const fcfa = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ')

/** « Pendant ton absence… »: what your staff made while you were away (at start, or back to the tab). */
export function OfflinePanel() {
  const [rep, setRep] = useState<Offline | null>(() => offlineReport(awaySinceStart()))
  useEffect(() => watchSeen((away) => setRep((r) => r ?? offlineReport(away))), [])
  if (!rep) return null
  const take = () => {
    useArcade.setState((s) => ({ money: s.money + rep.total }))
    if (rep.total > 0) {
      sfx.cash()
      sfx.unlock()
    }
    setRep(null)
  }
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-black/45 p-4" onPointerDown={(e) => e.stopPropagation()}>
      <div className="card pop w-full max-w-sm !p-4">
        <div className="text-center text-3xl">🌙</div>
        <div className="text-center text-xl font-extrabold">Pendant ton absence…</div>
        <div className="text-center text-sm font-bold opacity-70">
          Tu es parti {time(rep.away)}
          {rep.away > OFFLINE_MAX ? ` (on compte ${time(OFFLINE_MAX)} au plus : reviens plus souvent !)` : ''}
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          {rep.rows.map((r) => (
            <div key={r.place} className="flex items-center gap-2 rounded-xl border-2 border-[var(--color-ink)] bg-white px-2.5 py-1.5">
              <span className="h-7 w-7 shrink-0 rounded-lg border-2 border-white shadow" style={{ background: PLACES[r.place].wall }} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-sm font-extrabold">{PLACES[r.place].name}</div>
                <div className="text-[11px] font-semibold opacity-75">{r.missing ?? `Ton équipe : ${r.staff.join(', ')}`}</div>
              </div>
              <div className={`shrink-0 text-base font-extrabold ${r.amount ? 'text-[#2b8a3e]' : 'opacity-40'}`}>{r.amount ? `+${fcfa(r.amount)} F` : '0 F'}</div>
            </div>
          ))}
          {rep.rent > 0 && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-[var(--color-ink)] bg-white px-2.5 py-1.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center text-lg">🏙️</span>
              <div className="min-w-0 flex-1 text-sm leading-tight font-extrabold">Loyers de tes quartiers</div>
              <div className="shrink-0 text-base font-extrabold text-[#2b8a3e]">+{fcfa(rep.rent)} F</div>
            </div>
          )}
        </div>
        <button className="mt-4 w-full rounded-3xl border-4 border-white bg-[#69db3c] py-3 text-2xl font-extrabold text-white shadow-[0_5px_0_#2b8a3e] active:translate-y-1" style={{ textShadow: '2px 2px 0 #2b8a3e' }} onClick={take}>
          {rep.total > 0 ? `Encaisser +${fcfa(rep.total)} F` : 'On reprend !'}
        </button>
      </div>
    </div>
  )
}
