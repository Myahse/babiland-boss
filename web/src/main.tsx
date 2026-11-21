import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/baloo-2/600.css'
import '@fontsource/baloo-2/800.css'
import './index.css'
import App from './App'
import ArcadeApp from './arcade/ArcadeApp'
import { Crash } from './Crash'

// the arcade shop game is the main game; the first cooking-minigame version stays at ?mode=cuisine
const mode = new URLSearchParams(location.search).get('mode')
// ?mode=plats: every dish up close (development only)
const Gallery = import.meta.env.DEV && mode === 'plats' ? lazy(() => import('./arcade/DishGallery')) : null
const Tenues = import.meta.env.DEV && mode === 'tenues' ? lazy(() => import('./arcade/OutfitGallery')) : null
const Root = Tenues ? () => <Suspense fallback={null}><Tenues /></Suspense> : Gallery ? () => <Suspense fallback={null}><Gallery /></Suspense> : mode === 'cuisine' ? App : ArcadeApp

// Signs and textures are drawn on canvases, so wait for the font first.
Promise.race([document.fonts.load('800 40px "Baloo 2"'), new Promise((r) => setTimeout(r, 1500))]).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <Crash>
      <Root />
    </Crash>,
  )
})
