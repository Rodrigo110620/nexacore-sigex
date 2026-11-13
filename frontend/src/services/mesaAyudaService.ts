import api from './api'

export type TipoAyuda = 'CUENTA' | 'CONTRASENA' | 'ACTIVACION' | 'QR' | 'FOTO' | 'EXAMEN' | 'OTRO'

export const TIPOS_AYUDA: [TipoAyuda, string][] = [
  ['CUENTA', 'No tengo cuenta o no puedo entrar'],
  ['CONTRASENA', 'Olvidé mi contraseña'],
  ['ACTIVACION', 'Activar mi cuenta de estudiante'],
  ['QR', 'Mi código QR'],
  ['FOTO', 'Mi foto'],
  ['EXAMEN', 'Un examen'],
  ['OTRO', 'Otro'],
]

export const etiquetaTipo = (tipo: string) => TIPOS_AYUDA.find(([t]) => t === tipo)?.[1] ?? tipo

export interface SolicitudAyudaPayload {
  nombre: string
  correo: string
  tipo: TipoAyuda
  mensaje: string
  /** Trampa para bots: el formulario lo deja vacío. */
  sitio: string
}

export interface SolicitudAyuda {
  id: number
  nombre: string
  correo: string
  tipo: string
  mensaje: string
  origen: 'LOGIN' | 'PANEL'
  rol: string | null
  estado: 'PENDIENTE' | 'ATENDIDA'
  creadaEn: string
  respuesta: string | null
  atendidaPor: string | null
  atendidaEn: string | null
}

export interface PaginaAyuda {
  contenido: SolicitudAyuda[]
  pagina: number
  tamano: number
  totalRegistros: number
  totalPaginas: number
}

/** Pública: también sin sesión, desde el login. */
export async function enviarSolicitudAyuda(payload: SolicitudAyudaPayload): Promise<void> {
  await api.post('/ayuda/solicitar', payload)
}

export async function listarSolicitudesAyuda(estado: '' | 'PENDIENTE' | 'ATENDIDA', page: number, size = 10) {
  const { data } = await api.get<PaginaAyuda>('/admin/mesa-ayuda', { params: { ...(estado ? { estado } : {}), page, size } })
  return data
}

export async function contarPendientesAyuda(): Promise<number> {
  const { data } = await api.get<{ pendientes: number }>('/admin/mesa-ayuda/pendientes')
  return data.pendientes
}

export async function atenderSolicitudAyuda(id: number, respuesta: string): Promise<SolicitudAyuda> {
  const { data } = await api.patch<SolicitudAyuda>(`/admin/mesa-ayuda/${id}`, { respuesta: respuesta.trim() || null })
  return data
}
