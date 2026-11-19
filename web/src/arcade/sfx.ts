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
  const wake = () => audio()
  window.addEventListener('pointerdown', wake, { once: true })
  window.addEventListener('keydown', wake, { once: true })
}

export const setMuted = (m: boolean) => (muted = m)
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
