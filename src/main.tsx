import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { loadManifest } from './lib/assets'
import './fonts.css'
import './styles.css'

if (new URLSearchParams(location.search).has('capture')) {
  window.__capture = true
  document.documentElement.classList.add('capture')
}
loadManifest()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
