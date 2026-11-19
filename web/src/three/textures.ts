import * as THREE from 'three'

// Every texture of the game is painted here on canvases, in code: no artist, nothing to download.

export const INK = '#2b1a12'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const cache = new Map<string, THREE.Texture>()
const once = (key: string, make: () => THREE.Texture) => {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key)!
}

/** A painted shop sign: text on a coloured board with a dark border. */
export function signTexture(text: string, bg: string, fg = '#fff', w = 512, h = 128) {
  return once(`sign:${text}:${bg}:${fg}:${w}x${h}`, () => {
    const [c, g] = canvas(w, h)
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.strokeStyle = INK
    g.lineWidth = 10
    g.strokeRect(5, 5, w - 10, h - 10)
    g.fillStyle = fg
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    let size = h * 0.55
    g.font = `800 ${size}px "Baloo 2", sans-serif`
    while (g.measureText(text).width > w * 0.88 && size > 10) g.font = `800 ${(size -= 2)}px "Baloo 2", sans-serif`
    g.lineWidth = size * 0.14
    g.strokeStyle = 'rgba(43,26,18,.55)'
    g.strokeText(text, w / 2, h / 2 + size * 0.06)
    g.fillText(text, w / 2, h / 2 + size * 0.06)
    return tex(c)
  })
}

/** A wax print (pagne): big circles and leaves in bold colours on a base colour. */
export function waxTexture(base: string) {
  return once(`wax:${base}`, () => {
    const [c, g] = canvas(256, 256)
    g.fillStyle = base
    g.fillRect(0, 0, 256, 256)
    const cols = ['#ffd43b', '#f76707', '#fff', '#2b1a12']
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 3; x++) {
        const cx = x * 85 + (y % 2) * 42 + 20
        const cy = y * 85 + 42
        ;[30, 22, 13, 6].forEach((r, i) => {
          g.fillStyle = cols[i]
          g.beginPath()
          g.arc(cx, cy, r, 0, Math.PI * 2)
          g.fill()
        })
        g.fillStyle = cols[1]
        g.beginPath()
        g.ellipse(cx + 42, cy - 40, 8, 18, 0.7, 0, Math.PI * 2)
        g.fill()
      }
    const t = tex(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(2, 2)
    return t
  })
}

/** Inside of a sliced tomato or onion, drawn on the round cut face. */
export function cutFaceTexture(kind: 'tomate' | 'oignon') {
  return once(`cut:${kind}`, () => {
    const [c, g] = canvas(128, 128)
    if (kind === 'tomate') {
      g.fillStyle = '#e03131'
      g.fillRect(0, 0, 128, 128)
      g.fillStyle = '#ff8787'
      g.beginPath()
      g.arc(64, 64, 50, 0, Math.PI * 2)
      g.fill()
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4
        g.fillStyle = '#ffa8a8'
        g.beginPath()
        g.ellipse(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26, 15, 11, a, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#ffe066'
        for (let k = 0; k < 4; k++) {
          g.beginPath()
          g.arc(64 + Math.cos(a) * (20 + k * 4) + (k % 2) * 4, 64 + Math.sin(a) * (20 + k * 4), 2.4, 0, Math.PI * 2)
          g.fill()
        }
      }
    } else {
      for (let r = 64; r > 0; r -= 9) {
        g.fillStyle = r === 64 ? '#b8743a' : (r / 9) % 2 < 1 ? '#fbf6e6' : '#eee3c4'
        g.beginPath()
        g.arc(64, 64, r, 0, Math.PI * 2)
        g.fill()
      }
    }
    return tex(c)
  })
}

/** Attiéké grains: a cream colour speckled with darker and lighter grains. */
export function attiekeTexture() {
  return once('attieke', () => {
    const [c, g] = canvas(128, 128)
    g.fillStyle = '#f3e3b5'
    g.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 900; i++) {
      g.fillStyle = Math.random() < 0.5 ? '#e4cd8f' : '#fff8e0'
      g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2)
    }
    const t = tex(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  })
}

/** Corrugated tin roof stripes. */
export function tinTexture() {
  return once('tin', () => {
    const [c, g] = canvas(64, 64)
    for (let x = 0; x < 64; x += 8) {
      g.fillStyle = '#adb5bd'
      g.fillRect(x, 0, 4, 64)
      g.fillStyle = '#868e96'
      g.fillRect(x + 4, 0, 4, 64)
    }
    const t = tex(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(8, 1)
    return t
  })
}

/** Red laterite ground with a few pebbles and darker patches. */
export function lateriteTexture() {
  return once('laterite', () => {
    const [c, g] = canvas(256, 256)
    g.fillStyle = '#c9642f'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 40; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(160,70,30,.35)' : 'rgba(230,140,80,.3)'
      g.beginPath()
      g.ellipse(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 30, 6 + Math.random() * 14, Math.random() * 3, 0, Math.PI * 2)
      g.fill()
    }
    for (let i = 0; i < 160; i++) {
      g.fillStyle = 'rgba(90,40,20,.5)'
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2)
    }
    const t = tex(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(6, 3)
    return t
  })
}

/** Fine bumpy noise, used as a bump map for crispy fried fish, attiéké grains, plaster and ground. */
export function bumpTexture() {
  return once('bump', () => {
    const [c, g] = canvas(256, 256)
    const img = g.createImageData(256, 256)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 110 + Math.random() * 120
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
    g.filter = 'blur(1px)'
    g.drawImage(c, 0, 0)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  })
}

/** Painted plaster wall: the colour with soft blotches, and darker dirt rising from the ground. */
export function wallTexture(base: string) {
  return once(`wall:${base}`, () => {
    const [c, g] = canvas(256, 256)
    g.fillStyle = base
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 60; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)'
      g.beginPath()
      g.ellipse(Math.random() * 256, Math.random() * 256, 10 + Math.random() * 40, 8 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2)
      g.fill()
    }
    const dirt = g.createLinearGradient(0, 256, 0, 170)
    dirt.addColorStop(0, 'rgba(110,50,20,.45)')
    dirt.addColorStop(1, 'rgba(110,50,20,0)')
    g.fillStyle = dirt
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 256
      const st = g.createLinearGradient(0, 0, 0, 120)
      st.addColorStop(0, 'rgba(60,40,30,.18)')
      st.addColorStop(1, 'rgba(60,40,30,0)')
      g.fillStyle = st
      g.fillRect(x, 0, 3 + Math.random() * 6, 60 + Math.random() * 60)
    }
    return tex(c)
  })
}
