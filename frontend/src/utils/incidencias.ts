import type { IncidenciaHoy } from '../services/inicioService'
import type { Notificacion } from '../services/notificacionService'

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

/** Cada tipo de notificación con el incidente que le corresponde (para llevar directo a él). */
const INCIDENCIA_DE_AVISO: Record<string, IncidenciaHoy['tipo']> = {
  INTENTO_INGRESO: 'INTENTO_INCORRECTO',
  AULA_INCORRECTA: 'INTENTO_INCORRECTO',
  QR_DUPLICADO: 'QR_DUPLICADO',
  EXCEPCION_NO_HABILITADO: 'EXCEPCION',
  INGRESO_MANUAL: 'INGRESO_MANUAL',
  EXPULSION: 'EXPULSION',
  EXPULSION_ANULADA: 'EXPULSION',
  TRASLADO_AMBIENTE: 'TRASLADO',
}

/**
 * A dónde lleva una notificación al tocarla: directo al caso, como «Incidencias → Revisar» (la pestaña que
 * corresponde, con el estudiante o la fila resaltados). La foto reportada abre Revisión de fotos con ese estudiante;
 * el aula llena, el panel del examen; el resto (p. ej. la mesa de ayuda), su enlace.
 */
export function enlaceNotificacion(n: Notificacion): string | null {
  if (n.tipo === 'FOTO_REPORTADA' && n.idEstudiante != null) return `/dashboard/estudiantes/fotos?estudiante=${n.idEstudiante}`
  const tipo = INCIDENCIA_DE_AVISO[n.tipo]
  if (tipo && n.idExamen != null) {
    return enlaceIncidencia({ tipo, fechaHora: n.creadaEn, idExamen: n.idExamen, examen: '', idEstudiante: n.idEstudiante, estudiante: null, detalle: null }).a
  }
  if (n.tipo === 'AULA_LLENA' && n.idExamen != null) return `/dashboard/control/${n.idExamen}`
  return n.enlace
}
