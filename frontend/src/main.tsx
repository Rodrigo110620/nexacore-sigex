import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { PlasmaProvider } from './context/PlasmaContext.tsx'
import './assets/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PlasmaProvider>
      <App />
    </PlasmaProvider>
  </React.StrictMode>,
)
