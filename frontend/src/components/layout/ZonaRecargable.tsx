import { useRef, useState, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { emitirCambioLocal } from '../../services/notificacionService'

/** Cuánto hay que jalar (en px, ya amortiguado) para que al soltar se actualice. */
const UMBRAL = 64
const MAXIMO = 96

/**
 * Contenido principal desplazable con «jalar para actualizar» en el celular: desde arriba de todo, al jalar
 * hacia abajo y soltar, cada pantalla vuelve a pedir sus datos (el mismo aviso que tras una reconexión), sin
 * recargar la página. En computadora no cambia nada (no hay toques).
 */
export default function ZonaRecargable({ className = '', children }: { className?: string; children: ReactNode }) {
  const zona = useRef<HTMLElement>(null)
  const inicio = useRef<number | null>(null)
  const [jalon, setJalon] = useState(0)
  const [actualizando, setActualizando] = useState(false)
  // Mientras el dedo arrastra no hay transición (sigue al dedo); al soltar, vuelve suave.
  const [arrastrando, setArrastrando] = useState(false)

  const alTocar = (e: React.TouchEvent) => {
    inicio.current = !actualizando && (zona.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null
    setArrastrando(inicio.current != null)
  }
  const alMover = (e: React.TouchEvent) => {
    if (inicio.current == null) return
    const dy = e.touches[0].clientY - inicio.current
    if (dy <= 0 || (zona.current?.scrollTop ?? 0) > 0) { setJalon(0); return }
    // Amortiguado: se siente como una goma, no como arrastrar la página entera.
    setJalon(Math.min(MAXIMO, dy * 0.45))
  }
  const alSoltar = () => {
    if (inicio.current == null) return
    inicio.current = null
    setArrastrando(false)
    if (jalon >= UMBRAL) {
      setActualizando(true)
      setJalon(UMBRAL)
      try { navigator.vibrate?.(15) } catch { /* sin vibración */ }
      emitirCambioLocal({ tipo: 'RECONECTADO', idExamen: null, idEstudiante: null })
      window.setTimeout(() => { setActualizando(false); setJalon(0) }, 900)
    } else {
      setJalon(0)
    }
  }

  const listo = jalon >= UMBRAL
  return (
    <main ref={zona} onTouchStart={alTocar} onTouchMove={alMover} onTouchEnd={alSoltar} onTouchCancel={alSoltar}
      className={`relative overscroll-y-contain ${className}`}>
      <div aria-hidden={jalon === 0 && !actualizando} role="status"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        style={{ transform: `translateY(${jalon - 44}px)`, opacity: Math.min(1, jalon / UMBRAL), transition: arrastrando ? 'none' : 'transform 0.25s, opacity 0.25s' }}>
        <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#D8E3F5] bg-white px-3 py-1.5 text-xs font-semibold text-[#0439D9] shadow-md">
          <RefreshCw size={15} aria-hidden="true" className={actualizando ? 'animate-spin' : ''}
            style={actualizando ? undefined : { transform: `rotate(${jalon * 3}deg)` }} />
          {actualizando ? 'Actualizando…' : listo ? 'Suelta para actualizar' : 'Jala para actualizar'}
        </span>
      </div>
      {/* El contenido no se mueve: así lo fijo de la pantalla (la barra inferior, los modales) queda en su lugar. */}
      {children}
    </main>
  )
}
