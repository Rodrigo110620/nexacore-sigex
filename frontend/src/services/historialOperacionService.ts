import api from './api'
import { obtenerArchivo } from './descargas'

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
  /** Resumen legible de lo que se hizo. */
  detalle: string
  /** A qué afectó: «Base de Datos I · G2», «Rol AUXILIAR», el nombre del usuario… */
  objetivo: string | null
  motivo: string | null
  /** Cambios campo por campo, ya con nombres: antes null = agregado; despues null = quitado. */
  diferencias: { campo: string; antes: string | null; despues: string | null }[]
  /** Del examen al que se refiere: Fecha, Horario (inicio – fin), Aula, Docente, Estado. Vacío si no es de un examen. */
  examen: { campo: string; valor: string }[]
  /** JSON original de la auditoría. */
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
  /** «Realizado por»: id del usuario ('' = todos). */
  usuario?: string
  /** Solo en la descarga: grupo de operaciones, docente (sus exámenes) y examen. */
  tipo?: string
  docente?: string
  examen?: string
}

export interface AutorHistorial { idUsuario: number; nombre: string; roles: string | null }

/** Quienes realizaron operaciones, para el filtro «Realizado por». */
export async function listarAutores() {
  const { data } = await api.get<AutorHistorial[]>('/admin/historial-operaciones/usuarios')
  return data
}

const params = (f: FiltrosHistorial) => Object.fromEntries(Object.entries(f).filter(([, valor]) => valor))

export async function listarHistorial(filtros: FiltrosHistorial, page: number, size = 8) {
  const { data } = await api.get<PaginaHistorial>('/admin/historial-operaciones', {
    params: { ...params(filtros), page, size },
  })
  return data
}

/** El historial filtrado en el formato pedido (para la vista previa de descarga, como el resto de exportaciones). */
export function obtenerHistorial(filtros: FiltrosHistorial, formato: 'pdf' | 'csv') {
  return obtenerArchivo(`/admin/historial-operaciones/exportar.${formato}`, params(filtros), `historial-operaciones.${formato}`)
}
