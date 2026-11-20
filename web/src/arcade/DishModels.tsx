import * as THREE from 'three'
import type { Dish } from './places'

// What each dish looks like on its plate, close to the real thing: the grains of attiéké, the golden fried tuna
// of garba, the caramelised plantain of alloco, the grilled mutton of choukouya with its onions, a whole braised
// fish, the red kedjenou with its chicken, the white tô with its green sauce, the yellow foutou with the kplala…
// Served in the enamel plate with the blue rim of the maquis. Textures are drawn once on canvases, geometries and
// materials are shared by every plate in the game (there can be a hundred on screen).

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, transparent = false) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g, w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  if (transparent) t.premultiplyAlpha = false
  return t
}
const rnd = (() => {
  let s = 1234567
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
})()

/** grains: attiéké, rice */
const grains = (base: string, a: string, b: string) =>
  canvas(128, 128, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = rnd() < 0.5 ? a : b
      g.beginPath()
      g.ellipse(rnd() * w, rnd() * h, 1.4 + rnd() * 1.2, 1 + rnd(), rnd() * 3, 0, Math.PI * 2)
      g.fill()
    }
  })
/** fried: golden crust with darker spots */
const fried = (base: string, dark: string, light: string) =>
  canvas(64, 64, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 160; i++) {
      g.fillStyle = rnd() < 0.55 ? dark : light
      g.globalAlpha = 0.35 + rnd() * 0.5
      g.beginPath()
      g.arc(rnd() * w, rnd() * h, 0.8 + rnd() * 2.6, 0, Math.PI * 2)
      g.fill()
    }
  })
/** grilled: meat or fish skin with the marks of the grill and spice */
const grilled = (base: string, mark: string, spice: string) =>
  canvas(64, 64, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    g.strokeStyle = mark
    g.globalAlpha = 0.55
    g.lineWidth = 2
    for (let x = -h; x < w; x += 18) {
      g.beginPath()
      g.moveTo(x, h)
      g.lineTo(x + h, 0)
      g.stroke()
    }
    for (let i = 0; i < 120; i++) {
      g.fillStyle = spice
      g.globalAlpha = 0.45
      g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5)
    }
  })
/** a sauce: its colour, oil shining, bits in it */
const sauce = (base: string, oil: string, bits: string) =>
  canvas(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, w / 2)
    grd.addColorStop(0, base)
    grd.addColorStop(1, bits)
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
    for (let i = 0; i < 70; i++) {
      g.fillStyle = rnd() < 0.6 ? oil : bits
      g.globalAlpha = 0.5 + rnd() * 0.4
      g.beginPath()
      g.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 5, 1.5 + rnd() * 3, rnd() * 3, 0, Math.PI * 2)
      g.fill()
    }
  })
/** the garnish: tomato cubes, onion, green and red chili (on a transparent sheet) */
const garnish = canvas(
  128,
  128,
  (g, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = 14 + rnd() * (w - 28)
      const y = 14 + rnd() * (h - 28)
      const k = rnd()
      g.save()
      g.translate(x, y)
      g.rotate(rnd() * 3)
      if (k < 0.45) {
        g.fillStyle = rnd() < 0.5 ? '#e03131' : '#c92a2a'
        g.fillRect(-6, -6, 12, 12)
        g.fillStyle = '#ffa8a8'
        g.fillRect(-3, -3, 4, 4)
      } else if (k < 0.75) {
        g.strokeStyle = '#f8f0fc'
        g.lineWidth = 3
        g.beginPath()
        g.arc(0, 0, 8, 0, Math.PI)
        g.stroke()
      } else {
        g.strokeStyle = k < 0.88 ? '#2b8a3e' : '#f03e3e'
        g.lineWidth = 3
        g.beginPath()
        g.arc(0, 0, 4, 0, Math.PI * 2)
        g.stroke()
      }
      g.restore()
    }
  },
  true,
)

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.6, ...o })
const M = {
  plate: std({ color: '#ffffff', roughness: 0.25 }),
  rim: std({ color: '#1c7ed6', roughness: 0.3 }),
  bowl: std({ color: '#f8f9fa', roughness: 0.3 }),
  calabash: std({ color: '#c08552', roughness: 0.7 }),
  attieke: std({ map: grains('#f3e6bf', '#fffaf0', '#d9c48f') }),
  rice: std({ map: grains('#fbf8f0', '#ffffff', '#e2dccb') }),
  rizgras: std({ map: grains('#e8590c', '#ff922b', '#c2410c') }),
  tuna: std({ map: fried('#d08a3c', '#8a4b1c', '#f2c06b'), roughness: 0.45 }),
  plantain: std({ map: fried('#f08c00', '#8a3c06', '#ffc94d'), roughness: 0.35 }),
  plantainIn: std({ color: '#ffd43b', roughness: 0.5 }),
  mutton: std({ map: grilled('#6b3416', '#2b1408', '#c2410c'), roughness: 0.7 }),
  pork: std({ map: grilled('#b5562a', '#5c2208', '#e8590c'), roughness: 0.55 }),
  chicken: std({ map: grilled('#c8641c', '#6b2d0c', '#e03131'), roughness: 0.5 }),
  fish: std({ map: grilled('#8c5a2b', '#3b2210', '#d9480f'), roughness: 0.45 }),
  bone: std({ color: '#f8f0e3' }),
  redSauce: std({ map: sauce('#d9480f', '#ff922b', '#9c2a00'), roughness: 0.25 }),
  greenSauce: std({ map: sauce('#5c7d1a', '#94a832', '#2f4a0c'), roughness: 0.3 }),
  leafSauce: std({ map: sauce('#2b6a2a', '#5c940d', '#173d16'), roughness: 0.3 }),
  kplala: std({ map: sauce('#5c3317', '#8a5a2b', '#2b1408'), roughness: 0.25 }),
  peanut: std({ map: sauce('#c26a1b', '#e8a33c', '#7a3e0c'), roughness: 0.3 }),
  to: std({ color: '#f4efe4', roughness: 0.55 }),
  foutou: std({ color: '#fff3bf', roughness: 0.6 }),
  foutouBanane: std({ color: '#f2c94c', roughness: 0.6 }),
  eggWhite: std({ color: '#ffffff', roughness: 0.3 }),
  yolk: std({ color: '#ffa94d', roughness: 0.25 }),
  onion: std({ color: '#f3d9fa', roughness: 0.4 }),
  chili: std({ color: '#e03131', roughness: 0.3 }),
  chiliGreen: std({ color: '#2f9e44', roughness: 0.3 }),
  eggplant: std({ color: '#5f3dc4', roughness: 0.3 }),
  garnish: new THREE.MeshStandardMaterial({ map: garnish, transparent: true, alphaTest: 0.3, roughness: 0.5 }),
  glass: new THREE.MeshStandardMaterial({ color: '#e7f5ff', roughness: 0.05, transparent: true, opacity: 0.45 }),
  claclo: std({ map: fried('#c8641c', '#7a3510', '#f08c00'), roughness: 0.45 }),
}
const G = {
  plate: new THREE.CylinderGeometry(0.16, 0.12, 0.03, 20),
  rim: new THREE.TorusGeometry(0.155, 0.008, 6, 24),
  mound: new THREE.SphereGeometry(0.075, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  disc: new THREE.CylinderGeometry(0.12, 0.12, 0.01, 20),
  smallDisc: new THREE.CylinderGeometry(0.08, 0.08, 0.008, 16),
  chunk: new THREE.DodecahedronGeometry(0.03, 0),
  slice: new THREE.CylinderGeometry(0.027, 0.027, 0.016, 12),
  plane: new THREE.PlaneGeometry(0.2, 0.2),
  ring: new THREE.TorusGeometry(0.022, 0.006, 6, 12),
  chili: new THREE.ConeGeometry(0.01, 0.06, 6),
  ball: new THREE.SphereGeometry(0.06, 14, 10),
  smallBall: new THREE.SphereGeometry(0.026, 10, 8),
  egg: new THREE.CylinderGeometry(0.05, 0.05, 0.008, 12),
  yolk: new THREE.SphereGeometry(0.02, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  fish: new THREE.SphereGeometry(0.06, 14, 10),
  tail: new THREE.ConeGeometry(0.04, 0.06, 3),
  eye: new THREE.SphereGeometry(0.008, 6, 6),
  drum: new THREE.SphereGeometry(0.032, 10, 8),
  boneStick: new THREE.CylinderGeometry(0.007, 0.007, 0.05, 6),
  bowl: new THREE.CylinderGeometry(0.085, 0.06, 0.05, 18, 1, true),
  bowlBottom: new THREE.CircleGeometry(0.06, 18),
  bowlSauce: new THREE.CylinderGeometry(0.08, 0.08, 0.008, 18),
  cup: new THREE.CylinderGeometry(0.045, 0.038, 0.11, 14),
  drink: new THREE.CylinderGeometry(0.04, 0.034, 0.09, 14),
  bottle: new THREE.CylinderGeometry(0.035, 0.035, 0.13, 12),
  cap: new THREE.CylinderGeometry(0.015, 0.015, 0.025, 8),
  cube: new THREE.BoxGeometry(0.05, 0.035, 0.045),
}
const dark = std({ color: '#2b1a12' })

type P = { position?: [number, number, number]; rotation?: [number, number, number]; scale?: [number, number, number] | number }
const m = (geo: THREE.BufferGeometry, mat: THREE.Material, p: P = {}, key?: string | number) => <mesh key={key} geometry={geo} material={mat} castShadow {...p} />

const garnishOn = (y: number, x = 0, z = 0, s = 0.8) => m(G.plane, M.garnish, { position: [x, y, z], rotation: [-Math.PI / 2, 0, 0.6], scale: s })
/** a bowl of sauce at the side of the plate */
const bowlOf = (sauceMat: THREE.Material, x: number, z: number) => (
  <group position={[x, 0.03, z]} scale={0.8}>
    {m(G.bowl, M.bowl, { position: [0, 0.025, 0] })}
    {m(G.bowlBottom, M.bowl, { rotation: [-Math.PI / 2, 0, 0] })}
    {m(G.bowlSauce, sauceMat, { position: [0, 0.04, 0] })}
  </group>
)

/** The food, standing on the plate (y = 0 is the top of the plate). */
function Food({ dish }: { dish: Dish }) {
  switch (dish) {
    case 'garba': // attiéké, fried tuna in chunks, tomato, onion, chili
      return (
        <>
          {m(G.mound, M.attieke, { position: [-0.035, 0, 0], scale: [1, 0.7, 1] })}
          {m(G.chunk, M.tuna, { position: [0.06, 0.025, 0.03], rotation: [0.4, 0.8, 0.2], scale: [1.4, 0.9, 1.1] })}
          {m(G.chunk, M.tuna, { position: [0.065, 0.025, -0.04], rotation: [0.1, 0.3, 0.6], scale: [1.2, 0.9, 1.2] })}
          {m(G.chunk, M.tuna, { position: [0.01, 0.06, -0.01], rotation: [1, 0.2, 0.3], scale: [1.1, 0.8, 1] })}
          {garnishOn(0.056, -0.035, 0, 0.55)}
          {m(G.chili, M.chili, { position: [-0.08, 0.02, 0.07], rotation: [0, 0, Math.PI / 2] })}
        </>
      )
    case 'alloco': // fried plantain in slices, an egg, onion-tomato-chili
      return (
        <>
          {[
            [-0.07, -0.04],
            [-0.015, -0.07],
            [0.04, -0.04],
            [-0.06, 0.03],
            [-0.01, -0.01],
            [-0.025, 0.06],
            [0.025, 0.035],
          ].map(([x, z], i) => m(G.slice, M.plantain, { position: [x, 0.01 + (i === 4 ? 0.016 : 0), z], rotation: [0.3, i * 0.9, 0.2], scale: [1.3, 1, 0.85] }, i))}
          {m(G.egg, M.eggWhite, { position: [0.065, 0.006, 0.03] })}
          {m(G.yolk, M.yolk, { position: [0.065, 0.008, 0.03] })}
          {garnishOn(0.04, -0.02, -0.01, 0.45)}
        </>
      )
    case 'choukouya': // grilled mutton with onions, attiéké at the side, spicy
      return (
        <>
          {[
            [-0.04, -0.03],
            [0.02, -0.05],
            [0.04, 0.01],
            [-0.02, 0.02],
            [0.0, -0.01],
          ].map(([x, z], i) => m(G.chunk, M.mutton, { position: [x, 0.025 + (i === 4 ? 0.025 : 0), z], rotation: [i, i * 0.7, 0.3], scale: [1.3, 0.85, 1.05] }, i))}
          {m(G.ring, M.onion, { position: [-0.06, 0.04, 0.06], rotation: [Math.PI / 2.4, 0, 0] })}
          {m(G.ring, M.onion, { position: [0.05, 0.05, 0.05], rotation: [Math.PI / 2, 0.3, 0] })}
          {m(G.mound, M.attieke, { position: [0.07, 0, -0.07], scale: [0.55, 0.4, 0.55] })}
          {garnishOn(0.052, -0.005, -0.01, 0.4)}
        </>
      )
    case 'poisson': // a whole braised fish with the grill marks, attiéké, onion-tomato on top
      return (
        <>
          {m(G.mound, M.attieke, { position: [-0.08, 0, -0.06], scale: [0.6, 0.5, 0.6] })}
          <group position={[0.01, 0.025, 0.015]} rotation={[0, 0.35, 0]}>
            {m(G.fish, M.fish, { scale: [1.75, 0.45, 0.8] })}
            {m(G.tail, M.fish, { position: [-0.125, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [1, 1, 0.35] })}
            {m(G.eye, dark, { position: [0.085, 0.012, 0.02] })}
            {garnishOn(0.028, 0, 0, 0.45)}
          </group>
        </>
      )
    case 'kedjenou': // chicken stewed in the red sauce with eggplant, attiéké
      return (
        <>
          {m(G.disc, M.redSauce, { position: [0.01, 0.006, 0] })}
          {[
            [-0.03, -0.02, 0.3],
            [0.04, 0.0, -0.8],
          ].map(([x, z, r], i) => (
            <group key={i} position={[x, 0.025, z]} rotation={[0, r, 0.3]}>
              {m(G.drum, M.chicken, { scale: [1.3, 0.9, 1] })}
              {m(G.boneStick, M.bone, { position: [0.045, 0, 0], rotation: [0, 0, Math.PI / 2] })}
            </group>
          ))}
          {m(G.cube, M.eggplant, { position: [0.0, 0.02, 0.06], rotation: [0.3, 0.5, 0], scale: 0.6 })}
          {m(G.mound, M.attieke, { position: [-0.07, 0, 0.06], scale: [0.5, 0.45, 0.5] })}
        </>
      )
    case 'to': // tô (maize paste) and its green sauce in a bowl
      return (
        <>
          {m(G.mound, M.to, { position: [-0.04, 0, 0.01], scale: [1, 0.85, 1] })}
          {bowlOf(M.greenSauce, 0.075, -0.035)}
        </>
      )
    case 'kplala': // foutou banane and the dark kplala sauce with a piece of fish
      return (
        <>
          {m(G.ball, M.foutouBanane, { position: [-0.04, 0.04, 0.02], scale: [1, 0.75, 1] })}
          {bowlOf(M.kplala, 0.07, -0.04)}
          {m(G.chunk, M.fish, { position: [0.07, 0.065, -0.04], scale: [1, 0.6, 0.8] })}
        </>
      )
    case 'feuille': // rice and the green leaf sauce with meat
      return (
        <>
          {m(G.mound, M.rice, { position: [-0.04, 0, 0.01], scale: [1, 0.65, 1] })}
          {bowlOf(M.leafSauce, 0.07, -0.04)}
          {m(G.chunk, M.mutton, { position: [0.07, 0.065, -0.04], scale: [1, 0.7, 0.9] })}
        </>
      )
    case 'porc': // pork from the oven with onions and chili
      return (
        <>
          {[
            [-0.04, -0.02],
            [0.03, -0.04],
            [0.03, 0.03],
            [-0.02, 0.04],
          ].map(([x, z], i) => m(G.cube, M.pork, { position: [x, 0.02, z], rotation: [0.2, i, 0.1] }, i))}
          {m(G.ring, M.onion, { position: [0.0, 0.045, 0.0], rotation: [Math.PI / 2.2, 0, 0] })}
          {m(G.chili, M.chiliGreen, { position: [-0.07, 0.02, 0.06], rotation: [0, 0, Math.PI / 2] })}
        </>
      )
    case 'poulet': // braised chicken legs, attiéké, onions
      return (
        <>
          {[
            [-0.02, -0.02, 0.4],
            [0.03, 0.03, 2.2],
          ].map(([x, z, r], i) => (
            <group key={i} position={[x, 0.03, z]} rotation={[0, r, 0.2]}>
              {m(G.drum, M.chicken, { scale: [1.6, 1, 1.2] })}
              {m(G.boneStick, M.bone, { position: [0.055, 0, 0], rotation: [0, 0, Math.PI / 2] })}
            </group>
          ))}
          {m(G.mound, M.attieke, { position: [0.07, 0, -0.07], scale: [0.5, 0.4, 0.5] })}
          {garnishOn(0.06, 0, 0, 0.4)}
        </>
      )
    case 'claclo': // little fried banana balls
      return (
        <>
          {[
            [-0.04, -0.02],
            [0.0, 0.03],
            [0.04, -0.02],
            [0.0, -0.05],
            [-0.03, 0.05],
            [0.04, 0.04],
            [0.0, -0.005],
          ].map(([x, z], i) => m(G.smallBall, M.claclo, { position: [x, 0.025 + (i === 6 ? 0.03 : 0), z] }, i))}
        </>
      )
    case 'foutou': // white foutou igname in its red sauce
      return (
        <>
          {m(G.disc, M.redSauce, { position: [0, 0.006, 0] })}
          {m(G.ball, M.foutou, { position: [0, 0.045, 0], scale: [1, 0.75, 1] })}
          {m(G.chunk, M.fish, { position: [0.075, 0.02, 0.03], scale: [0.9, 0.6, 0.8] })}
        </>
      )
    case 'foutoubanane':
      return (
        <>
          {m(G.disc, M.kplala, { position: [0, 0.006, 0] })}
          {m(G.ball, M.foutouBanane, { position: [0, 0.045, 0], scale: [1, 0.75, 1] })}
        </>
      )
    case 'rizgras': // red rice cooked in tomato, with meat and vegetables
      return (
        <>
          {m(G.mound, M.rizgras, { position: [0, 0, 0], scale: [1.35, 0.8, 1.35] })}
          {m(G.chunk, M.mutton, { position: [0.04, 0.05, 0.02], scale: [1, 0.7, 0.9] })}
          {garnishOn(0.062, -0.02, 0, 0.35)}
        </>
      )
    case 'rizarachide': // white rice and the peanut sauce
      return (
        <>
          {m(G.mound, M.rice, { position: [-0.04, 0, 0.01], scale: [1, 0.65, 1] })}
          {bowlOf(M.peanut, 0.07, -0.04)}
        </>
      )
    default:
      return m(G.mound, M.attieke, { scale: [1, 0.7, 1] })
  }
}

/** The drinks: in a glass (tea, coffee) or a small bottle (bissap, gnamakoudji, dêguê). */
function Drink({ dish, color }: { dish: Dish; color: string }) {
  const liquid = (DRINK_MATS[dish] ??= std({ color, roughness: 0.2 }))
  if (dish === 'the' || dish === 'cafe')
    return (
      <>
        {m(G.cup, M.glass, { position: [0, 0.055, 0] })}
        {m(G.drink, liquid, { position: [0, 0.05, 0] })}
        {/* the foam of the tea poured from high up */}
        {dish === 'the' && m(G.smallDisc, M.eggWhite, { position: [0, 0.098, 0], scale: [0.48, 1, 0.48] })}
      </>
    )
  return (
    <>
      {m(G.bottle, liquid, { position: [0, 0.065, 0] })}
      {m(G.cap, dish === 'degue' ? M.rim : M.chili, { position: [0, 0.14, 0] })}
    </>
  )
}
const DRINK_MATS: Partial<Record<Dish, THREE.Material>> = {}

/** A served dish: the enamel plate with its blue rim, the food on it; a drink on a saucer. */
export function DishModel({ dish, look, color }: { dish: Dish; look: string; color?: string }) {
  if (look === 'drink')
    return (
      <>
        {m(G.smallDisc, M.plate, { position: [0, 0.004, 0] })}
        <Drink dish={dish} color={color ?? '#a61e4d'} />
      </>
    )
  return (
    <>
      {m(G.plate, M.plate)}
      {m(G.rim, M.rim, { position: [0, 0.015, 0], rotation: [Math.PI / 2, 0, 0] })}
      <group position={[0, 0.015, 0]}>
        <Food dish={dish} />
      </group>
    </>
  )
}
