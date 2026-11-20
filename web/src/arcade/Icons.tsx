// The game's own icons (no emojis): chunky filled shapes with a dark outline, in the game's colours. Each is a
// list of SVG paths with their fill; the same data draws them in the HUD (<Icon>) and on the 3D pads (canvas).

type Part = { d: string; fill: string }
const INK = '#2b1a12'

export const ICONS = {
  map: [
    { d: 'M3 6l5-2 8 2 5-2v14l-5 2-8-2-5 2z', fill: '#ffe8a3' },
    { d: 'M8 4v14M16 6v14', fill: 'none' },
    { d: 'M11 10a2 2 0 1 0 4 0c0 2-2 4-2 4s-2-2-2-4z', fill: '#e8432e' },
  ],
  city: [
    { d: 'M3 21V9l5-3v15z', fill: '#74c0fc' },
    { d: 'M8 21V4h7v17z', fill: '#ffd43b' },
    { d: 'M15 21v-9h6v9z', fill: '#ff8787' },
    { d: 'M10 7h3M10 10h3M10 13h3M17 15h2M5 12h1M5 15h1', fill: 'none' },
  ],
  tools: [
    { d: 'M14.5 3.5a4 4 0 0 0-4.6 5.4L3.5 15.3a1.8 1.8 0 0 0 2.6 2.6l6.4-6.4a4 4 0 0 0 5.4-4.6l-2.3 2.3-2.4-.6-.6-2.4z', fill: '#ced4da' },
    { d: 'M13 14l5 5a1.6 1.6 0 0 0 2.3-2.3l-5-5z', fill: '#ff922b' },
  ],
  target: [
    { d: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', fill: '#ffffff' },
    { d: 'M12 6.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z', fill: '#e8432e' },
    { d: 'M12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z', fill: '#ffffff' },
  ],
  globe: [
    { d: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', fill: '#74c0fc' },
    { d: 'M6 7c3 1 3 4 6 4s2 4 4 5M14 3.5c-1 2 0 3 2 3s2.5 1.5 4 2', fill: 'none' },
    { d: 'M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18', fill: 'none' },
  ],
  soundOn: [
    { d: 'M4 9h4l5-4v14l-5-4H4z', fill: '#ffd43b' },
    { d: 'M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11', fill: 'none' },
  ],
  soundOff: [
    { d: 'M4 9h4l5-4v14l-5-4H4z', fill: '#ced4da' },
    { d: 'M16 9l5 6M21 9l-5 6', fill: 'none' },
  ],
  gem: [
    { d: 'M7 4h10l4 5-9 11L3 9z', fill: '#74c0fc' },
    { d: 'M3 9h18M9 4l-2 5 5 11 5-11-2-5', fill: 'none' },
  ],
  crown: [
    { d: 'M3 8l4 3 5-6 5 6 4-3-2 11H5z', fill: '#ffd43b' },
    { d: 'M5 19h14', fill: 'none' },
  ],
  bill: [
    { d: 'M2 6h20v12H2z', fill: '#69db3c' },
    { d: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z', fill: '#f2e86d' },
    { d: 'M5 9v6M19 9v6', fill: 'none' },
  ],
  sun: [
    { d: 'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z', fill: '#ffd43b' },
    { d: 'M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8', fill: 'none' },
  ],
  moon: [{ d: 'M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5z', fill: '#ffe066' }],
  megaphone: [
    { d: 'M3 10v4h3l9 5V5L6 10z', fill: '#ff922b' },
    { d: 'M6 14l1.5 5h2.5l-1-5', fill: '#ff922b' },
    { d: 'M18 9.5a3 3 0 0 1 0 5', fill: 'none' },
  ],
  boss: [
    { d: 'M12 3a8 8 0 1 1 0 16 8 8 0 0 1 0-16z', fill: '#c68642' },
    { d: 'M5.5 9.5h13l-1 3h-4l-1.5-1.5-1.5 1.5h-4z', fill: INK },
    { d: 'M9 15.5c2 1 4 1 6 0', fill: 'none' },
  ],
  stool: [
    { d: 'M5 8h14l-1 3H6z', fill: '#ff922b' },
    { d: 'M7 11l-2 9M17 11l2 9M8 16h8', fill: 'none' },
  ],
  house: [
    { d: 'M3 11l9-7 9 7v10H3z', fill: '#ffd43b' },
    { d: 'M2 11l10-8 10 8', fill: '#e8432e' },
    { d: 'M10 21v-6h4v6z', fill: '#a0612a' },
  ],
  cloche: [
    { d: 'M4 17a8 8 0 0 1 16 0z', fill: '#dee2e6' },
    { d: 'M2 17h20v2H2z', fill: '#adb5bd' },
    { d: 'M11 7h2v2h-2z', fill: '#adb5bd' },
  ],
  plate: [
    { d: 'M12 6a8 6 0 1 1 0 12 8 6 0 0 1 0-12z', fill: '#ffffff' },
    { d: 'M12 8.5a4.5 3.5 0 1 1 0 7 4.5 3.5 0 0 1 0-7z', fill: '#ffd8a8' },
  ],
  fire: [
    { d: 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 2-7 2 2 2 3 2 4 0-3 1-6 2-9z', fill: '#ff922b' },
    { d: 'M12 12c1 2 3 3 3 5a3 3 0 0 1-6 0c0-2 2-3 3-5z', fill: '#ffd43b' },
  ],
  bolt: [{ d: 'M13 2L4 14h7l-1 8 9-12h-7z', fill: '#ffd43b' }],
  basket: [
    { d: 'M3 10h18l-2 10H5z', fill: '#c08552' },
    { d: 'M7 10l3-6M17 10l-3-6M8 13v4M12 13v4M16 13v4', fill: 'none' },
  ],
  person: [
    { d: 'M12 3a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z', fill: '#c68642' },
    { d: 'M5 21c0-5 3-8 7-8s7 3 7 8z', fill: '#4dabf7' },
  ],
  register: [
    { d: 'M4 11h16v9H4z', fill: '#ff922b' },
    { d: 'M7 5h8v6H7z', fill: '#343a40' },
    { d: 'M9 7h4M7 14h2M11 14h2M15 14h2M7 17h10', fill: 'none' },
  ],
  moto: [
    { d: 'M6 13a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM18 13a3 3 0 1 1 0 6 3 3 0 0 1 0-6z', fill: '#343a40' },
    { d: 'M6 16l4-6h5l3 6M14 10l1-3h3', fill: 'none' },
    { d: 'M9 12h6l-2 3h-3z', fill: '#e8432e' },
  ],
  box: [
    { d: 'M3 8l9-4 9 4v10l-9 4-9-4z', fill: '#c08552' },
    { d: 'M3 8l9 4 9-4M12 12v10', fill: 'none' },
  ],
  up: [{ d: 'M12 3l8 9h-5v9H9v-9H4z', fill: '#69db3c' }],
  lock: [
    { d: 'M5 11h14v10H5z', fill: '#ffd43b' },
    { d: 'M8 11V8a4 4 0 0 1 8 0v3', fill: 'none' },
  ],
  tea: [
    { d: 'M6 8h10l-1.5 12h-7z', fill: '#ffe8cc' },
    { d: 'M7 11h8l-1 8H8z', fill: '#e67700' },
    { d: 'M9 3c0 2 2 2 2 4M13 3c0 2 2 2 2 4', fill: 'none' },
  ],
  meat: [
    { d: 'M4 14a6 6 0 0 1 10-6l4 4a6 6 0 0 1-6 9H8a4 4 0 0 1-4-4z', fill: '#a0522d' },
    { d: 'M7 12l6 6M9 10l6 6', fill: 'none' },
    { d: 'M17 5l3-1-1 3', fill: '#f8f0e3' },
  ],
  bottle: [
    { d: 'M10 2h4v4l2 3v12H8V9l2-3z', fill: '#c2255c' },
    { d: 'M8 12h8v5H8z', fill: '#ffd43b' },
  ],
  door: [
    { d: 'M5 21V4h11v17z', fill: '#a0612a' },
    { d: 'M16 6l3 1v14l-3-1', fill: '#ffd43b' },
    { d: 'M13 12h.01', fill: 'none' },
    { d: 'M3 21h18', fill: 'none' },
  ],
  phone: [
    { d: 'M7 2h10v20H7z', fill: '#343a40' },
    { d: 'M9 5h6v12H9z', fill: '#74c0fc' },
  ],
} satisfies Record<string, Part[]>
export type IconName = keyof typeof ICONS

/** An icon in the HUD. */
export function Icon({ name, size = 24, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      {(ICONS[name] as Part[]).map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} stroke={INK} strokeWidth={p.fill === 'none' ? 1.6 : 1.4} strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  )
}

/** The same icon drawn on a canvas (the 3D pads): centred at (x, y), `size` pixels. */
export function drawIcon(g: CanvasRenderingContext2D, name: IconName, x: number, y: number, size: number) {
  g.save()
  g.translate(x - size / 2, y - size / 2)
  g.scale(size / 24, size / 24)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.strokeStyle = INK
  for (const p of ICONS[name] as Part[]) {
    const path = new Path2D(p.d)
    if (p.fill !== 'none') {
      g.fillStyle = p.fill
      g.fill(path)
    }
    g.lineWidth = p.fill === 'none' ? 1.6 : 1.4
    g.stroke(path)
  }
  g.restore()
}
