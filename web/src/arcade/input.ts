// Movement input: a virtual joystick (drag anywhere on the screen) and the keyboard (arrows / WASD / ZQSD).
export const stick = { x: 0, y: 0, active: false, ox: 0, oy: 0, px: 0, py: 0 }
const keys = new Set<string>()

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()))
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()))
  window.addEventListener('blur', () => keys.clear())
}

/** Wanted direction on the ground: x = right, z = toward the street. Length 0..1. */
export function moveInput() {
  let x = 0
  let z = 0
  if (keys.has('arrowleft') || keys.has('a') || keys.has('q')) x -= 1
  if (keys.has('arrowright') || keys.has('d')) x += 1
  if (keys.has('arrowup') || keys.has('w') || keys.has('z')) z -= 1
  if (keys.has('arrowdown') || keys.has('s')) z += 1
  if (stick.active) {
    x += stick.x
    z += stick.y
  }
  const l = Math.hypot(x, z)
  return l > 1 ? { x: x / l, z: z / l } : { x, z }
}
