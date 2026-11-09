import api from './api'

/**
 * DASH-02: un estudiante que ingresó (sesión actual), con su ingreso, su salida (V56; salidaAlCierre = no la marcó y
 * el examen terminó: es la hora de fin), su última expulsión y su último traslado.
 */
export interface IngresoReciente {
  idEstudiante: number
  nombre: string
  apellidos: string
  codigoSis: string
  fotoUrl: string | null
  fechaHoraIngreso: string
  aula: string | null
  fechaHoraSalida: string | null
  salidaAlCierre: boolean
  fechaHoraExpulsion: string | null
  motivoExpulsion: string | null
  expulsionAnulada: boolean
  fechaHoraTraslado: string | null
  traslado: string | null
}

export async function ingresosRecientes(idExamen: number, cantidad = 6, pagina = 0): Promise<{ total: number; ingresos: IngresoReciente[] }> {
  const { data } = await api.get<{ total: number; ingresos: IngresoReciente[] }>(`/examenes/${idExamen}/estudiantes/recientes`, { params: { cantidad, pagina } })
  return data
}
