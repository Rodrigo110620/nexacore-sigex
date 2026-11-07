import api from './api'

/** DASH-02: un ingreso del examen (sesión actual). */
export interface IngresoReciente {
  idEstudiante: number
  nombre: string
  apellidos: string
  codigoSis: string
  fotoUrl: string | null
  fechaHoraIngreso: string
  aula: string | null
  expulsado: boolean
}

export async function ingresosRecientes(idExamen: number, cantidad = 6): Promise<{ total: number; ingresos: IngresoReciente[] }> {
  const { data } = await api.get<{ total: number; ingresos: IngresoReciente[] }>(`/examenes/${idExamen}/estudiantes/recientes`, { params: { cantidad } })
  return data
}
