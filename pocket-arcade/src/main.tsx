import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/noto-sans-sc'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

window.addEventListener('contextmenu', (event) => event.preventDefault())
window.addEventListener('dragstart', (event) => event.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
