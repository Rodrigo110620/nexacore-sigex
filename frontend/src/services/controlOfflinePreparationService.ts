import api from './api'
import type { PageResponse } from '../types/userApi'
import type { ContextoControlIngreso, TipoIncidencia } from '../types/controlIngreso'
import type { EstudianteAsignado } from './controlExamenService'
import {
  guardarContextoControl,
  guardarEstudianteControl,
  guardarTiposIncidencia,
} from './controlOfflineService'

const TAMANO_PAGINA = 100
const CONCURRENCIA_CONTEXTOS = 8

export interface PreparacionOfflineResultado {
  estudiantes: number
  contextos: number
}

/** Descarga la información operativa del examen antes de una posible pérdida de conexión. */
export async function prepararExamenSinConexion(idExamen: number): Promise<PreparacionOfflineResultado> {
  const estudiantes: EstudianteAsignado[] = []
  let pagina = 0
  while (true) {
    const { data } = await api.get<PageResponse<EstudianteAsignado>>(`/examenes/${idExamen}/estudiantes`, {
      params: { estado: 'TODOS', page: pagina, size: TAMANO_PAGINA },
    })
    estudiantes.push(...data.contenido)
    pagina += 1
    if (pagina >= data.totalPaginas) break
  }

  estudiantes.forEach((estudiante) => guardarEstudianteControl(idExamen, {
    idEstudiante: estudiante.idEstudiante,
    nombre: estudiante.nombre,
    apellidos: estudiante.apellidos,
    codigoSis: estudiante.codigoSis,
    ci: estudiante.ci,
    carrera: estudiante.carrera,
    fotoUrl: estudiante.fotoUrl ?? null,
    estado: estudiante.estado,
    motivoInhabilitacion: estudiante.motivoInhabilitacion,
  }))

  const { data: tipos } = await api.get<TipoIncidencia[]>('/control-ingresos/tipos-incidencia')
  guardarTiposIncidencia(tipos)

  let contextos = 0
  for (let inicio = 0; inicio < estudiantes.length; inicio += CONCURRENCIA_CONTEXTOS) {
    const lote = estudiantes.slice(inicio, inicio + CONCURRENCIA_CONTEXTOS)
    const resultados = await Promise.all(lote.map(async (estudiante) => {
      const { data } = await api.get<ContextoControlIngreso>(`/control-ingresos/${estudiante.idEstudiante}/${idExamen}/contexto`)
      guardarContextoControl(data)
      return data
    }))
    contextos += resultados.length
  }

  return { estudiantes: estudiantes.length, contextos }
}
