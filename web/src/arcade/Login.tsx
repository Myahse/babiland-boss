import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds } from '@react-three/drei'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { sfx } from './sfx'
import { API, ApiError, GOOGLE_ID, googleSignIn, pullSave, signIn } from './online'
import { CHARACTERS } from './profile'
import { ToonPerson } from './ToonPerson'

// The first screen, like a mobile game's: the maquis in 3D behind, the logo, the five characters, how many play;
// a panel at the bottom with three big choices (Google, create an account, I have one) and « play without ».
// The form only shows once you chose, with a way back.

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
)
const USER = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6'
const LOCK = 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4'
const EYE = 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'
const BACK = 'M15 18l-6-6 6-6'

/** How many bosses play, how many are online now. */
function useStats() {
  const [s, setS] = useState<{ players: number; online: number } | null>(null)
  useEffect(() => {
    let alive = true
    const get = () =>
      fetch(`${API}/api/v1/stats`)
        .then((r) => r.json())
        .then((j) => alive && setS(j))
        .catch(() => undefined)
    get()
    const t = setInterval(get, 20000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])
  return s
}
const fmt = (n: number) => n.toLocaleString('fr-FR').replace(/ | /g, ' ')

/** The five characters standing side by side. */
function Crew() {
  return (
    <Canvas camera={{ position: [0, 1.4, 6], fov: 30 }} dpr={[1, 2]} gl={{ alpha: true }} style={{ background: 'transparent' }}>
      <hemisphereLight args={['#fff4e0', '#e8894a', 1.7]} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} />
      <Suspense fallback={null}>
        <Bounds fit clip margin={0.62}>
          <group>
            {CHARACTERS.map((c, i) => {
              const x = (i - 2) * 0.62
              return <ToonPerson key={c.who} who={c.who} moving={false} position={[x, 0, -Math.abs(i - 2) * 0.18]} rotation={[0, -x * 0.25, 0]} scale={1.1} />
            })}
          </group>
        </Bounds>
      </Suspense>
    </Canvas>
  )
}

const input = 'w-full rounded-2xl border-[3px] border-[#2b1a12] bg-white py-3 pr-11 pl-11 text-base font-bold outline-none focus:border-[#e8590c]'

/** `onDone(boss, created)`: signed in (an account with no game yet, or a new one); `onGuest`: play without. */
export function LoginPage({ onDone, onGuest }: { onDone: (boss: string, created: boolean) => void; onGuest: () => void }) {
  const stats = useStats()
  const [view, setView] = useState<'home' | 'register' | 'login' | 'name'>('home')
  const [boss, setBoss] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  // a new Google account: its credential kept while the player picks a boss name
  const [google, setGoogle] = useState<string | null>(null)
  const go = (v: typeof view) => {
    setView(v)
    setErr('')
  }

  const afterSignIn = async (name: string, created: boolean) => {
    // an account that already has a game: it comes back on this phone
    if (!created && (await pullSave())) {
      location.reload()
      return
    }
    sfx.unlock()
    onDone(name, created)
  }
  const withGoogle = async (credential: string, name?: string) => {
    setBusy(true)
    setErr('')
    try {
      const r = await googleSignIn(credential, name)
      if ('needName' in r) {
        setGoogle(credential)
        if (r.suggestion && !name) setBoss(r.suggestion)
        if (r.error) setErr(r.error)
        setView('name')
      } else await afterSignIn(r.name, r.created)
    } catch (e) {
      setErr((e as ApiError).message)
    }
    setBusy(false)
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (view === 'name' && google) return withGoogle(google, boss.trim())
    setBusy(true)
    setErr('')
    try {
      const s = await signIn(boss.trim(), password, view === 'register')
      await afterSignIn(s.name, view === 'register')
    } catch (e) {
      setErr((e as ApiError).message)
    }
    setBusy(false)
  }

  const googleButton = GOOGLE_ID ? (
    <div className="flex h-[46px] justify-center [&>div]:w-full">
      <GoogleOAuthProvider clientId={GOOGLE_ID}>
        <GoogleLogin
          onSuccess={(r) => {
            if (r.credential) void withGoogle(r.credential)
          }}
          onError={() => setErr('Connexion Google annulée')}
          text="continue_with"
          shape="pill"
          size="large"
          width="340"
        />
      </GoogleOAuthProvider>
    </div>
  ) : null

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col" onPointerDown={(e) => e.stopPropagation()}>
      {/* the maquis in 3D shows through at the top */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fff4e0]/10 via-[#ffe8cc]/55 to-[#ffd8a8]" />
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-end px-4" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
        <h1 className="text-center text-[54px] leading-[0.86] font-extrabold tracking-tight text-[#ff922b]" style={{ textShadow: '-3px -3px 0 #2b1a12, 3px -3px 0 #2b1a12, -3px 3px 0 #2b1a12, 3px 3px 0 #2b1a12, 0 -3px 0 #2b1a12, 0 3px 0 #2b1a12, -3px 0 0 #2b1a12, 3px 0 0 #2b1a12, 0 8px 0 #2b1a12' }}>
          BABILAND
          <br />
          <span className="text-[#40c057]">BOSS</span>
        </h1>
        <div className="-mt-2 h-[30vh] max-h-72 min-h-40 w-full max-w-md">
          <Crew />
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#2b1a12]/80 px-3 py-1 text-xs font-extrabold text-white shadow">
          <span>🍛 {stats ? fmt(stats.players) : '…'} boss</span>
          <span className="opacity-40">•</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#69db7c]" /> {stats ? fmt(stats.online) : '…'} en ligne
          </span>
        </div>
      </div>

      {/* the panel */}
      <section className="relative mt-3 rounded-t-[32px] border-t-4 border-[#2b1a12] bg-[#fff8ec] px-5 pt-5 shadow-[0_-10px_30px_rgba(0,0,0,.18)]" style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto w-full max-w-sm">
          {view === 'home' ? (
            <div key="home" className="pop flex flex-col gap-2.5">
              <p className="mb-1 text-center text-base leading-snug font-extrabold">Du petit coin sur le trottoir au boss de Babi.</p>
              {googleButton}
              <button className="btn btn-green w-full !py-3 !text-lg" onClick={() => go('register')}>
                Créer mon compte
              </button>
              <button className="btn w-full !py-3 !text-lg !text-white" onClick={() => go('login')}>
                J’ai déjà un compte
              </button>
              {err && <p className="rounded-xl bg-[#ffe3e3] px-3 py-1.5 text-sm font-extrabold text-[#c92a2a]">{err}</p>}
              <button className="self-center py-1.5 text-sm font-bold underline underline-offset-4 opacity-60" onClick={onGuest}>
                Jouer sans compte
              </button>
            </div>
          ) : (
            <form key={view} className="pop flex flex-col gap-2.5" onSubmit={submit}>
              <div className="flex items-center gap-2">
                {view !== 'name' && (
                  <button type="button" className="-ml-2 grid h-10 w-10 place-items-center rounded-full active:bg-black/5" onClick={() => go('home')} aria-label="Retour">
                    <Icon d={BACK} size={24} />
                  </button>
                )}
                <h2 className="text-2xl font-extrabold">{view === 'register' ? 'Créer mon compte' : view === 'login' ? 'Me connecter' : 'Ton nom de boss'}</h2>
              </div>
              {view === 'name' && <p className="-mt-1 text-sm font-semibold opacity-70">Google a confirmé ton compte. Comment on t’appelle à Babi ?</p>}
              <label className="relative block">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 opacity-50">
                  <Icon d={USER} />
                </span>
                <input className={input} placeholder="Nom de boss" autoComplete="username" maxLength={20} value={boss} onChange={(e) => setBoss(e.target.value)} aria-label="Nom de boss" autoFocus />
              </label>
              {view !== 'name' && (
                <label className="relative block">
                  <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 opacity-50">
                    <Icon d={LOCK} />
                  </span>
                  <input
                    className={input}
                    type={show ? 'text' : 'password'}
                    placeholder={view === 'register' ? 'Mot de passe (6 min.)' : 'Mot de passe'}
                    autoComplete={view === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-label="Mot de passe"
                  />
                  <button type="button" className={`absolute top-1/2 right-3 -translate-y-1/2 p-1 ${show ? 'opacity-90' : 'opacity-45'}`} onClick={() => setShow(!show)} aria-label={show ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}>
                    <Icon d={EYE} size={20} />
                  </button>
                </label>
              )}
              {err && (
                <p className="rounded-xl bg-[#ffe3e3] px-3 py-1.5 text-sm font-extrabold text-[#c92a2a]" role="alert">
                  {err}
                </p>
              )}
              <button className="btn btn-green w-full !py-3 !text-xl" disabled={busy || boss.trim().length < 3 || (view !== 'name' && password.length < 6)}>
                {busy ? '…' : view === 'login' ? 'Me connecter' : 'C’est parti !'}
              </button>
              <p className="text-center text-xs font-semibold opacity-60">{view === 'login' ? 'Ta partie revient telle que tu l’as laissée.' : 'Ta partie est sauvegardée en ligne, sur tous tes téléphones.'}</p>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
