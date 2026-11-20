import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bounds } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../store'
import { DISHES, PLACE_IDS, PLACES, type PlaceId } from './places'
import { CHARACTERS, useProfile, type Profile } from './profile'
import { sfx } from './sfx'
import { useArcade } from './store'
import { CHAPTERS, currentStep, skipToProgress, storyCtx, tickStory, useStory, type Line, type Speaker } from './story'
import { DISTRICTS, useTurf } from './turf'
import { useVip } from './vip'
import { ToonPerson } from './ToonPerson'
import { ONLINE_ON, pushSave, useOnline } from './online'
import { LoginPage } from './Login'

// The start of the game (name, character, home place, the story told in a few pictures), the dialogues of the
// chapters, the current goal on screen and the arrow in the shop that shows where to go.

const stop = (e: React.PointerEvent) => e.stopPropagation()

/** The character, turning slowly, in a little 3D stage. */
function Turntable({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.6
  })
  return (
    <group ref={g} position={[0, -0.05, 0]}>
      {children}
    </group>
  )
}

function Preview({ who }: { who: Profile['who'] }) {
  return (
    <Canvas camera={{ position: [0, 1.15, 3.1], fov: 34 }} dpr={[1, 2]}>
      <hemisphereLight args={['#fff4e0', '#e8894a', 1.6]} />
      <directionalLight position={[2, 4, 3]} intensity={2} />
      <Suspense fallback={null}>
        {/* the camera fits the character, whatever its size */}
        <Bounds fit clip margin={1.0} key={who}>
          <Turntable>
            <ToonPerson who={who} moving={false} scale={1.15} />
          </Turntable>
        </Bounds>
      </Suspense>
    </Canvas>
  )
}

const SLIDES = (home: PlaceId, name: string) => {
  const p = PLACES[home]
  const boss = DISTRICTS[home][0].boss
  return [
    { icon: '🌅', bg: 'from-[#ffd8a8] to-[#ff922b]', text: `${p.name}, 6 h du matin. Ici, tout le monde se souvient du ${p.dishLabel.toLowerCase()} de Mami Adjoua, ta grand-mère.` },
    { icon: '👵🏾', bg: 'from-[#d3f9d8] to-[#69db7c]', text: `« ${name}, je rentre au village. Je te laisse mon réchaud et ma recette. Fais-en quelque chose de grand. »` },
    { icon: '😎', bg: 'from-[#e5dbff] to-[#9775fa]', text: `Mais ton quartier a un boss : ${boss}. Sur tout ce qui se vend chez lui, il prend 20 %.` },
    { icon: DISHES[p.dish].icon, bg: 'from-[#fff3bf] to-[#fcc419]', text: `Un petit coin sur le trottoir pour commencer. Fais connaître ton ${p.dishLabel.toLowerCase()} dans ta rue, puis dans tout ${p.name}… et un jour, tout Babi.` },
  ]
}

/** The first screen: continue, or make your boss and choose where you come from. */
export function Intro() {
  const profile = useProfile((s) => s.profile)
  const start = useGame((s) => s.start)
  const hasSave = useArcade((s) => s.served > 0 || s.owned.length > 1 || s.money > 0)
  const signedIn = useOnline((s) => !!s.token)
  const [step, setStep] = useState<'continue' | 'login' | 'name' | 'who' | 'home' | 'story'>(profile ? 'continue' : ONLINE_ON && !useOnline.getState().token ? 'login' : 'name')
  const [name, setName] = useState(profile?.name ?? '')
  const [who, setWho] = useState<Profile['who']>(profile?.who ?? 'aya')
  const [home, setHome] = useState<PlaceId>(profile?.home ?? 'yopougon')
  const [slide, setSlide] = useState(0)
  const c = CHARACTERS.findIndex((x) => x.who === who)

  const play = (p: Profile, fresh: boolean) => {
    useProfile.setState({ profile: p })
    if (fresh) useArcade.setState({ current: p.home, owned: [p.home] })
    start(p.name)
    sfx.unlock()
    setTimeout(() => void pushSave(useArcade.getState().fame), 1500)
  }
  const done = () => {
    const p = { name: name.trim() || 'Boss', who, home }
    // a game already going (from before the story): keep it, the story starts at the right chapter
    if (hasSave) {
      play({ ...p, home: useArcade.getState().current }, false)
      skipToProgress()
    } else play(p, true)
  }
  const newGame = () => {
    if (!confirm('Recommencer une nouvelle partie ? Ta partie sur ce téléphone sera effacée.')) return
    for (const k of Object.keys(localStorage)) if (k.startsWith('babiland-')) localStorage.removeItem(k)
    location.reload()
  }

  const card = 'card pop w-full max-w-md max-h-[92%] overflow-y-auto'
  return (
    <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 via-black/10 to-transparent p-3 sm:items-center" onPointerDown={stop}>
      {step === 'continue' && profile && (
        <div className={card}>
          <Logo />
          <div className="mx-auto mt-2 h-44 w-44">
            <Preview who={profile.who} />
          </div>
          <div className="text-center text-lg font-extrabold">Bon retour, {profile.name} !</div>
          <div className="text-center text-sm font-semibold opacity-75">
            {PLACES[profile.home].name} · {PLACES[profile.home].dishLabel}
          </div>
          <button className="btn btn-green mt-4 w-full text-xl" onClick={() => play(profile, false)}>
            Continuer
          </button>
          {ONLINE_ON && !signedIn && (
            <button className="btn mt-2 w-full !py-2 !text-base" onClick={() => setStep('login')}>
              🔐 Me connecter · sauvegarder en ligne
            </button>
          )}
          <button className="mt-3 w-full text-center text-xs font-bold underline opacity-60" onClick={newGame}>
            Nouvelle partie
          </button>
        </div>
      )}
      {step === 'name' && (
        <div className={card}>
          <Logo />
          <p className="mt-1 text-center text-base font-semibold">Pars d’un petit coin sur le trottoir et deviens le boss de la bouffe à Babi.</p>
          <label className="mt-4 block text-sm font-extrabold">Ton nom</label>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 14))} placeholder="Ex. : Tantie Aya" className="mt-1 w-full rounded-2xl border-[3px] border-[var(--color-ink)] bg-white px-4 py-2.5 text-lg font-bold outline-none" />
          <button className="btn btn-green mt-4 w-full text-xl" disabled={name.trim().length < 2} onClick={() => setStep('who')}>
            Suivant
          </button>
        </div>
      )}
      {step === 'login' && (
        <LoginPage
          onDone={(boss) => {
            // a player who already had a game on this phone keeps it, now saved online
            if (profile) {
              void pushSave(useArcade.getState().fame)
              setStep('continue')
              return
            }
            setName(boss)
            setStep('who')
          }}
          onGuest={() => setStep(profile ? 'continue' : 'name')}
        />
      )}
      {step === 'who' && (
        <div className={card}>
          <div className="text-center text-xl font-extrabold">Choisis ton personnage</div>
          <div className="relative mx-auto mt-1 h-60 w-full">
            <Preview who={who} />
            {[-1, 1].map((d) => (
              <button
                key={d}
                className="absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border-[3px] border-[var(--color-ink)] bg-white text-xl font-extrabold shadow"
                style={{ [d < 0 ? 'left' : 'right']: 4 }}
                onClick={() => setWho(CHARACTERS[(c + d + CHARACTERS.length) % CHARACTERS.length].who)}
                aria-label={d < 0 ? 'Précédent' : 'Suivant'}
              >
                {d < 0 ? '‹' : '›'}
              </button>
            ))}
          </div>
          <div className="text-center text-lg font-extrabold">{CHARACTERS[c].label}</div>
          <div className="text-center text-sm font-semibold opacity-75">{CHARACTERS[c].text}</div>
          <div className="mt-2 flex justify-center gap-1.5">
            {CHARACTERS.map((x) => (
              <span key={x.who} className={`h-2.5 w-2.5 rounded-full ${x.who === who ? 'bg-[var(--color-orange)]' : 'bg-[#e9d8c0]'}`} />
            ))}
          </div>
          <button className="btn btn-green mt-4 w-full text-xl" onClick={() => (hasSave ? done() : setStep('home'))}>
            {hasSave ? 'On y va !' : 'Suivant'}
          </button>
        </div>
      )}
      {step === 'home' && (
        <div className={card}>
          <div className="text-center text-xl font-extrabold">D’où tu viens ?</div>
          <p className="text-center text-sm font-semibold opacity-75">Tu commences là-bas, avec le plat de chez toi.</p>
          {[false, true].map((city) => (
            <div key={String(city)}>
              <div className="mt-3 text-xs font-extrabold tracking-wide uppercase">{city ? 'Autres villes' : 'Communes d’Abidjan'}</div>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {PLACE_IDS.filter((id) => PLACES[id].city === city).map((id) => (
                  <button key={id} className={`flex items-center gap-2 rounded-xl border-[3px] px-2 py-1.5 text-left ${home === id ? 'border-[var(--color-ink)] bg-[#ffe8cc]' : 'border-transparent bg-white'}`} onClick={() => setHome(id)}>
                    <span className="text-2xl">{DISHES[PLACES[id].dish].icon}</span>
                    <span className="leading-tight">
                      <span className="block text-sm font-extrabold">{PLACES[id].name}</span>
                      <span className="block text-[11px] font-semibold opacity-75">{PLACES[id].dishLabel}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button className="btn btn-green mt-4 w-full text-xl" onClick={() => setStep('story')}>
            Suivant
          </button>
        </div>
      )}
      {step === 'story' && (
        <StorySlides slides={SLIDES(home, name.trim() || 'Boss')} slide={slide} setSlide={setSlide} onDone={done} />
      )}
    </div>
  )
}

function Logo() {
  return (
    <h1 className="text-center text-5xl leading-none font-extrabold text-[var(--color-orange)]" style={{ textShadow: '3px 3px 0 #2b1a12' }}>
      BABILAND <span className="text-[var(--color-green)]">BOSS</span>
    </h1>
  )
}

function StorySlides({ slides, slide, setSlide, onDone }: { slides: ReturnType<typeof SLIDES>; slide: number; setSlide: (n: number) => void; onDone: () => void }) {
  const s = slides[slide]
  const last = slide === slides.length - 1
  return (
    <div key={slide} className={`pop w-full max-w-md overflow-hidden rounded-[28px] border-4 border-[var(--color-ink)] bg-gradient-to-b ${s.bg} shadow-2xl`}>
      <div className="grid h-52 place-items-center text-[110px] leading-none drop-shadow-[0_6px_0_rgba(0,0,0,.15)]">{s.icon}</div>
      <div className="bg-[var(--color-cream)] p-5">
        <p className="min-h-[5.5rem] text-lg leading-snug font-bold">{s.text}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <span key={i} className={`h-2.5 w-2.5 rounded-full ${i === slide ? 'bg-[var(--color-orange)]' : 'bg-[#e9d8c0]'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {!last && (
              <button className="px-2 text-sm font-bold underline opacity-60" onClick={onDone}>
                Passer
              </button>
            )}
            <button className="btn btn-green !px-5" onClick={() => (last ? onDone() : setSlide(slide + 1))}>
              {last ? 'On y va !' : 'Suite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const FACE: Record<Speaker, { icon: string; name: (c: ReturnType<typeof storyCtx>) => string; color: string }> = {
  mami: { icon: '👵🏾', name: () => 'Mami Adjoua', color: '#2f9e44' },
  boss: { icon: '😎', name: (c) => c.boss, color: '#7048e8' },
  me: { icon: '🙂', name: (c) => c.name, color: '#e8590c' },
  voice: { icon: '📖', name: () => 'L’histoire', color: '#495057' },
}

/** The dialogue of a chapter (the game waits), and the goal on screen. */
export function StoryLayer() {
  const talking = useStory((s) => s.talking)
  const chapter = useStory((s) => s.chapter)
  const stepIdx = useStory((s) => s.step)
  const done = useStory((s) => s.done)
  const [k, setK] = useState(0)
  const [open, setOpen] = useState(false)
  // the bottom of the screen is taken: a VIP waiting, a duel
  const busy = useVip((s) => !!s.ready) || useTurf((s) => !!s.duel || !!s.incoming)
  useEffect(() => {
    const t = setInterval(tickStory, 400)
    return () => clearInterval(t)
  }, [])
  useEffect(() => setK(0), [talking])
  const ctx = storyCtx()
  if (talking && talking[k]) {
    const l: Line = talking[k]
    const f = FACE[l.who]
    const next = () => (k + 1 < talking.length ? setK(k + 1) : useStory.setState({ talking: null }))
    return (
      <div className="pointer-events-auto absolute inset-0 z-40 flex items-end bg-black/35 p-3" onPointerDown={stop} onClick={next}>
        <div key={`${chapter}-${k}`} className="pop mx-auto flex w-full max-w-md items-end gap-2" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-white text-5xl shadow-lg" style={{ background: f.color }}>
            {f.icon}
          </div>
          <div className="card min-w-0 flex-1 !p-3">
            <div className="text-xs font-extrabold tracking-wide uppercase" style={{ color: f.color }}>
              {f.name(ctx)}
            </div>
            <div className="mt-0.5 text-base leading-snug font-bold">{l.text}</div>
            <div className="mt-1 text-right text-xs font-extrabold opacity-50">Touche pour continuer ▸</div>
          </div>
        </div>
      </div>
    )
  }
  if (done || busy) return null
  const ch = CHAPTERS[chapter]
  if (!ch) return null
  const steps = ch.steps(ctx)
  const step = steps[stepIdx]
  if (!step) return null
  return (
    <>
      <button
        className="pointer-events-auto absolute bottom-4 left-1/2 z-10 flex max-w-[92%] -translate-x-1/2 items-center gap-2 rounded-2xl border-[3px] border-[var(--color-ink)] bg-[var(--color-cream)] px-3 py-2 text-left shadow-lg"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        onPointerDown={stop}
        onClick={() => setOpen(true)}
      >
        <span className="text-xl">📖</span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[10px] font-extrabold tracking-wide text-[var(--color-orange)] uppercase">
            Chapitre {chapter + 1} · {ch.title} · {stepIdx + 1}/{steps.length}
          </span>
          <span className="block truncate text-sm font-extrabold">{step.text}</span>
        </span>
      </button>
      {open && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center" onPointerDown={stop} onClick={() => setOpen(false)}>
          <div className="card pop w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs font-extrabold tracking-wide text-[var(--color-orange)] uppercase">Chapitre {chapter + 1} / {CHAPTERS.length}</div>
            <h2 className="text-2xl font-extrabold">📖 {ch.title}</h2>
            <ul className="mt-2 space-y-1.5">
              {steps.map((s, i) => (
                <li key={i} className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-bold ${i < stepIdx ? 'bg-[#d3f9d8]' : i === stepIdx ? 'bg-[#fff3bf]' : 'bg-white opacity-60'}`}>
                  <span>{i < stepIdx ? '✅' : i === stepIdx ? '👉' : '⬜'}</span>
                  {s.text}
                </li>
              ))}
            </ul>
            <div className="mt-2 text-sm font-bold">Récompense : {ch.reward.toLocaleString('fr-FR')} F</div>
            <button className="btn btn-green mt-3 w-full" onClick={() => setOpen(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/** In the shop: a big bouncing arrow over where the current goal is. */
export function StoryArrow() {
  const g = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const at = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    const step = useStory.getState().talking ? null : currentStep()
    const t = step?.target?.()
    const vis = !!t
    if (g.current) g.current.visible = vis
    if (ring.current) ring.current.visible = vis
    if (!t) return
    at.lerp(t, at.lengthSq() ? 0.2 : 1)
    const bob = Math.abs(Math.sin(clock.elapsedTime * 4)) * 0.35
    g.current!.position.set(at.x, 2.3 + bob, at.z)
    g.current!.rotation.y = clock.elapsedTime * 2
    ring.current!.position.set(at.x, 0.04, at.z)
    ring.current!.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.1)
  })
  return (
    <>
      <group ref={g}>
        <mesh rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.32, 0.6, 4]} />
          <meshStandardMaterial color="#ffd43b" emissive="#f59f00" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.18, 0.5, 0.18]} />
          <meshStandardMaterial color="#ffd43b" emissive="#f59f00" emissiveIntensity={0.5} />
        </mesh>
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.65, 0.8, 32]} />
        <meshBasicMaterial color="#ffd43b" transparent opacity={0.9} />
      </mesh>
    </>
  )
}
