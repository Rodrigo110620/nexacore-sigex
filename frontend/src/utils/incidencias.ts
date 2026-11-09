import type { IncidenciaHoy } from '../services/inicioService'

/**
 * Lleva directo al incidente elegido: intentos y QR duplicados a la pestaña Intentos, ingresos manuales y
 * excepciones a Excepciones (con la fila resaltada); traslados y expulsiones al panel del examen con el
 * estudiante resaltado en la tabla.
 */
export function enlaceIncidencia(inc: IncidenciaHoy): { a: string; texto: string } {
  const base = `/dashboard/control/${inc.idExamen}`
  const parametros = new URLSearchParams()
  if (inc.idEstudiante != null) parametros.set('estudiante', String(inc.idEstudiante))
  switch (inc.tipo) {
    case 'TRASLADO':
    case 'EXPULSION':
      return { a: `${base}?${parametros}`, texto: 'Ver al estudiante en el examen' }
    case 'INGRESO_MANUAL':
    case 'EXCEPCION':
      parametros.set('pestana', 'excepciones')
      return { a: `${base}/informacion?${parametros}`, texto: 'Ver en Excepciones' }
    default:
      parametros.set('pestana', 'intentos')
      parametros.set('hora', inc.fechaHora.slice(0, 16))
      return { a: `${base}/informacion?${parametros}`, texto: 'Ver en Intentos' }
  }
}
