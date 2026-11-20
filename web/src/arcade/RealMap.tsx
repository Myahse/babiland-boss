import { iconSvg } from './Icons'
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
        // close enough to see the relief: centred on your maquis' district, the rest just around
        center: geo.features[0].properties.label,
        zoom: 13.1,
        attributionControl: { compact: true },
        // 3D: the camera is tilted and a little turned, you can rotate / tilt with two fingers
        pitch: 55,
        bearing: -18,
        maxPitch: 70,
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
        // real buildings in relief (OpenFreeMap: « openmaptiles », Mapbox streets: « composite »)
        const bsrc = TOKEN ? 'composite' : 'openmaptiles'
        const h = TOKEN ? ['coalesce', ['get', 'height'], 8] : ['coalesce', ['get', 'render_height'], 8]
        try {
          m.addLayer({ id: 'b3d', type: 'fill-extrusion', source: bsrc, 'source-layer': 'building', minzoom: 12.5, paint: { 'fill-extrusion-color': '#efe3cf', 'fill-extrusion-height': h, 'fill-extrusion-opacity': 0.85 } })
        } catch {
          /* style without buildings */
        }
        // the districts as raised slabs: yours higher, the one you tapped higher still
        m.addLayer({ id: 'd-fill', type: 'fill', source: 'districts', paint: { 'fill-color': ['case', ['get', 'mine'], '#40c057', '#fa5252'], 'fill-opacity': 0.18 } })
        m.addLayer({
          id: 'd-3d',
          type: 'fill-extrusion',
          source: 'districts',
          paint: {
            'fill-extrusion-color': ['case', ['get', 'mine'], '#40c057', '#fa5252'],
            'fill-extrusion-height': ['case', ['get', 'sel'], 260, ['get', 'mine'], 130, 35],
            'fill-extrusion-opacity': 0.38,
            'fill-extrusion-vertical-gradient': true,
          },
        })
        m.addLayer({ id: 'd-line', type: 'line', source: 'districts', paint: { 'line-color': ['case', ['get', 'sel'], '#ffffff', '#2b1a12'], 'line-width': ['case', ['get', 'sel'], 5, 2] } })
        const click = (e: { features?: { properties: { i: number } }[] }) => {
          const f = e.features?.[0]
          if (f) pick.current(Number(f.properties.i))
        }
        m.on('click', 'd-3d', click)
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
      const tag = mine ? iconSvg('crown', 15) : open ? iconSvg(i === 0 ? 'sword' : 'swords', 15) : ''
      el.innerHTML = `
        ${i === 0 ? `<div style="display:flex;justify-content:center">${iconSvg('pin', 22)}</div>` : ''}
        ${d.bonus ? `<span style="display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#ffd43b;border:2px solid #2b1a12;">${iconSvg(d.bonus.icon, 14)}</span>` : ''}
        <div style="font:800 11.5px 'Baloo 2',sans-serif;color:#2b1a12;white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 3px #fff;display:flex;align-items:center;justify-content:center;gap:2px">${tag}<span>${d.name}</span></div>`
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        pick.current(i)
      })
      return new lib.current!.Marker({ element: el }).setLngLat(f.properties.label).addTo(m)
    })
  }, [ready, owners, selected, geo, place])

  return <div ref={box} className="h-full w-full" />
}
