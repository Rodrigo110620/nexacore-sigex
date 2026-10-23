import api from './api'

/** Por qué el personal de control reporta la foto de un estudiante. */
export type MotivoReporteFoto = 'NO_SE_PARECE' | 'NO_CLARA' | 'OTRO'

export const MOTIVOS_REPORTE: { id: MotivoReporteFoto; texto: string }[] = [
  { id: 'NO_SE_PARECE', texto: 'La persona no se parece a la foto' },
  { id: 'NO_CLARA', texto: 'La foto no es clara o está desactualizada' },
  { id: 'OTRO', texto: 'Otro motivo' },
]

export const textoMotivoReporte = (motivo: string) =>
  MOTIVOS_REPORTE.find((m) => m.id === motivo)?.texto ?? motivo

/** Solicitud en la revisión de fotos del ADMIN (GET /estudiantes/fotos-pendientes). */
export interface SolicitudRevisionFoto {
  idEstudiante: number
  codigoSis: string
  nombre: string
  apellidos: string
  carrera: string | null
  /** CAMBIO: el estudiante cambió su foto. REPORTE: el personal de control la reportó. */
  origen: 'CAMBIO' | 'REPORTE'
  /** PENDIENTE: hay foto nueva por revisar. ESPERANDO_FOTO: reportada, el estudiante aún no la reemplaza. */
  estado: 'PENDIENTE' | 'ESPERANDO_FOTO'
  enviadaEn: string | null
  fotoUrl: string | null
  fotoActualUrl: string | null
  reporte: { motivo: MotivoReporteFoto; detalle: string | null; reportadoPor: string | null; reportadoEn: string } | null
}

/** Mensaje del backend (ErrorResponse.mensaje), uno de conexión o el genérico. */
export function mensajeDeError(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { mensaje?: string } } }
  if (!err.response) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'
  return err.response.data?.mensaje || fallback
}

/** Reporte abierto de la foto de un estudiante (GET /estudiantes/{id}/foto/reporte). */
export interface ReporteFotoAbierto {
  motivo: string
  detalle: string | null
  reportadoPor: string | null
  reportadoEn: string
}

/** null si la foto no tiene un reporte abierto (el backend responde 204). */
export async function obtenerReporteFoto(idEstudiante: number): Promise<ReporteFotoAbierto | null> {
  const { data } = await api.get<ReporteFotoAbierto | ''>(`/estudiantes/${idEstudiante}/foto/reporte`)
  return data || null
}

export async function reportarFoto(
  idEstudiante: number,
  payload: { motivo: MotivoReporteFoto; detalle?: string; idExamen?: number },
): Promise<void> {
  await api.post(`/estudiantes/${idEstudiante}/foto/reportes`, payload)
}

export async function listarRevisionFotos(): Promise<SolicitudRevisionFoto[]> {
  const { data } = await api.get<SolicitudRevisionFoto[]>('/estudiantes/fotos-pendientes')
  return data
}

export async function aprobarFoto(idEstudiante: number): Promise<void> {
  await api.post(`/estudiantes/${idEstudiante}/foto-solicitud/aprobar`)
}

export async function rechazarFoto(idEstudiante: number, motivo: string): Promise<void> {
  await api.post(`/estudiantes/${idEstudiante}/foto-solicitud/rechazar`, { motivo })
}

export async function descartarReporteFoto(idEstudiante: number): Promise<void> {
  await api.post(`/estudiantes/${idEstudiante}/foto/reportes/descartar`)
}

/** Revoca el QR del estudiante y le envía uno nuevo a su correo institucional. */
export async function regenerarQr(idEstudiante: number): Promise<void> {
  await api.post(`/estudiantes/${idEstudiante}/qr/regenerar`)
}
