import api from './api'

export interface OperacionAuditada {
  id: number
  fechaHora: string
  idUsuario: number
  usuario: string
  rolUsuario: string | null
  email: string
  modulo: string
  operacion: string
  accion: string
  detalle: string
  cambios: unknown
}

export interface PaginaHistorial {
  contenido: OperacionAuditada[]
  pagina: number
  tamano: number
  totalRegistros: number
  totalPaginas: number
}

export interface FiltrosHistorial {
  search: string
  modulo: string
  operacion: string
  desde: string
  hasta: string
}

const params = (f: FiltrosHistorial) => Object.fromEntries(Object.entries(f).filter(([, valor]) => valor))

export async function listarHistorial(filtros: FiltrosHistorial, page: number, size = 8) {
  const { data } = await api.get<PaginaHistorial>('/admin/historial-operaciones', {
    params: { ...params(filtros), page, size },
  })
  return data
}

export async function exportarHistorial(filtros: FiltrosHistorial) {
  const response = await api.get<Blob>('/admin/historial-operaciones/exportar.csv', {
    params: params(filtros), responseType: 'blob',
  })
  const url = URL.createObjectURL(response.data)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = 'historial-operaciones.csv'
  enlace.click()
  URL.revokeObjectURL(url)
}
