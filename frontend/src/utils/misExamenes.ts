import type { MiExamen } from '../services/panelEstudianteService'
import { offsetServidorMinutos } from '../services/tiempoService'
import { instanteServidor } from './tiempoExamen'

/**
 * Inicio y fin del examen. La fecha y la hora vienen sin zona, en la hora del servidor (Bolivia): se
 * interpretan en esa zona y no en la del dispositivo, igual que el cronómetro.
 */
export function rangoExamen(e: Pick<MiExamen, 'fecha' | 'horaInicio' | 'duracionMinutos'>) {
  const inicio = new Date(instanteServidor(e.fecha, e.horaInicio, offsetServidorMinutos()))
  const fin = new Date(inicio.getTime() + e.duracionMinutos * 60_000)
  return { inicio, fin }
}

/** Próximos (aún no terminan) del más cercano al más lejano; pasados del más reciente al más antiguo. */
export function separarExamenes(examenes: MiExamen[], ahora = new Date()) {
  const proximos = examenes
    .filter((e) => rangoExamen(e).fin >= ahora)
    .sort((a, b) => rangoExamen(a).inicio.getTime() - rangoExamen(b).inicio.getTime())
  const pasados = examenes
    .filter((e) => rangoExamen(e).fin < ahora)
    .sort((a, b) => rangoExamen(b).inicio.getTime() - rangoExamen(a).inicio.getTime())
  return { proximos, pasados, proximo: proximos[0] ?? null }
}

const hora = (d: Date) =>
  d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' })

/** "Martes 20 de octubre de 2026". */
export function fechaLarga(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00`)
  const texto = d.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** "08:00 – 10:00". */
export function horario(e: Pick<MiExamen, 'fecha' | 'horaInicio' | 'duracionMinutos'>): string {
  const { inicio, fin } = rangoExamen(e)
  return `${hora(inicio)} – ${hora(fin)}`
}

export type EstadoExamen = 'HABILITADO' | 'PENDIENTE' | 'NO_HABILITADO' | 'INGRESO' | 'DENEGADO' | 'NO_SE_PRESENTO'

/** Estado que se muestra del examen: la habilitación si es próximo; el resultado del ingreso si ya pasó. */
export function estadoExamen(e: MiExamen, pasado: boolean): EstadoExamen {
  if (pasado) {
    if (e.resultadoIngreso === 'AUTORIZADO') return 'INGRESO'
    if (e.resultadoIngreso === 'DENEGADO') return 'DENEGADO'
    return e.habilitado === false ? 'NO_HABILITADO' : 'NO_SE_PRESENTO'
  }
  if (e.habilitado === true) return 'HABILITADO'
  if (e.habilitado === false) return 'NO_HABILITADO'
  return 'PENDIENTE'
}
