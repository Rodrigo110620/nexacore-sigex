import { useEffect } from 'react'
import { emitirCambioLocal, escucharEventos } from '../../services/notificacionService'

/**
 * Conexión en vivo del estudiante (GET /mi/eventos): avisa a su panel cuando cambia algo suyo
 * (p. ej. el personal registra su ingreso) para que se actualice sin recargar la página.
 */
export default function EnVivoEstudiante() {
  useEffect(
    () =>
      escucharEventos('/mi/eventos', {
        onCambio: emitirCambioLocal,
        onReconectado: () => emitirCambioLocal({ tipo: 'RECONECTADO', idExamen: null, idEstudiante: null }),
      }),
    [],
  )
  return null
}
