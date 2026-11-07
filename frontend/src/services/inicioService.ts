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

/** Inicio de CONTROL (GET /inicio/control): solo lo que registró hoy quien inició sesión. */
export interface InicioControl {
  ahora: string
  ingresos: number
  ingresosManuales: number
  intentosIncorrectos: number
  fotosReportadas: number
  qrDuplicados: number
  expulsiones: number
  ingresosPorHora: number[]
  intentosPorHora: number[]
  fotosPorHora: number[]
  qrPorHora: number[]
  recientes: { fecha: string; tipo: 'INGRESO' | 'INGRESO_MANUAL' | 'INTENTO' | 'FOTO_REPORTADA' | 'QR_DUPLICADO' | 'EXPULSION'
    estudiante: string | null; codigo: string | null; examen: string | null }[]
}

export async function obtenerInicioControl(): Promise<InicioControl> {
  const { data } = await api.get<InicioControl>('/inicio/control')
  return data
}

/** Panel del DOCENTE (GET /inicio/docente): sus materias, totales, series de hoy y últimos registros. */
export interface InicioDocente {
  ahora: string
  materias: {
    idMateria: number
    sigla: string
    nombre: string
    grupos: string[]
    estudiantes: number
    proximoExamen: { idExamen: number; fecha: string; horaInicio: string; duracionMinutos: number } | null
    /** % de asistencia de sus exámenes ya realizados; null si aún no tuvo ninguno. */
    asistencia: number | null
  }[]
  grupos: number
  estudiantes: number
  expulsionesHoy: number
  ingresosPorHora: number[]
  expulsionesPorHora: number[]
  recientes: { fecha: string; tipo: 'INGRESO' | 'EXPULSION' | 'INTENTO'; estudiante: string | null; materia: string | null; detalle: string | null }[]
}

export async function obtenerInicioDocente(): Promise<InicioDocente> {
  const { data } = await api.get<InicioDocente>('/inicio/docente')
  return data
}

