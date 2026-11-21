import { Component, type ReactNode } from 'react'

// If anything in the game breaks, show what happened and a way back, instead of a blank beige page.
// After an update of the site, a phone that still runs the old version can't find the old pieces of the game any
// more ("dynamically imported module"): then the page reloads itself once to get the new version.

const STALE = /dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically|Failed to fetch/i

function reloadOnce() {
  try {
    const at = Number(sessionStorage.getItem('babiland-reloaded') ?? 0)
    if (Date.now() - at < 30000) return false
    sessionStorage.setItem('babiland-reloaded', String(Date.now()))
  } catch {
    /* private mode: reload anyway */
  }
  location.reload()
  return true
}

if (typeof window !== 'undefined') {
  // Vite says so when a piece of the game fails to load
  window.addEventListener('vite:preloadError', (e) => {
    e.preventDefault()
    reloadOnce()
  })
  window.addEventListener('unhandledrejection', (e) => {
    if (STALE.test(String((e.reason as Error)?.message ?? e.reason))) reloadOnce()
  })
}

export class Crash extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error) {
    try {
      localStorage.setItem('babiland-last-error', `${new Date().toISOString()} ${error.message}\n${(error.stack ?? '').slice(0, 1200)}`)
    } catch {
      /* full or private */
    }
    if (STALE.test(error.message)) reloadOnce()
  }
  render() {
    const e = this.state.error
    if (!e) return this.props.children
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#fdf3e1] p-6 text-center text-[#2b1a12]">
        <div className="max-w-sm">
          <div className="text-2xl font-extrabold">Oups, le jeu a eu un souci</div>
          <p className="mt-2 text-sm opacity-80">Ta partie est sauvegardée. Relance le jeu pour continuer.</p>
          <button className="mt-4 rounded-2xl bg-[#2f9e44] px-6 py-3 text-lg font-extrabold text-white shadow-[0_4px_0_rgba(0,0,0,.25)]" onClick={() => location.reload()}>
            Relancer le jeu
          </button>
          {/* what broke, small: a screenshot of it helps to repair it */}
          <pre className="mt-5 max-h-40 overflow-auto rounded-xl bg-white/70 p-2 text-left text-[10px] leading-snug whitespace-pre-wrap opacity-70">{e.message}</pre>
        </div>
      </div>
    )
  }
}
