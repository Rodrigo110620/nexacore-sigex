import api from './api'

/** Panel de inicio del ADMIN (GET /inicio/admin): resumen del día y de los últimos 7 días. */
export interface InicioAdmin {
  ahora: string
  hoy: {
    examenes: number
    enCurso: number
    asociados: number
    ingresados: number
    /** Habilitados que aún no ingresan a exámenes que no empezaron. */
    porIngresar: number
    /** Habilitados que no ingresaron a exámenes ya iniciados. */
    ausentes: number
    incidencias: number
  }
  examenes: { idExamen: number; asociados: number; habilitados: number; ingresados: number }[]
  ingresosPorHora: number[]
  esperadosPorHora: number[]
  dias: { fecha: string; asociados: number; ingresados: number; ausentes: number; incidencias: number }[]
  motivos: { motivo: string; cantidad: number }[]
  pendientes: { fotos: number; qrDuplicados: number; intentosHoy: number }
}

export async function obtenerInicioAdmin(): Promise<InicioAdmin> {
  const { data } = await api.get<InicioAdmin>('/inicio/admin')
  return data
}
