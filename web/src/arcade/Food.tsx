import { useId, type ReactNode } from 'react'
import { Icon, type IconName } from './Icons'

// The ingredients of the VIP's kitchen, drawn properly (not the little HUD icons): round, glossy, with a light
// from the top left and a soft shadow, like a cooking game. Each has its whole look and, for the ones you cut,
// its inside (`section`): the rings of the onion, the seeds of the tomato…

type Draw = (id: string) => ReactNode

/** a soft round gradient, lit from the top left */
const ball = (id: string, light: string, mid: string, dark: string) => (
  <radialGradient id={id} cx="35%" cy="30%" r="75%">
    <stop offset="0" stopColor={light} />
    <stop offset=".55" stopColor={mid} />
    <stop offset="1" stopColor={dark} />
  </radialGradient>
)
const shine = (cx: number, cy: number, rx = 9, ry = 5, rot = -30) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" opacity=".55" transform={`rotate(${rot} ${cx} ${cy})`} />
const shadow = <ellipse cx="50" cy="92" rx="30" ry="5" fill="#000" opacity=".18" />

const WHOLE: Partial<Record<IconName, Draw>> = {
  tomato: (id) => (
    <>
      <defs>{ball(id, '#ff8a80', '#e53935', '#8e1b16')}</defs>
      {shadow}
      <path d="M50 22c22 0 36 14 36 34S72 90 50 90 14 76 14 56s14-34 36-34z" fill={`url(#${id})`} />
      <path d="M50 26l5 9 10-3-6 9 9 6-11 1-2 9-5-8-5 8-2-9-11-1 9-6-6-9 10 3z" fill="#2e7d32" />
      <path d="M50 26v-8" stroke="#33691e" strokeWidth="3" strokeLinecap="round" />
      {shine(32, 45, 8, 5)}
    </>
  ),
  onion: (id) => (
    <>
      <defs>{ball(id, '#f3c9a0', '#c97d3c', '#7a3d12')}</defs>
      {shadow}
      <path d="M50 14c4 10 30 22 30 48 0 18-14 28-30 28S20 80 20 62c0-26 26-38 30-48z" fill={`url(#${id})`} />
      <path d="M50 18c-2 20-14 30-14 46M50 18c2 20 14 30 14 46M50 18v70" stroke="#7a3d12" strokeWidth="1.6" fill="none" opacity=".45" />
      <path d="M50 14l-3-8M50 14l3-8" stroke="#8d6e63" strokeWidth="2" strokeLinecap="round" />
      {shine(36, 50, 6, 10, 20)}
    </>
  ),
  chili: (id) => (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7043" />
          <stop offset=".5" stopColor="#e53935" />
          <stop offset="1" stopColor="#9a1a12" />
        </linearGradient>
      </defs>
      {shadow}
      <path d="M22 30c10-6 20 2 30 14s24 30 34 40c-16 2-36-6-48-20S14 36 22 30z" fill={`url(#${id})`} />
      <path d="M22 30c-4-6-2-14 6-18" stroke="#2e7d32" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M30 40c8 8 18 22 30 30" stroke="#fff" strokeWidth="3" opacity=".45" strokeLinecap="round" fill="none" />
    </>
  ),
  pepper: (id) => (
    <>
      <defs>{ball(id, '#a5d66f', '#43a047', '#1b5e20')}</defs>
      {shadow}
      <path d="M50 26c18-6 34 6 32 28-2 20-10 34-32 34S20 74 18 54c-2-22 14-34 32-28z" fill={`url(#${id})`} />
      <path d="M38 30c4 20 4 40 0 56M62 30c-4 20-4 40 0 56" stroke="#1b5e20" strokeWidth="2" opacity=".35" fill="none" />
      <path d="M50 26v-10" stroke="#33691e" strokeWidth="5" strokeLinecap="round" />
      {shine(34, 44, 6, 9, 15)}
    </>
  ),
  aubergine: (id) => (
    <>
      <defs>{ball(id, '#b39ddb', '#6a1b9a', '#2a0a3a')}</defs>
      {shadow}
      <path d="M44 26c18-4 38 22 40 42 2 16-10 24-24 22-20-2-36-24-38-44-1-12 10-18 22-20z" fill={`url(#${id})`} />
      <path d="M28 30c6-10 18-12 24-6l-6 6 6 6-12-2-6 8z" fill="#2e7d32" />
      <path d="M30 26l-8-10" stroke="#33691e" strokeWidth="4" strokeLinecap="round" />
      {shine(46, 42, 10, 5, 35)}
    </>
  ),
  plantain: (id) => (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff176" />
          <stop offset=".6" stopColor="#fbc02d" />
          <stop offset="1" stopColor="#c17900" />
        </linearGradient>
      </defs>
      {shadow}
      <path d="M12 40c10 26 40 42 76 30l-2-8C56 70 30 56 22 34z" fill={`url(#${id})`} stroke="#8d5a00" strokeWidth="1.5" />
      <path d="M12 40l-4-6 10-2zM88 70l6 2-4-10z" fill="#4e342e" />
      <path d="M24 46c14 16 36 24 58 20" stroke="#fff" strokeWidth="3" opacity=".5" fill="none" strokeLinecap="round" />
    </>
  ),
  leaves: (id) => (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9ccc65" />
          <stop offset="1" stopColor="#2e7d32" />
        </linearGradient>
      </defs>
      {shadow}
      <path d="M50 86C28 74 16 50 30 22c12 18 24 34 20 64z" fill={`url(#${id})`} />
      <path d="M52 86c22-12 34-36 20-64C60 40 48 56 52 86z" fill={`url(#${id})`} />
      <path d="M50 86c-4-24-30-40-40-34 6 18 22 32 40 34z" fill="#558b2f" />
      <path d="M50 86L31 26M52 86l19-60" stroke="#1b5e20" strokeWidth="1.5" opacity=".6" />
    </>
  ),
  fish: (id) => (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfd8dc" />
          <stop offset=".45" stopColor="#90a4ae" />
          <stop offset="1" stopColor="#546e7a" />
        </linearGradient>
      </defs>
      {shadow}
      <path d="M8 52c14-20 40-26 62-14l18-12-4 26 4 26-18-12C48 78 22 72 8 52z" fill={`url(#${id})`} />
      <path d="M40 40c4 8 4 18 0 26M50 38c4 9 4 21 0 30M60 40c3 8 3 18 0 26" stroke="#455a64" strokeWidth="1.4" fill="none" opacity=".5" />
      <path d="M44 38c6-10 16-12 22-6" fill="#78909c" />
      <circle cx="22" cy="49" r="4" fill="#fff" />
      <circle cx="22" cy="49" r="2.2" fill="#212121" />
      {shine(40, 44, 12, 3, -10)}
    </>
  ),
  meat: (id) => (
    <>
      <defs>{ball(id, '#ef9a9a', '#c62828', '#6d1010')}</defs>
      {shadow}
      <path d="M18 44c4-16 26-22 44-18 18 4 26 18 22 32-4 16-24 26-44 22S14 60 18 44z" fill={`url(#${id})`} />
      <path d="M26 46c10-6 24-6 36 2M30 62c12 4 26 2 36-6" stroke="#ffe0e0" strokeWidth="3" fill="none" opacity=".7" strokeLinecap="round" />
      {shine(34, 38, 8, 4)}
    </>
  ),
  chicken: (id) => (
    <>
      <defs>{ball(id, '#ffe082', '#f9a825', '#a15c00')}</defs>
      {shadow}
      <path d="M30 30c16-14 42-8 46 12 4 18-12 32-28 30L30 84c-4 4-12-2-8-8l14-14c-12-8-14-24-6-32z" fill={`url(#${id})`} />
      <circle cx="24" cy="84" r="6" fill="#fffde7" stroke="#bcaaa4" strokeWidth="1.5" />
      <circle cx="18" cy="78" r="5" fill="#fffde7" stroke="#bcaaa4" strokeWidth="1.5" />
      {shine(46, 34, 10, 5)}
    </>
  ),
  egg: () => (
    <>
      {shadow}
      <path d="M50 18c18 0 34 10 34 30 0 22-20 36-36 36-18 0-34-12-34-30 0-20 18-36 36-36z" fill="#fffdf6" stroke="#eee5d0" strokeWidth="2" />
      <circle cx="50" cy="50" r="15" fill="#ffb300" />
      <circle cx="50" cy="50" r="15" fill="none" stroke="#e08a00" strokeWidth="2" />
      {shine(45, 45, 5, 3)}
    </>
  ),
  rice: () => (
    <>
      {shadow}
      <path d="M14 56h72c0 16-16 30-36 30S14 72 14 56z" fill="#e0a96d" stroke="#8d5a2b" strokeWidth="2" />
      <path d="M18 56c2-18 16-30 32-30s30 12 32 30z" fill="#fffaf0" />
      {Array.from({ length: 26 }, (_, i) => (
        <ellipse key={i} cx={24 + ((i * 37) % 52)} cy={34 + ((i * 23) % 20)} rx="1.8" ry="1" fill="#d7ccc8" transform={`rotate(${i * 40} ${24 + ((i * 37) % 52)} ${34 + ((i * 23) % 20)})`} />
      ))}
    </>
  ),
  salad: () => (
    <>
      {shadow}
      <path d="M16 54h68c0 18-16 30-34 30S16 72 16 54z" fill="#fafafa" stroke="#bdbdbd" strokeWidth="2" />
      <path d="M20 54c0-14 10-22 18-20 4-8 18-8 22 0 10-2 20 8 20 20z" fill="#7cb342" />
      <circle cx="40" cy="44" r="7" fill="#e53935" />
      <circle cx="40" cy="44" r="4" fill="#ffab91" />
      <circle cx="60" cy="46" r="7" fill="none" stroke="#ce93d8" strokeWidth="3" />
    </>
  ),
  stew: () => (
    <>
      {shadow}
      <path d="M12 50h76c0 20-18 34-38 34S12 70 12 50z" fill="#5d4037" />
      <ellipse cx="50" cy="50" rx="38" ry="10" fill="#bf360c" />
      <ellipse cx="50" cy="49" rx="30" ry="6" fill="#e64a19" />
      <circle cx="40" cy="48" r="3" fill="#ffcc80" />
      <circle cx="58" cy="50" r="2.5" fill="#ffcc80" />
      <path d="M40 34c-4-6 4-8 0-14M56 34c-4-6 4-8 0-14" stroke="#fff" strokeWidth="2.5" opacity=".5" fill="none" strokeLinecap="round" />
    </>
  ),
  mound: (id) => (
    <>
      <defs>{ball(id, '#fffde7', '#f3e5ab', '#c9b27a')}</defs>
      {shadow}
      <ellipse cx="50" cy="60" rx="32" ry="26" fill={`url(#${id})`} />
      {shine(38, 48, 9, 5)}
    </>
  ),
  bowl: () => (
    <>
      {shadow}
      <path d="M12 50h76c0 20-18 34-38 34S12 70 12 50z" fill="#8d6e63" />
      <ellipse cx="50" cy="50" rx="38" ry="10" fill="#efe6cf" />
      <ellipse cx="44" cy="48" rx="10" ry="3" fill="#fff" opacity=".6" />
    </>
  ),
}

/** the inside of what you cut: rings, seeds, flesh */
const SECTION: Partial<Record<IconName, Draw>> = {
  tomato: () => (
    <>
      <circle cx="50" cy="50" r="40" fill="#e53935" />
      <circle cx="50" cy="50" r="34" fill="#ff8a65" />
      {[0, 1, 2, 3].map((k) => {
        const a = (k / 4) * Math.PI * 2 + 0.4
        return <ellipse key={k} cx={50 + Math.cos(a) * 17} cy={50 + Math.sin(a) * 17} rx="10" ry="7" fill="#ffcc80" transform={`rotate(${(a * 180) / Math.PI} ${50 + Math.cos(a) * 17} ${50 + Math.sin(a) * 17})`} />
      })}
      <circle cx="50" cy="50" r="7" fill="#ffab91" />
    </>
  ),
  onion: () => (
    <>
      {[40, 32, 24, 16, 8].map((r, i) => (
        <circle key={r} cx="50" cy="50" r={r} fill={i % 2 ? '#fff8f0' : '#f3e0ef'} stroke="#d8b4cf" strokeWidth="2" />
      ))}
    </>
  ),
  chili: () => (
    <>
      <circle cx="50" cy="50" r="38" fill="#e53935" />
      <circle cx="50" cy="50" r="30" fill="#ff8a80" />
      {Array.from({ length: 8 }, (_, k) => (
        <circle key={k} cx={50 + Math.cos(k) * 12} cy={50 + Math.sin(k) * 12} r="4" fill="#fff8e1" />
      ))}
    </>
  ),
  pepper: () => (
    <>
      <circle cx="50" cy="50" r="38" fill="#43a047" />
      <circle cx="50" cy="50" r="32" fill="#c5e1a5" />
      <circle cx="50" cy="50" r="10" fill="#fffde7" />
    </>
  ),
  aubergine: () => (
    <>
      <circle cx="50" cy="50" r="38" fill="#4a148c" />
      <circle cx="50" cy="50" r="34" fill="#f5f0dc" />
      {Array.from({ length: 12 }, (_, k) => (
        <circle key={k} cx={50 + Math.cos(k * 0.52) * 18} cy={50 + Math.sin(k * 0.52) * 18} r="2" fill="#a1887f" />
      ))}
    </>
  ),
  plantain: () => (
    <>
      <circle cx="50" cy="50" r="38" fill="#fbc02d" />
      <circle cx="50" cy="50" r="33" fill="#fff3c4" />
      <circle cx="50" cy="50" r="6" fill="#f6d77a" />
    </>
  ),
  leaves: () => (
    <>
      {Array.from({ length: 7 }, (_, k) => (
        <path key={k} d={`M${18 + k * 10} 24q6 26 0 52`} stroke={k % 2 ? '#43a047' : '#7cb342'} strokeWidth="7" fill="none" strokeLinecap="round" />
      ))}
    </>
  ),
}

/** An ingredient of the VIP kitchen, drawn (falls back on the game icon for the rest). */
export function Food({ icon, size, section = false }: { icon: IconName; size: number; section?: boolean }) {
  const id = useId().replace(/:/g, '')
  const draw = (section ? SECTION[icon] : undefined) ?? WHOLE[icon]
  if (!draw) return <Icon name={icon} size={size} />
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
      {draw(`f${id}`)}
    </svg>
  )
}
/** can it be shown cut open */
export const hasSection = (icon: IconName) => !!SECTION[icon]
