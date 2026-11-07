import api from './api'

/**
 * DASH-05: descarga la asistencia del examen en Excel con el nombre que manda el servidor
 * (asistencia_Base-de-Datos-I_G1_2026-11-06.xlsx). Devuelve ese nombre.
 */
export async function descargarAsistencia(idExamen: number, formato: 'xlsx' | 'csv' = 'xlsx'): Promise<string> {
  const res = await api.get<Blob>(`/examenes/${idExamen}/asistencia.${formato}`, { responseType: 'blob' })
  const disposicion = String(res.headers['content-disposition'] ?? '')
  const nombre = /filename="?([^";]+)"?/.exec(disposicion)?.[1] ?? `asistencia.${formato}`
  const url = URL.createObjectURL(res.data)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
  return nombre
}

/**
 * HU#4: descarga el acta de asistencia del examen en PDF con el nombre que manda el servidor
 * (acta_examen_20.pdf). Devuelve ese nombre.
 */
export async function descargarActaPDF(idExamen: number): Promise<string> {
  const res = await api.get<Blob>(`/reportes/examenes/${idExamen}/acta.pdf`, {
    responseType: 'blob',
  })
  const disposicion = String(res.headers['content-disposition'] ?? '')
  const nombre = /filename="?([^";]+)"?/.exec(disposicion)?.[1] ?? `acta_examen_${idExamen}.pdf`
  const url = URL.createObjectURL(res.data)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
  return nombre
}

/** Mensaje del servidor (por ejemplo, 409 si el examen no empezó) leído desde la respuesta en blob. */
export async function mensajeDescarga(err: unknown): Promise<string> {
  const respuesta = (err as { response?: { data?: unknown; status?: number } }).response
  if (!respuesta) return 'No se pudo conectar con el servidor. Revisa tu conexión.'
  if (respuesta.status === 403) return 'No tienes permiso para descargar la asistencia de este examen.'
  try {
    const datos = respuesta.data instanceof Blob ? JSON.parse(await respuesta.data.text()) : respuesta.data
    if (datos && typeof datos === 'object' && 'mensaje' in datos) return String((datos as { mensaje: string }).mensaje)
  } catch { /* sin mensaje del servidor */ }
  return 'No se pudo descargar la asistencia.'
}
