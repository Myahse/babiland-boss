import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Icon } from './Icons'

// Day and night. A day of the game lasts DAY_MINUTES real minutes and is worked out from the real clock, so
// every player (online too) sees the same hour at the same time — like Babi Life « à l'heure d'Abidjan ».
// The sky, the sun (then the moon), the light bounced off the ground and the fog follow the hour; at night the
// garlands, the sign and the street lamps light up, two warm lamps light the maquis, and more customers come:
// evening is maquis time.

export const DAY_MINUTES = 12
const DAY_MS = DAY_MINUTES * 60 * 1000

/** The hour of the game, 0..24 (window.dayHour in development forces it). */
export function gameHour() {
  const forced = (window as unknown as { dayHour?: number }).dayHour
  if (typeof forced === 'number') return forced
  return ((Date.now() % DAY_MS) / DAY_MS) * 24
}
/** How much it is night: 0 in the day, 1 at night, in between at dusk and dawn. */
export function nightOf(h: number) {
  if (h >= 21 || h < 5) return 1
  if (h >= 19) return (h - 19) / 2
  if (h < 6.5) return 1 - (h - 5) / 1.5
  return 0
}
export const night = () => nightOf(gameHour())
/** Customers come more often in the evening and at night (maquis time). */
export const nightCustomers = () => 1 + 0.35 * nightOf(gameHour())

type Key = { h: number; sun: string; sunI: number; sky: string; ground: string; hemiI: number; bg: string; fog: string }
const KEYS: Key[] = [
  { h: 0, sun: '#8fa8ff', sunI: 0.35, sky: '#2b3a67', ground: '#3b2a40', hemiI: 0.6, bg: '#0d1b3a', fog: '#1b2440' },
  { h: 5, sun: '#8fa8ff', sunI: 0.35, sky: '#2b3a67', ground: '#3b2a40', hemiI: 0.6, bg: '#0d1b3a', fog: '#1b2440' },
  { h: 6.5, sun: '#ffb38a', sunI: 1.3, sky: '#a9c4ff', ground: '#ffb27a', hemiI: 0.95, bg: '#ffc9a8', fog: '#ffd8c0' },
  { h: 9, sun: '#fff6e6', sunI: 2.4, sky: '#d6ecff', ground: '#ffcf9e', hemiI: 1.25, bg: '#a5d8ff', fog: '#e7f5ff' },
  { h: 13, sun: '#ffffff', sunI: 2.8, sky: '#e3f4ff', ground: '#ffcf9e', hemiI: 1.35, bg: '#8fd3ff', fog: '#dff3ff' },
  { h: 17, sun: '#fff0d6', sunI: 2.7, sky: '#d6ecff', ground: '#ffb27a', hemiI: 1.25, bg: '#9fd8ff', fog: '#ffe2c4' },
  { h: 18.5, sun: '#ffa85c', sunI: 2.0, sky: '#ffd6a8', ground: '#ff9a5c', hemiI: 1.0, bg: '#ffb38a', fog: '#ffc29a' },
  { h: 19.5, sun: '#ff7b5c', sunI: 0.9, sky: '#7a6fb5', ground: '#b06a5c', hemiI: 0.75, bg: '#5b4b8a', fog: '#6e5a8f' },
  { h: 21, sun: '#8fa8ff', sunI: 0.35, sky: '#2b3a67', ground: '#3b2a40', hemiI: 0.6, bg: '#0d1b3a', fog: '#1b2440' },
  { h: 24, sun: '#8fa8ff', sunI: 0.35, sky: '#2b3a67', ground: '#3b2a40', hemiI: 0.6, bg: '#0d1b3a', fog: '#1b2440' },
]
const ca = new THREE.Color()
const cb = new THREE.Color()
const mix = (out: THREE.Color, a: string, b: string, t: number) => out.copy(ca.set(a)).lerp(cb.set(b), t)

/** The lamps of the street (StreetDecor) register their glowing material here. */
export const glowing: { lamps: THREE.MeshStandardMaterial[] } = { lamps: [] }

/** In the shop's scene: the lights, the sky, the fog, following the hour. */
export function DayNight() {
  const sun = useRef<THREE.DirectionalLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const lampA = useRef<THREE.PointLight>(null)
  const lampB = useRef<THREE.PointLight>(null)
  const { scene } = useThree()
  const bg = useMemo(() => new THREE.Color('#9fd8ff'), [])
  const fog = useMemo(() => new THREE.Fog('#ffe2c4', 20, 44), [])
  useEffect(() => {
    scene.background = bg
    scene.fog = fog
  }, [scene, bg, fog])
  useFrame(() => {
    const h = gameHour()
    const i = Math.max(0, KEYS.findIndex((k) => k.h > h) - 1)
    const a = KEYS[i]
    const b = KEYS[i + 1] ?? KEYS[i]
    const t = b.h > a.h ? (h - a.h) / (b.h - a.h) : 0
    const n = nightOf(h)
    if (sun.current) {
      mix(sun.current.color, a.sun, b.sun, t)
      sun.current.intensity = THREE.MathUtils.lerp(a.sunI, b.sunI, t)
      // the sun crosses the sky from the east (morning) to the west (evening); at night, the moon stays high
      const day = THREE.MathUtils.clamp((h - 6) / 13.5, 0, 1)
      const ang = Math.PI * day
      const p = n > 0.5 ? new THREE.Vector3(-4, 10, 5) : new THREE.Vector3(Math.cos(ang) * 8, 3.5 + Math.sin(ang) * 7, 3)
      sun.current.position.lerp(p, 0.05)
    }
    if (hemi.current) {
      mix(hemi.current.color, a.sky, b.sky, t)
      mix(hemi.current.groundColor, a.ground, b.ground, t)
      hemi.current.intensity = THREE.MathUtils.lerp(a.hemiI, b.hemiI, t)
    }
    mix(bg, a.bg, b.bg, t)
    mix(fog.color, a.fog, b.fog, t)
    // the warm lamps of the maquis, and the street lamps
    if (lampA.current) lampA.current.intensity = n * 9
    if (lampB.current) lampB.current.intensity = n * 7
    for (const m of glowing.lamps) m.emissiveIntensity = 0.3 + n * 2.6
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={['#d6ecff', '#ffb27a', 1.25]} />
      <directionalLight
        ref={sun}
        castShadow
        position={[7, 9, 3]}
        intensity={2.7}
        color="#fff0d6"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
        shadow-radius={3}
      />
      <pointLight ref={lampA} position={[1.6, 2.6, 0.2]} color="#ffb45a" intensity={0} distance={9} decay={1.6} />
      <pointLight ref={lampB} position={[-2.7, 2.4, 2.9]} color="#ffc078" intensity={0} distance={8} decay={1.6} />
    </>
  )
}

/** The hour on screen: ☀️ 14:30, 🌙 21:00 (and « heure des maquis » at night). */
export function GameClock() {
  const [h, setH] = useState(gameHour())
  useEffect(() => {
    const t = setInterval(() => setH(gameHour()), 1000)
    return () => clearInterval(t)
  }, [])
  const n = nightOf(h)
  const moon = h >= 19.5 || h < 6
  const hh = Math.floor(h)
  const mm = Math.floor(((h - hh) * 60) / 10) * 10
  return (
    <div className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold shadow ${n > 0.5 ? 'bg-[#1b2440]/85 text-[#ffe066]' : 'bg-white/85 text-[#2b1a12]'}`}>
      <Icon name={moon ? 'moon' : 'sun'} size={15} />
      <span>
        {String(hh).padStart(2, '0')}:{String(mm).padStart(2, '0')}
      </span>
      {n > 0.5 && <span className="opacity-90">· heure des maquis</span>}
    </div>
  )
}
