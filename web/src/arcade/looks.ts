import * as THREE from 'three'

// The ten looks. Everything in the maquis that you improve changes how it looks, not only its numbers: the
// stoves (with their speed level), the counter, the terrace, the room, the front of the building, the clothes of
// your team and your own. The ten steps are the same for everything, so a maquis all at the same step looks right:
//   1 la récup · 2 les briques · 3 le bois peint · 4 l'émail · 5 l'inox · 6 aux couleurs du pays · 7 le wax ·
//   8 bois et cuivre · 9 noir et or · 10 le palace
// The textures are drawn once on canvases (no files to download) and shared.

export const STEPS = 10

export type Tier = {
  /** what it is called when you reach it */
  name: string
  /** the main colour, the second one, a trim, the top */
  body: string
  front: string
  trim: string
  top: string
  /** shiny metal, from 0 (wood, paint) to 1 (steel, gold) */
  metal: number
  rough: number
  /** a pattern on the big surfaces */
  pattern?: 'brick' | 'planks' | 'wax' | 'marble' | 'flag'
  /** the trim glows a little at night (the top steps) */
  glow?: boolean
}

export const TIERS: Tier[] = [
  { name: 'La récup', body: '#7a6a58', front: '#a5674a', trim: '#5c4a3a', top: '#3d3d3d', metal: 0.2, rough: 0.9 },
  { name: 'Les briques', body: '#b5532e', front: '#9c4221', trim: '#6b2e17', top: '#4a4a4a', metal: 0, rough: 0.9, pattern: 'brick' },
  { name: 'Le bois peint', body: '#3a86c8', front: '#f2c94c', trim: '#1c5d99', top: '#5a4632', metal: 0, rough: 0.7, pattern: 'planks' },
  { name: 'L’émail', body: '#e9ecef', front: '#e8432e', trim: '#868e96', top: '#495057', metal: 0, rough: 0.35 },
  { name: 'L’inox', body: '#e3e8ee', front: '#c3cbd3', trim: '#868e96', top: '#343a40', metal: 0.3, rough: 0.3 },
  { name: 'Aux couleurs du pays', body: '#ffffff', front: '#f77f00', trim: '#009e60', top: '#343a40', metal: 0.1, rough: 0.4, pattern: 'flag' },
  { name: 'Le wax', body: '#ffd166', front: '#e76f51', trim: '#264653', top: '#2b2d42', metal: 0, rough: 0.55, pattern: 'wax' },
  { name: 'Bois et cuivre', body: '#8b5a2b', front: '#6f4518', trim: '#d9844a', top: '#3b2a1a', metal: 0.2, rough: 0.45, pattern: 'planks' },
  { name: 'Noir et or', body: '#1f1f24', front: '#2b2b31', trim: '#e8b923', top: '#0f0f12', metal: 0.25, rough: 0.35, glow: true },
  { name: 'Le palace', body: '#f8f4ec', front: '#efe6d8', trim: '#e0b53a', top: '#d9d2c5', metal: 0.05, rough: 0.25, pattern: 'marble', glow: true },
]

/** The tier of a level 1..10 (out-of-range levels from old saves are clamped). */
export const tier = (level: number) => TIERS[Math.max(1, Math.min(STEPS, Math.round(level || 1))) - 1]

// ------------------------------------------------------------------ patterns
const cache = new Map<string, THREE.Texture>()
function painted(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat: [number, number] = [1, 1]) {
  const k = `${key}:${repeat}`
  let t = cache.get(k)
  if (t) return t
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  t.anisotropy = 4
  cache.set(k, t)
  return t
}

/** The pattern of a tier for a surface of the given colour (null: plain colour). */
export function patternTexture(t: Tier, base: string, repeat: [number, number] = [1, 1]): THREE.Texture | null {
  switch (t.pattern) {
    case 'brick':
      return painted(`brick:${base}`, 128, (g, s) => {
        g.fillStyle = '#e7d3bd'
        g.fillRect(0, 0, s, s)
        const h = s / 8
        for (let r = 0; r < 8; r++)
          for (let c = -1; c < 4; c++) {
            const x = c * (s / 4) + (r % 2 ? s / 8 : 0)
            g.fillStyle = new THREE.Color(base).offsetHSL(0, 0, (Math.sin(r * 7 + c * 3) * 0.06)).getStyle()
            g.fillRect(x + 2, r * h + 2, s / 4 - 4, h - 4)
          }
      }, repeat)
    case 'planks':
      return painted(`planks:${base}`, 128, (g, s) => {
        for (let i = 0; i < 6; i++) {
          g.fillStyle = new THREE.Color(base).offsetHSL(0, 0, i % 2 ? -0.03 : 0.02).getStyle()
          g.fillRect(0, (i * s) / 6, s, s / 6)
          g.fillStyle = 'rgba(0,0,0,.22)'
          g.fillRect(0, (i * s) / 6, s, 2)
        }
      }, repeat)
    case 'wax':
      return painted(`wax:${base}`, 128, (g, s) => {
        g.fillStyle = base
        g.fillRect(0, 0, s, s)
        const cols = ['#e76f51', '#264653', '#2a9d8f', '#f4a261']
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) {
            const cx = x * 32 + 16
            const cy = y * 32 + 16
            g.fillStyle = cols[(x + y) % 4]
            g.beginPath()
            g.arc(cx, cy, 12, 0, Math.PI * 2)
            g.fill()
            g.fillStyle = base
            g.beginPath()
            g.arc(cx, cy, 6, 0, Math.PI * 2)
            g.fill()
            g.fillStyle = cols[(x + y + 2) % 4]
            g.beginPath()
            g.arc(cx, cy, 3, 0, Math.PI * 2)
            g.fill()
          }
      }, repeat)
    case 'marble':
      return painted(`marble:${base}`, 256, (g, s) => {
        g.fillStyle = base
        g.fillRect(0, 0, s, s)
        g.strokeStyle = 'rgba(150,140,125,.35)'
        for (let i = 0; i < 9; i++) {
          g.lineWidth = 1 + (i % 3)
          g.beginPath()
          let x = (i * 53) % s
          let y = 0
          g.moveTo(x, y)
          while (y < s) {
            x += Math.sin(y * 0.05 + i) * 6
            y += 8
            g.lineTo(x, y)
          }
          g.stroke()
        }
      }, repeat)
    case 'flag':
      return painted(`flag`, 96, (g, s) => {
        ;['#f77f00', '#ffffff', '#009e60'].forEach((c, i) => {
          g.fillStyle = c
          g.fillRect((i * s) / 3, 0, s / 3, s)
        })
      }, repeat)
    default:
      return null
  }
}

/** A material of a tier: the colour, its pattern if the tier has one, its shine. Shared by every object. */
const mats = new Map<string, THREE.MeshStandardMaterial>()
export function tierMaterial(level: number, part: 'body' | 'front' | 'trim' | 'top', opts: { pattern?: boolean; repeat?: [number, number] } = {}) {
  const t = tier(level)
  const key = `${level}:${part}:${opts.pattern ?? false}:${opts.repeat ?? ''}`
  let m = mats.get(key)
  if (m) return m
  const map = opts.pattern ? patternTexture(t, t[part], opts.repeat) : null
  // (no reflected environment in this scene: real metal would look black, so it only shines a little)
  const metal = part === 'trim' && t.glow ? 0.45 : part === 'top' ? t.metal * 0.6 : t.metal
  m = new THREE.MeshStandardMaterial({
    color: map ? '#ffffff' : t[part],
    map,
    metalness: metal,
    roughness: part === 'trim' && t.glow ? 0.25 : t.rough,
    flatShading: false,
    emissive: part === 'trim' && t.glow ? new THREE.Color(t.trim) : new THREE.Color('#000000'),
    emissiveIntensity: part === 'trim' && t.glow ? 0.35 : 0,
  })
  mats.set(key, m)
  return m
}

/** The floor of the room at its style level: concrete, terracotta, wood, white tiles, grey tiles, the colours of
 *  the country, wax tiles, dark parquet, black and gold, marble. */
export function floorTexture(level: number) {
  const L = Math.max(1, Math.min(STEPS, level))
  const t = tier(L)
  return painted(`floor${L}`, 256, (g, s) => {
    const tiles = (n: number, a: string, b: string, grout: string, w = 3) => {
      const c = s / n
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          g.fillStyle = (x + y) % 2 ? a : b
          g.fillRect(x * c, y * c, c, c)
        }
      g.strokeStyle = grout
      g.lineWidth = w
      for (let i = 0; i <= n; i++) {
        g.beginPath()
        g.moveTo(i * c, 0)
        g.lineTo(i * c, s)
        g.moveTo(0, i * c)
        g.lineTo(s, i * c)
        g.stroke()
      }
    }
    const planks = (base: string) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = new THREE.Color(base).offsetHSL(0, 0, ((i * 37) % 7) / 100 - 0.03).getStyle()
        g.fillRect(0, (i * s) / 8, s, s / 8)
        g.fillStyle = 'rgba(0,0,0,.25)'
        g.fillRect(0, (i * s) / 8, s, 2)
        g.fillRect(((i * 97) % s), (i * s) / 8, 2, s / 8)
      }
    }
    switch (L) {
      case 1:
        g.fillStyle = '#b9b2a6'
        g.fillRect(0, 0, s, s)
        for (let i = 0; i < 1500; i++) {
          g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.1)'
          g.fillRect(Math.random() * s, Math.random() * s, 2, 2)
        }
        g.strokeStyle = 'rgba(60,50,40,.35)'
        g.lineWidth = 1.5
        g.beginPath()
        g.moveTo(20, 40)
        g.lineTo(90, 70)
        g.lineTo(120, 140)
        g.moveTo(180, 200)
        g.lineTo(230, 170)
        g.stroke()
        break
      case 2:
        tiles(4, '#c8693f', '#bb5d35', '#e6cfb3', 4)
        break
      case 3:
        planks('#d39a5c')
        break
      case 4:
        tiles(6, '#f8f9fa', '#f1f3f5', '#ced4da', 2)
        break
      case 5:
        tiles(3, '#adb5bd', '#b8c0c8', '#868e96', 2)
        break
      case 6:
        tiles(6, '#f77f00', '#ffffff', '#009e60', 3)
        break
      case 7: {
        tiles(4, '#ffd166', '#ffd166', '#264653', 3)
        const cols = ['#e76f51', '#2a9d8f']
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) {
            g.fillStyle = cols[(x + y) % 2]
            g.beginPath()
            g.arc(x * 64 + 32, y * 64 + 32, 18, 0, Math.PI * 2)
            g.fill()
            g.fillStyle = '#ffd166'
            g.beginPath()
            g.arc(x * 64 + 32, y * 64 + 32, 8, 0, Math.PI * 2)
            g.fill()
          }
        break
      }
      case 8:
        planks('#6f4518')
        break
      case 9:
        tiles(4, '#1f1f24', '#26262c', '#e8b923', 3)
        break
      default: {
        g.fillStyle = t.body
        g.fillRect(0, 0, s, s)
        g.drawImage((patternTexture(t, t.body)!.image as HTMLCanvasElement), 0, 0, s, s)
        g.strokeStyle = '#e0b53a'
        g.lineWidth = 3
        g.strokeRect(0, 0, s, s)
      }
    }
  }, [5, 3.5])
}

/** The colours of the front of the building at its style level (level 1: the colours of the place itself). */
export function facadeColours(level: number, own: { wall: string; awning: [string, string] }) {
  if (level <= 1) return own
  const t = tier(level)
  const awning: [string, string] = level === 6 ? [t.front, t.trim] : level >= 9 ? [t.trim, t.body] : [t.front, t.body === t.front ? t.trim : t.body]
  return { wall: t.body, awning }
}
