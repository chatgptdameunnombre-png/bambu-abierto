import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Fraunces con el eje SOFT: serifa redondeada para títulos y números. Auto-hospedada (la CSP solo deja fuentes propias).
import '@fontsource-variable/fraunces/soft.css'
import './index.css'
import './features.css'
import './app.css'
import './brote.css'
import './v4.css'
import './v5.css'
import './v6.css'
import './v7.css'
// Último: los tokens de marca le ganan a cualquier definición vieja.
import './tokens.css'
import '@fontsource-variable/nunito/index.css'
import './duo.css'
import { applyTheme, watchSystemTheme } from './lib/theme'
import { quitarMarcaVersion } from './lib/version'

quitarMarcaVersion()
applyTheme()
watchSystemTheme()


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
