import { createRoot } from 'react-dom/client'
import '@fontsource/baloo-2/600.css'
import '@fontsource/baloo-2/800.css'
import './index.css'
import App from './App'
import ArcadeApp from './arcade/ArcadeApp'

// the arcade shop game is the main game; the first cooking-minigame version stays at ?mode=cuisine
const Root = new URLSearchParams(location.search).get('mode') === 'cuisine' ? App : ArcadeApp

// Signs and textures are drawn on canvases, so wait for the font first.
Promise.race([document.fonts.load('800 40px "Baloo 2"'), new Promise((r) => setTimeout(r, 1500))]).finally(() => {
  createRoot(document.getElementById('root')!).render(<Root />)
})
