import { useEffect } from 'react'
import { EVENTO_NOTIFICACION, emitirCambioLocal, escucharEventos } from '../../services/notificacionService'

/**
 * Conexión en vivo del estudiante (GET /mi/eventos): avisa a su panel cuando cambia algo suyo
 * (p. ej. el personal registra su ingreso) para que se actualice sin recargar la página.
 */
export default function EnVivoEstudiante() {
  useEffect(
    () =>
      escucharEventos('/mi/eventos', {
        onCambio: emitirCambioLocal,
        // Avisos solo para él (p. ej. la mesa de ayuda respondió): su portal los muestra en pantalla.
        onNotificacion: (n) => window.dispatchEvent(new CustomEvent(EVENTO_NOTIFICACION, { detail: n })),
        onReconectado: () => emitirCambioLocal({ tipo: 'RECONECTADO', idExamen: null, idEstudiante: null }),
      }),
    [],
  )
  return null
}
