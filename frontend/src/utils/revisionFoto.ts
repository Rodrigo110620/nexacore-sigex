import type { SolicitudRevisionFoto } from '../services/fotoRevisionService'
import { fechaCorta } from './fechaCorta'

/** Textos de una solicitud de revisión de foto (ADMIN, y DOCENTE y CONTROL en sus exámenes). */
export const nombreDe = (s: SolicitudRevisionFoto) => `${s.nombre} ${s.apellidos}`
export const inicialesDe = (s: SolicitudRevisionFoto) => `${s.nombre.charAt(0)}${s.apellidos.charAt(0)}`.toUpperCase()

export function fechaSolicitud(s: SolicitudRevisionFoto): string {
  if (s.enviadaEn) return `Enviada ${fechaCorta(s.enviadaEn)}`
  return `Reportada ${fechaCorta(s.reporte?.reportadoEn ?? '')}`
}
