/**
 * Estado y cronómetro del examen según la hora del servidor. Igual que el backend (EstadoExamen):
 * programado antes del inicio, en curso hasta el fin (inicio + duración), luego finalizado.
 * Las fechas se interpretan en la zona del servidor, no en la del dispositivo.
 */
export type FaseExamen = 'programado' | 'en_curso' | 'finalizado' | 'cancelado'

export interface HorarioExamen {
  fecha: string
  horaInicio: string
  duracionMinutos: number
  estado?: string | null
}

export interface TiempoExamen {
  fase: FaseExamen
  inicioMs: number
  finMs: number
  /** Hasta el inicio (programado) o hasta el fin (en curso); 0 si ya terminó. */
  restanteMs: number
  /** Avance de 0 a 1 mientras está en curso. */
  progreso: number
}

/** Fecha "2026-10-24" y hora "08:00[:00]" de la zona del servidor → instante en milisegundos. */
export function instanteServidor(fecha: string, hora: string, offsetMinutos: number): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const [h, m, s] = (hora ?? '00:00').split(':').map(Number)
  return Date.UTC(anio, mes - 1, dia, h || 0, m || 0, s || 0) - offsetMinutos * 60_000
}

export function tiempoExamen(examen: HorarioExamen, ahoraMs: number, offsetMinutos: number): TiempoExamen {
  const inicioMs = instanteServidor(examen.fecha, examen.horaInicio, offsetMinutos)
  const finMs = inicioMs + (examen.duracionMinutos || 0) * 60_000
  const guardado = (examen.estado ?? '').toLowerCase()
  if (guardado === 'cancelado' || guardado === 'finalizado') {
    return { fase: guardado, inicioMs, finMs, restanteMs: 0, progreso: guardado === 'finalizado' ? 1 : 0 }
  }
  if (ahoraMs >= finMs) return { fase: 'finalizado', inicioMs, finMs, restanteMs: 0, progreso: 1 }
  if (ahoraMs < inicioMs) return { fase: 'programado', inicioMs, finMs, restanteMs: inicioMs - ahoraMs, progreso: 0 }
  return {
    fase: 'en_curso',
    inicioMs,
    finMs,
    restanteMs: finMs - ahoraMs,
    progreso: Math.min(1, (ahoraMs - inicioMs) / Math.max(1, finMs - inicioMs)),
  }
}

/** 4 d 03:05:09 · 03:05:09 */
export function formatoCronometro(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const dias = Math.floor(total / 86_400)
  const dos = (n: number) => String(n).padStart(2, '0')
  const hms = `${dos(Math.floor((total % 86_400) / 3600))}:${dos(Math.floor((total % 3600) / 60))}:${dos(total % 60)}`
  return dias > 0 ? `${dias} d ${hms}` : hms
}

export const ETIQUETA_FASE: Record<FaseExamen, string> = {
  programado: 'Programado',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}
