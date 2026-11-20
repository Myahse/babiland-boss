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

  // fights and turf
  sword: [
    { d: 'M19 3l2 0 0 2-10 10-2-2z', fill: '#dee2e6' },
    { d: 'M6 13l5 5M8 17l-3 3-2-2 3-3', fill: 'none' },
    { d: 'M5 12l7 7', fill: '#ffd43b' },
  ],
  swords: [
    { d: 'M4 3l3 0 9 9-3 3-9-9z', fill: '#dee2e6' },
    { d: 'M20 3l-3 0-9 9 3 3 9-9z', fill: '#dee2e6' },
    { d: 'M5 15l4 4M19 15l-4 4M4 20l2-2M20 20l-2-2', fill: 'none' },
  ],
  shield: [{ d: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', fill: '#4dabf7' }, { d: 'M12 5v14', fill: 'none' }],
  pin: [{ d: 'M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z', fill: '#e8432e' }, { d: 'M12 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6z', fill: '#ffffff' }],
  star: [{ d: 'M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z', fill: '#ffd43b' }],
  check: [{ d: 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z', fill: '#51cf66' }, { d: 'M7.5 12.5l3 3 6-6.5', fill: 'none' }],
  cross: [{ d: 'M6 6l12 12M18 6L6 18', fill: 'none' }],
  warning: [{ d: 'M12 3l10 18H2z', fill: '#ffd43b' }, { d: 'M12 9v5M12 17.5v.1', fill: 'none' }],
  muscle: [
    { d: 'M5 20c-2-4-1-9 2-12l2-4 3 1-1 4 3 1c3-1 6 0 7 3 1 4-2 7-6 7z', fill: '#c68642' },
    { d: 'M10 14c1-1 3-1 4 0', fill: 'none' },
  ],
  trophy: [
    { d: 'M7 3h10v6a5 5 0 0 1-10 0z', fill: '#ffd43b' },
    { d: 'M7 5H4c0 3 1 5 3 5M17 5h3c0 3-1 5-3 5', fill: 'none' },
    { d: 'M10 14h4v3h-4zM7 21v-2h10v2z', fill: '#e67700' },
  ],
  medal1: [{ d: 'M8 2h3l2 6h-3zM16 2h-3l-2 6h3z', fill: '#4dabf7' }, { d: 'M12 8a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z', fill: '#ffd43b' }, { d: 'M11 12l1.5-1v6', fill: 'none' }],
  medal2: [{ d: 'M8 2h3l2 6h-3zM16 2h-3l-2 6h3z', fill: '#4dabf7' }, { d: 'M12 8a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z', fill: '#ced4da' }, { d: 'M10.5 12.5a1.6 1.6 0 1 1 2.8 1.2l-2.8 3h3.2', fill: 'none' }],
  medal3: [{ d: 'M8 2h3l2 6h-3zM16 2h-3l-2 6h3z', fill: '#4dabf7' }, { d: 'M12 8a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z', fill: '#e8a463' }, { d: 'M10.5 11.5h3l-1.6 2a1.7 1.7 0 1 1-1.6 2.6', fill: 'none' }],
  angry: [
    { d: 'M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19z', fill: '#ff8787' },
    { d: 'M7 8l3 2M17 8l-3 2M8.5 17c2-2 5-2 7 0', fill: 'none' },
  ],
  // money, shop, rewards
  moneybag: [
    { d: 'M9 3h6l-2 4h-2z', fill: '#c9a227' },
    { d: 'M11 7h2c5 2 7 6 7 9a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5c0-3 2-7 7-9z', fill: '#e9c46a' },
    { d: 'M14 11.5c-.5-1-3.5-1-3.5.5s3.5 1 3.5 2.5-3 1.5-3.5.5M12 10v8', fill: 'none' },
  ],
  card: [{ d: 'M2 6h20v13H2z', fill: '#4dabf7' }, { d: 'M2 9.5h20', fill: 'none' }, { d: 'M5 14h6v2H5z', fill: '#ffd43b' }],
  gift: [
    { d: 'M3 9h18v4H3z', fill: '#e8432e' },
    { d: 'M5 13h14v8H5z', fill: '#ff6b6b' },
    { d: 'M12 9v12M12 9c-2-5-6-5-6-2s4 2 6 2c2 0 6 1 6-2s-4-3-6 2', fill: 'none' },
  ],
  chestOpen: [{ d: 'M3 11h18v10H3z', fill: '#a0612a' }, { d: 'M3 11l2-6h14l2 6', fill: '#c68642' }, { d: 'M3 15h18M11 13h2v4h-2z', fill: 'none' }],
  sparkle: [{ d: 'M12 2l2 7 7 3-7 3-2 7-2-7-7-3 7-3z', fill: '#ffd43b' }],
  book: [{ d: 'M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z', fill: '#ffffff' }, { d: 'M12 6v14', fill: 'none' }, { d: 'M3 5v14c3-1 6-1 9 1V6c-3-2-6-2-9-1z', fill: '#74c0fc' }],
  antenna: [{ d: 'M12 11v11M8 22h8', fill: 'none' }, { d: 'M12 8a3 3 0 1 1 0 6 3 3 0 0 1 0-6z', fill: '#e8432e' }, { d: 'M6 5a8 8 0 0 0 0 12M18 5a8 8 0 0 1 0 12', fill: 'none' }],
  hand: [{ d: 'M9 21v-5l-3-4c-1-1.5 1-3 2-1.5l1 1.5V4a1.5 1.5 0 0 1 3 0v6l5 1c1.5.3 2 1.2 2 2.5l-1 7.5z', fill: '#c68642' }],
  // people
  grandma: [
    { d: 'M4 22c0-5 3.5-7 8-7s8 2 8 7z', fill: '#2f9e44' },
    { d: 'M12 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10z', fill: '#8d5524' },
    { d: 'M6.5 9c0-4 2.5-6 5.5-6s5.5 2 5.5 6c-2-1.5-9-1.5-11 0z', fill: '#ffd43b' },
    { d: 'M9 11.5h2M13 11.5h2', fill: 'none' },
  ],
  me: [
    { d: 'M4 22c0-5 3.5-7 8-7s8 2 8 7z', fill: '#ff922b' },
    { d: 'M12 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10z', fill: '#8d5524' },
    { d: 'M9.5 11h.1M14.5 11h.1M10 13c1 1 3 1 4 0', fill: 'none' },
  ],
  chef: [
    { d: 'M4 22c0-5 3.5-7 8-7s8 2 8 7z', fill: '#ffffff' },
    { d: 'M12 8a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z', fill: '#8d5524' },
    { d: 'M7 8a3 3 0 0 1 3-5 3 3 0 0 1 4 0 3 3 0 0 1 3 5z', fill: '#ffffff' },
  ],
  // the room
  chair: [{ d: 'M7 3h10v8H7z', fill: '#e8432e' }, { d: 'M5 11h14v3H5z', fill: '#e8432e' }, { d: 'M7 14l-1 7M17 14l1 7', fill: 'none' }],
  tv: [{ d: 'M2 5h20v13H2z', fill: '#343a40' }, { d: 'M4 7h16v9H4z', fill: '#69db7c' }, { d: 'M12 7v9M8 21h8', fill: 'none' }],
  fan: [
    { d: 'M12 12c-1-4 0-8 3-8s2 5-3 8zM12 12c4-1 8 0 8 3s-5 2-8-3zM12 12c1 4 0 8-3 8s-2-5 3-8zM12 12c-4 1-8 0-8-3s5-2 8 3z', fill: '#74c0fc' },
    { d: 'M12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z', fill: '#ffffff' },
  ],
  fridge: [{ d: 'M6 2h12v20H6z', fill: '#e7f5ff' }, { d: 'M6 9h12M9 5v2M9 12v4', fill: 'none' }],
  // places and turf bonuses
  factory: [{ d: 'M2 21V11l5 3v-3l5 3v-3l5 3V4h4v17z', fill: '#adb5bd' }, { d: 'M6 17h2M11 17h2', fill: 'none' }],
  bus: [{ d: 'M3 5h18v12H3z', fill: '#ffd43b' }, { d: 'M5 7h14v4H5z', fill: '#74c0fc' }, { d: 'M7 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', fill: '#343a40' }],
  bag: [{ d: 'M5 8h14l-1 13H6z', fill: '#f783ac' }, { d: 'M9 10V6a3 3 0 0 1 6 0v4', fill: 'none' }],
  // food (the dishes, the VIP cooking)
  onion: [{ d: 'M12 6c5 2 7 6 6 10-1 3-3.5 5-6 5s-5-2-6-5c-1-4 1-8 6-10z', fill: '#c77dff' }, { d: 'M12 6c-1-2-.5-3 0-4M12 6c2 3 2 12 0 15M12 6c-2 3-2 12 0 15', fill: 'none' }],
  tomato: [{ d: 'M12 7a8 7 0 1 1 0 14 8 7 0 0 1 0-14z', fill: '#fa5252' }, { d: 'M8 6l4 2 4-2-2 3h-4z', fill: '#51cf66' }],
  chili: [{ d: 'M18 6c1 6-4 13-13 15 5-4 7-9 8-14 2-2 4-2 5-1z', fill: '#f03e3e' }, { d: 'M18 6c0-2 1-3 3-3', fill: 'none' }, { d: 'M14 6c1-1 3-1 4 0', fill: '#51cf66' }],
  rice: [{ d: 'M3 12h18a9 9 0 0 1-18 0z', fill: '#4dabf7' }, { d: 'M5 12c0-3 3-5 7-5s7 2 7 5z', fill: '#ffffff' }],
  egg: [{ d: 'M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z', fill: '#fff9db' }],
  fish: [
    { d: 'M2 12c3-5 9-6 14-3l5-4v14l-5-4c-5 3-11 2-14-3z', fill: '#74c0fc' },
    { d: 'M6 10.5h.1M10 9c1 2 1 4 0 6', fill: 'none' },
  ],
  banana: [{ d: 'M4 6c1 9 8 14 17 12-1-2-3-3-5-3-6 0-10-4-11-9z', fill: '#ffd43b' }, { d: 'M4 6l-1-2 2 1', fill: 'none' }],
  plantain: [{ d: 'M3 15c4 2 10 2 16-2l2 2c-6 5-14 5-18 2z', fill: '#f59f00' }, { d: 'M6 15.5l1.5 1.5M10 16l1 1.5M14 15l.5 1.8', fill: 'none' }],
  pepper: [{ d: 'M12 6c5-1 8 3 7 9-1 5-4 7-7 6-3 1-6-1-7-6-1-6 2-10 7-9z', fill: '#51cf66' }, { d: 'M12 6c0-2 1-3 2-4', fill: 'none' }],
  aubergine: [{ d: 'M15 6c4 1 5 6 2 11s-9 6-11 4 0-7 3-11c2-3 4-4 6-4z', fill: '#7048e8' }, { d: 'M14 4l3 1 1 3-3-1z', fill: '#51cf66' }],
  chicken: [{ d: 'M14 3a7 7 0 0 1 3 13l-3 1-3 3-2-2 3-3 1-3A7 7 0 0 1 14 3z', fill: '#d9822b' }, { d: 'M9 18l-3 3M6 18a1.5 1.5 0 1 0-1 3 1.5 1.5 0 1 0 3 1', fill: 'none' }],
  pot: [{ d: 'M4 10h16v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z', fill: '#495057' }, { d: 'M2 10h20M8 6c0-2 1-2 1-4M12 6c0-2 1-2 1-4M16 6c0-2 1-2 1-4', fill: 'none' }, { d: 'M6 10c2-2 10-2 12 0z', fill: '#e8590c' }],
  stew: [{ d: 'M3 11h18a9 9 0 0 1-18 0z', fill: '#ffffff' }, { d: 'M5 11c0-2 3-4 7-4s7 2 7 4z', fill: '#e8590c' }, { d: 'M9 9h.1M14 8.5h.1', fill: 'none' }],
  leaves: [{ d: 'M4 20C4 10 10 4 20 4c0 10-6 16-16 16z', fill: '#40c057' }, { d: 'M4 20L15 9M9 15l-1-4M12 12l3 1', fill: 'none' }],
  bowl: [{ d: 'M3 11h18a9 9 0 0 1-18 0z', fill: '#c68642' }, { d: 'M5 11c0-2 3-4 7-4s7 2 7 4z', fill: '#fff9db' }],
  salad: [{ d: 'M3 12h18a9 9 0 0 1-18 0z', fill: '#ffffff' }, { d: 'M5 12c0-3 2-5 4-4 1-2 4-2 5 0 2-1 5 1 5 4z', fill: '#69db7c' }, { d: 'M10 10a1.3 1.3 0 1 1 0 .1z', fill: '#fa5252' }],
  ball: [{ d: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16z', fill: '#d9822b' }, { d: 'M9 9a2 2 0 0 1 2-1', fill: 'none' }],
  mound: [{ d: 'M3 18c0-6 4-10 9-10s9 4 9 10z', fill: '#fff9db' }, { d: 'M2 18h20', fill: 'none' }],
  cup: [{ d: 'M5 8h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z', fill: '#ffffff' }, { d: 'M17 10h2a2 2 0 0 1 0 4h-2M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4', fill: 'none' }, { d: 'M6.5 10h9v2h-9z', fill: '#6f4e37' }],
  glass: [{ d: 'M6 4h12l-2 17H8z', fill: '#ffffff' }, { d: 'M7 9h10l-1.4 11H8.4z', fill: '#a61e4d' }],
  peanut: [{ d: 'M9 3a4 4 0 0 1 4 5c0 1 1 2 2 2a4 4 0 1 1-4 5c0-1-1-2-2-2A4 4 0 0 1 9 3z', fill: '#d4a373' }],
  knife: [{ d: 'M3 21l11-11 2 2L5 21z', fill: '#343a40' }, { d: 'M14 10l6-6c1 3 0 6-4 8z', fill: '#dee2e6' }],
} satisfies Record<string, Part[]>
export type IconName = keyof typeof ICONS

/** An icon in the HUD. */
export function Icon({ name, size = 24, className = '', x, y }: { name: IconName; size?: number; className?: string; x?: number; y?: number }) {
  return (
    <svg width={size} height={size} x={x} y={y} viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} aria-hidden>
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

/** The same icon as an SVG string, for the HTML markers of the real map. */
export function iconSvg(name: IconName, size = 20) {
  const paths = (ICONS[name] as Part[])
    .map((p) => `<path d="${p.d}" fill="${p.fill}" stroke="${INK}" stroke-width="${p.fill === 'none' ? 1.6 : 1.4}" stroke-linejoin="round" stroke-linecap="round"/>`)
    .join('')
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block">${paths}</svg>`
}
