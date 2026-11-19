import { useEffect, useRef, useState } from 'react'
import type { PlaceId } from './places'
import { DISTRICTS, canAttack } from './turf'

// The real map (Mapbox, like Babi Life) with the game's districts drawn over it: green = yours, red = a boss's,
// ⭐ key zones, your maquis. The district areas come from OpenStreetMap (public/assets/maps/<place>.json).
// Mapbox needs VITE_MAPBOX_TOKEN at build time (the same public token as Babi Life); without it the same map
// is drawn with MapLibre and the free OpenStreetMap tiles of OpenFreeMap.

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
const base = import.meta.env.BASE_URL + 'assets/maps/'

type Geo = { type: 'FeatureCollection'; bounds: [number, number, number, number]; features: { type: 'Feature'; properties: { i: number; label: [number, number] }; geometry: unknown }[] }
// the two libraries share this part of their API
type AnyMap = {
  on: (ev: string, a: unknown, b?: unknown) => void
  addSource: (id: string, s: unknown) => void
  addLayer: (l: unknown) => void
  getSource: (id: string) => { setData: (d: unknown) => void } | undefined
  fitBounds: (b: unknown, o?: unknown) => void
  remove: () => void
  getCanvas: () => HTMLCanvasElement
}

export function RealMap({ place, owners, selected, onPick }: { place: PlaceId; owners: ('me' | 'boss')[]; selected: number; onPick: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<AnyMap | null>(null)
  const markers = useRef<{ remove: () => void }[]>([])
  const [geo, setGeo] = useState<Geo | null>(null)
  const [ready, setReady] = useState(false)
  const lib = useRef<{ Marker: new (o: unknown) => { setLngLat: (p: unknown) => { addTo: (m: unknown) => { remove: () => void } } } } | null>(null)
  const pick = useRef(onPick)
  pick.current = onPick

  useEffect(() => {
    fetch(`${base}${place}.json`)
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null))
  }, [place])

  // create the map once the district areas are loaded
  useEffect(() => {
    if (!geo || !box.current) return
    let gone = false
    ;(async () => {
      const opts = {
        container: box.current!,
        bounds: [geo.bounds[0], geo.bounds[1], geo.bounds[2], geo.bounds[3]],
        fitBoundsOptions: { padding: 24 },
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      }
      let m: AnyMap
      if (TOKEN) {
        const mb = (await import('mapbox-gl')).default
        await import('mapbox-gl/dist/mapbox-gl.css')
        mb.accessToken = TOKEN
        m = new mb.Map({ ...opts, style: 'mapbox://styles/mapbox/streets-v12' } as never) as unknown as AnyMap
        lib.current = mb as never
      } else {
        const ml = await import('maplibre-gl')
        await import('maplibre-gl/dist/maplibre-gl.css')
        m = new ml.Map({ ...opts, style: 'https://tiles.openfreemap.org/styles/liberty' } as never) as unknown as AnyMap
        lib.current = ml as never
      }
      if (gone) return m.remove()
      map.current = m
      m.on('load', () => {
        m.addSource('districts', { type: 'geojson', data: geo })
        m.addLayer({
          id: 'd-fill',
          type: 'fill',
          source: 'districts',
          paint: { 'fill-color': ['case', ['get', 'mine'], '#40c057', '#fa5252'], 'fill-opacity': ['case', ['get', 'sel'], 0.65, 0.42] },
        })
        m.addLayer({ id: 'd-line', type: 'line', source: 'districts', paint: { 'line-color': ['case', ['get', 'sel'], '#ffffff', '#2b1a12'], 'line-width': ['case', ['get', 'sel'], 5, 2] } })
        m.on('click', 'd-fill', (e: { features?: { properties: { i: number } }[] }) => {
          const f = e.features?.[0]
          if (f) pick.current(Number(f.properties.i))
        })
        setReady(true)
      })
    })()
    return () => {
      gone = true
      markers.current.forEach((k) => k.remove())
      map.current?.remove()
      map.current = null
      setReady(false)
    }
  }, [geo])

  // colours, selection and labels follow the game
  useEffect(() => {
    const m = map.current
    if (!m || !ready || !geo || !lib.current) return
    const ds = DISTRICTS[place]
    m.getSource('districts')?.setData({ ...geo, features: geo.features.map((f) => ({ ...f, properties: { ...f.properties, mine: owners[f.properties.i] === 'me', sel: f.properties.i === selected } })) })
    markers.current.forEach((k) => k.remove())
    markers.current = geo.features.map((f) => {
      const i = f.properties.i
      const d = ds[i]
      const mine = owners[i] === 'me'
      const open = i === 0 ? !mine : canAttack(place, i, owners)
      const el = document.createElement('div')
      el.className = 'pointer-events-auto cursor-pointer text-center leading-tight select-none'
      // kept short so labels don't pile up in the dense centre: the boss's name is on the card when you tap
      const tag = mine ? '👑' : open ? (i === 0 ? '🗡️' : '⚔️') : ''
      el.innerHTML = `
        ${i === 0 ? '<div style="font-size:20px;line-height:1">📍</div>' : ''}
        ${d.bonus ? `<span style="display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#ffd43b;border:2px solid #2b1a12;font-size:12px">${d.bonus.icon}</span>` : ''}
        <div style="font:800 11.5px 'Baloo 2',sans-serif;color:#2b1a12;white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff">${tag} ${d.name}</div>`
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        pick.current(i)
      })
      return new lib.current!.Marker({ element: el }).setLngLat(f.properties.label).addTo(m)
    })
  }, [ready, owners, selected, geo, place])

  return <div ref={box} className="h-full w-full" />
}
