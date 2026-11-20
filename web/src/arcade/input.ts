// Movement input: a virtual joystick (drag anywhere on the screen) and the keyboard (arrows / WASD / ZQSD).
export const stick = { x: 0, y: 0, active: false, ox: 0, oy: 0, px: 0, py: 0 }
const keys = new Set<string>()

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()))
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))
  window.addEventListener('blur', () => keys.clear())
}

/** Wanted direction on the ground (x, z), from the direction pushed on the screen. Length 0..1. */
export function moveInput() {
  let x = 0
  let z = 0
  if (keys.has('arrowleft') || keys.has('a') || keys.has('q')) x -= 1
  if (keys.has('arrowright') || keys.has('d')) x += 1
  if (keys.has('arrowup') || keys.has('w') || keys.has('z')) z -= 1
  if (keys.has('arrowdown') || keys.has('s')) z += 1
  if (stick.active) {
    // a small dead zone in the middle, then a smooth curve: little moves for fine steps, full push to run
    const l = Math.hypot(stick.x, stick.y)
    if (l > DEAD) {
      const k = Math.min(1, (l - DEAD) / (1 - DEAD)) ** 0.8 / l
      x += stick.x * k
      z += stick.y * k
    }
  }
  const l = Math.hypot(x, z)
  const sx = l > 1 ? x / l : x
  const sz = l > 1 ? z / l : z
  // what you push is on the screen; the camera looks at the ground from an angle (45° in the maquis, almost
  // straight down the street outside): turn it onto the ground, so « up » walks up the screen
  const c = Math.cos(camYaw.v)
  const s = Math.sin(camYaw.v)
  return { x: sx * c + sz * s, z: -sx * s + sz * c }
}
/** which way the camera looks from (its angle around the vertical), set by the scene's camera */
export const camYaw = { v: Math.PI / 4 }
const DEAD = 0.12

if (import.meta.env.DEV) Object.assign(window, { arcadeStick: stick })
