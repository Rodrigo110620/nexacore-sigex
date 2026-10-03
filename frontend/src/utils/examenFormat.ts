import type { ExamenDto } from '../services/examenService'

export function formatFecha(iso: string): string {
  const [year, month, day] = (iso ?? '').split('-')
  if (!year || !month || !day) return iso || '—'
  return `${day}/${month}/${year}`
}

export function addMinutes(horaInicio: string, duracionMinutos: number): string {
  const [hours, minutes] = (horaInicio ?? '00:00').slice(0, 5).split(':').map(Number)
  const total = (hours || 0) * 60 + (minutes || 0) + duracionMinutos
  const hh = String(Math.floor((((total % 1440) + 1440) % 1440) / 60)).padStart(2, '0')
  const mm = String(((total % 60) + 60) % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

/** YYYY-MM-DD en hora local (toISOString da la fecha UTC: en Bolivia, después de las 20:00 ya es mañana). */
export function fechaLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${String(fecha.getDate()).padStart(2, '0')}`
}

export type FaseExamen = 'en-curso' | 'proximo' | 'finalizado'

type HorarioExamen = Pick<ExamenDto, 'fecha' | 'horaInicio' | 'duracionMinutos'>

/**
 * Fase del examen respecto a `ahora` y su texto en el panel de CONTROL: "Comienza en N min" (menos de 60),
 * "Comienza en N horas" (horas completas), "En curso", "Finalizado" o "Programado" si es de otro día futuro.
 */
export function estadoDelExamen(examen: HorarioExamen, ahora: Date): { fase: FaseExamen; texto: string } {
  const hoy = fechaLocal(ahora)
  if (examen.fecha > hoy) return { fase: 'proximo', texto: 'Programado' }
  const [horas, minutos] = horaCorta(examen.horaInicio).split(':').map(Number)
  const faltan = horas * 60 + minutos - (ahora.getHours() * 60 + ahora.getMinutes())
  if (examen.fecha < hoy || faltan + examen.duracionMinutos <= 0) return { fase: 'finalizado', texto: 'Finalizado' }
  if (faltan <= 0) return { fase: 'en-curso', texto: 'En curso' }
  if (faltan < 60) return { fase: 'proximo', texto: `Comienza en ${faltan} min` }
  const enHoras = Math.floor(faltan / 60)
  return { fase: 'proximo', texto: `Comienza en ${enHoras} ${enHoras === 1 ? 'hora' : 'horas'}` }
}

/** El examen es de la fecha de `ahora` y la hora actual está entre su inicio y su fin. */
export function estaEnCurso(examen: HorarioExamen, ahora: Date): boolean {
  return estadoDelExamen(examen, ahora).fase === 'en-curso'
}

export function horaCorta(horaInicio: string): string {
  return (horaInicio ?? '').slice(0, 5) || '—'
}

export function estadoLabel(estado: string): string {
  if (!estado) return 'Programado'
  return estado.charAt(0).toUpperCase() + estado.slice(1)
}

export function codigoExamen(examen: Pick<ExamenDto, 'idExamen' | 'fecha'>): string {
  const year = (examen.fecha ?? '').slice(0, 4) || '----'
  return `EX-${year}-${String(examen.idExamen).padStart(2, '0')}`
}

export function semanaDelAnio(iso: string): number | null {
  const [year, month, day] = (iso ?? '').split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function initialsOfName(nombre: string): string {
  const words = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '—'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase()
}
