// Little sounds made on the fly with the Web Audio API (no sound files to download):
// pick up, drop, cash, unlock fanfare. Browsers only allow sound after the first tap,
// so the audio starts on the first touch / key press.

let ctx: AudioContext | null = null
let muted = false
const last: Record<string, number> = {}

function audio() {
  if (!ctx) {
    try {
      ctx = new AudioContext()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}
if (typeof window !== 'undefined') {
  const wake = () => {
    audio()
    startMusic()
  }
  window.addEventListener('pointerdown', wake, { once: true })
  window.addEventListener('keydown', wake, { once: true })
}

export const setMuted = (m: boolean) => {
  muted = m
  if (m) stopMusic()
  else startMusic()
}
export const isMuted = () => muted

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, slide = 0, at = 0) {
  const a = audio()
  if (!a || muted) return
  const t = a.currentTime + at
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** A burst of noise (a knife on the board, oil sizzling), filtered. */
function noise(dur: number, freq: number, vol = 0.15, q = 1) {
  const a = audio()
  if (!a || muted) return
  const n = Math.floor(a.sampleRate * dur)
  const b = a.createBuffer(1, n, a.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2
  const src = a.createBufferSource()
  src.buffer = b
  const f = a.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = q
  const g = a.createGain()
  g.gain.value = vol
  src.connect(f).connect(g).connect(a.destination)
  src.start()
}

/** Don't play the same sound more often than every `gap` seconds (plates move very fast). */
function throttle(name: string, gap: number) {
  const now = performance.now() / 1000
  if (now - (last[name] ?? 0) < gap) return false
  last[name] = now
  return true
}

export const sfx = {
  pick: () => throttle('pick', 0.06) && tone(660 + Math.random() * 120, 0.08, 'triangle', 0.12, 1.4),
  drop: () => throttle('drop', 0.06) && tone(420 + Math.random() * 60, 0.09, 'triangle', 0.12, 0.8),
  cash: () => {
    if (!throttle('cash', 0.12)) return
    tone(1320, 0.08, 'square', 0.05)
    tone(1760, 0.18, 'square', 0.05, 0, 0.06)
    if (navigator.vibrate) navigator.vibrate(12)
  },
  pay: () => throttle('pay', 0.1) && tone(990, 0.12, 'sine', 0.1, 1.2),
  chop: () => {
    noise(0.09, 2400, 0.35, 0.8)
    tone(180, 0.06, 'square', 0.05, 0.6)
  },
  sizzle: () => throttle('sizzle', 0.25) && noise(0.35, 5200, 0.06, 0.5),
  wrong: () => tone(160, 0.22, 'sawtooth', 0.08, 0.7),
  good: () => {
    tone(784, 0.1, 'triangle', 0.12)
    tone(1175, 0.16, 'triangle', 0.12, 0, 0.07)
  },
  star: (k: number) => tone(880 + k * 220, 0.25, 'triangle', 0.14, 1.5),
  unlock: () => {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, 0, i * 0.09))
    if (navigator.vibrate) navigator.vibrate([20, 40, 20])
  },
}

// ------------------------------------------------------------------ the maquis music
// An original groove in the spirit of the maquis sound (coupé-décalé / highlife), played live with the Web Audio
// API: a kick that skips, the clap, the shaker, a bouncing bass and a bright soukous-style guitar picking the
// chords. Nothing to download; it stops with the sound button and when the phone leaves the game.

const BPM = 122
const STEP = 60 / BPM / 4 // a sixteenth
// the chords, one per bar (I - IV - I - V, then I - vi - IV - V), as semitones from the root, G major
const ROOT = 43 // G2 (midi)
const PROG = [
  [0, 4, 7],
  [5, 9, 12],
  [0, 4, 7],
  [7, 11, 14],
  [0, 4, 7],
  [9, 12, 16],
  [5, 9, 12],
  [7, 11, 14],
]
const KICK = [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0]
const CLAP = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1]
const BASS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0]
const BASS_NOTE = [0, 0, 0, 12, 0, 0, 7, 0, 0, 0, 0, 12, 0, 0, 7, 0]
// the guitar: a running line over the chord (index into the chord, octave up), rests marked -1
const GUIT = [0, 1, 2, 1, 0, 2, 1, 2, -1, 1, 2, 3, 2, 1, 2, -1]
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

let musicOn = false
/** the music alone can be switched off (the sounds and the voices stay); remembered on the phone */
let musicMuted = (() => {
  try {
    return localStorage.getItem('babiland-music') === 'off'
  } catch {
    return false
  }
})()
export const isMusicMuted = () => musicMuted
export function setMusicMuted(m: boolean) {
  musicMuted = m
  try {
    localStorage.setItem('babiland-music', m ? 'off' : 'on')
  } catch {
    /* private mode */
  }
  if (m) stopMusic()
  else startMusic()
}
let musicGain: GainNode | null = null
let timer: ReturnType<typeof setInterval> | null = null
let nextAt = 0
let step = 0
let noiseBuf: AudioBuffer | null = null

function music(a: AudioContext) {
  if (!musicGain) {
    musicGain = a.createGain()
    musicGain.gain.value = 0.32
    musicGain.connect(a.destination)
  }
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 0.3, a.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return musicGain
}

function hit(a: AudioContext, out: AudioNode, t: number, freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, filter = 0) {
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node: AudioNode = o
  if (filter) {
    const f = a.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = filter
    o.connect(f)
    node = f
  }
  node.connect(g).connect(out)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function shake(a: AudioContext, out: AudioNode, t: number, vol: number, freq: number, dur: number) {
  const src = a.createBufferSource()
  src.buffer = noiseBuf
  const f = a.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = 0.9
  const g = a.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(out)
  src.start(t)
  src.stop(t + dur + 0.02)
}

function playStep(a: AudioContext, out: AudioNode, t: number, k: number) {
  const s = k % 16
  const bar = Math.floor(k / 16) % PROG.length
  const chord = PROG[bar]
  // the drums
  if (KICK[s]) hit(a, out, t, 120, 0.22, 'sine', 0.9, 0.35)
  if (CLAP[s]) shake(a, out, t, 0.35, 1600, 0.12)
  shake(a, out, t, s % 2 ? 0.07 : 0.035, 8000, 0.04)
  // the bass
  if (BASS[s]) hit(a, out, t, midi(ROOT + chord[0] + BASS_NOTE[s]), STEP * 2.2, 'triangle', 0.5, 0, 900)
  // the guitar, a little behind the beat at bar ends to breathe
  const g = GUIT[s]
  if (g >= 0) {
    const note = ROOT + 24 + chord[g % 3] + (g >= 3 ? 12 : 0)
    hit(a, out, t, midi(note), STEP * 1.6, 'square', 0.06, 0, 2600)
    hit(a, out, t, midi(note + 12), STEP * 1.2, 'triangle', 0.035)
  }
  // a soft organ chord on the first beat of every second bar
  if (s === 0 && bar % 2 === 0) chord.forEach((c) => hit(a, out, t, midi(ROOT + 12 + c), STEP * 7, 'sine', 0.05))
}

export function startMusic() {
  if (musicOn || muted || musicMuted) return
  const a = audio()
  if (!a) return
  musicOn = true
  const out = music(a)
  out.gain.cancelScheduledValues(a.currentTime)
  out.gain.setValueAtTime(0.0001, a.currentTime)
  out.gain.exponentialRampToValueAtTime(0.32, a.currentTime + 1.5)
  nextAt = a.currentTime + 0.1
  timer = setInterval(() => {
    // schedule a little ahead (the timer is not precise, the audio clock is)
    while (nextAt < a.currentTime + 0.15) {
      playStep(a, out, nextAt, step)
      // a light swing on the off sixteenths
      nextAt += STEP * (step % 2 ? 0.92 : 1.08)
      step++
    }
  }, 30)
}

export function stopMusic() {
  musicOn = false
  if (timer) clearInterval(timer)
  timer = null
}

if (typeof document !== 'undefined') {
  // the phone leaves the game: silence; it comes back: the music again
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopMusic()
      void ctx?.suspend()
    } else if (ctx) {
      void ctx.resume()
      startMusic()
    }
  })
}

// ------------------------------------------------------------------ the voices (nouchi, recorded)
// Short lines said by the customers, the VIP and the people of the street (public/assets/voices). Never two at
// the same time, and not too often, or the maquis would sound like a market.

export type VoiceLine = 'salut' | 'doux' | 'lent' | 'part' | 'suis' | 'parfait' | 'bof' | 'vip' | 'cadeau' | 'grand'
/** the recordings: m = a man's voice, f = a woman's */
const FILES: Record<VoiceLine, { m?: string; f?: string }> = {
  salut: { m: 'salut', f: 'salut-f' },
  doux: { m: 'doux', f: 'doux-f' },
  lent: { m: 'lent' },
  part: { f: 'part-f' },
  suis: { m: 'suis' },
  parfait: { f: 'parfait-f' },
  bof: { m: 'bof' },
  vip: { m: 'vip' },
  cadeau: { m: 'cadeau' },
  grand: { f: 'grand-f' },
}
const bufs = new Map<string, AudioBuffer | 'loading'>()
let talkingUntil = 0
let lastLine = 0

function load(a: AudioContext, name: string) {
  if (bufs.has(name)) return
  bufs.set(name, 'loading')
  fetch(`${import.meta.env.BASE_URL}assets/voices/${name}.mp3`)
    .then((r) => r.arrayBuffer())
    .then((b) => a.decodeAudioData(b))
    .then((b) => bufs.set(name, b))
    .catch(() => bufs.delete(name))
}

/**
 * Say a line. `woman`: the speaker is a woman (the man's recording is used if there is no woman's, and the other
 * way round). `chance`: said only that often (0..1). `important`: said even if someone spoke a moment ago.
 */
export function say(line: VoiceLine, opts: { woman?: boolean; chance?: number; important?: boolean } = {}) {
  const a = audio()
  if (!a || muted) return
  if (opts.chance !== undefined && Math.random() > opts.chance) return
  const now = a.currentTime
  if (now < talkingUntil) return
  if (!opts.important && now - lastLine < 6) return
  const f = FILES[line]
  // a man never speaks with a woman's voice (and the other way round): no recording for them, nothing said
  const name = opts.woman === undefined ? (f.m ?? f.f)! : opts.woman ? f.f : f.m
  if (!name) return
  const b = bufs.get(name)
  if (!b || b === 'loading') {
    // the first time: load it for the next time (and load the others in the background)
    load(a, name)
    return
  }
  const src = a.createBufferSource()
  src.buffer = b
  const g = a.createGain()
  g.gain.value = 1.1
  src.connect(g).connect(a.destination)
  // the music steps back while someone talks
  if (musicGain) {
    musicGain.gain.cancelScheduledValues(now)
    musicGain.gain.setValueAtTime(musicGain.gain.value, now)
    musicGain.gain.linearRampToValueAtTime(0.14, now + 0.15)
    musicGain.gain.linearRampToValueAtTime(0.32, now + b.duration + 0.4)
  }
  src.start()
  talkingUntil = now + b.duration + 0.3
  lastLine = now
}

/** load all the lines (after the first tap), so they are ready when needed */
export function preloadVoices() {
  const a = audio()
  if (!a) return
  for (const f of Object.values(FILES)) for (const n of [f.m, f.f]) if (n) load(a, n)
}
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => preloadVoices(), { once: true })
