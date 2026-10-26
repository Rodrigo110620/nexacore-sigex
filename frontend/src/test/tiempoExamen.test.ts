import { describe, expect, it } from 'vitest'
import { formatoCronometro, instanteServidor, ordenarPorFase, tiempoExamen, aperturaControl, controlSinAbrir, type TiempoExamen } from '../utils/tiempoExamen'

const BOLIVIA = -240
const examen = { fecha: '2026-10-24', horaInicio: '08:00:00', duracionMinutos: 90 }
const a = (hora: string) => instanteServidor('2026-10-24', hora, BOLIVIA)

describe('tiempoExamen', () => {
  it('usa la hora de Bolivia sin importar la zona del dispositivo', () => {
    expect(new Date(a('08:00')).toISOString()).toBe('2026-10-24T12:00:00.000Z')
  })

  it('pasa de programado a en curso y a finalizado según la hora', () => {
    expect(tiempoExamen(examen, a('07:47:30'), BOLIVIA)).toMatchObject({ fase: 'programado', restanteMs: 12.5 * 60_000 })
    const enCurso = tiempoExamen(examen, a('08:45'), BOLIVIA)
    expect(enCurso.fase).toBe('en_curso')
    expect(enCurso.restanteMs).toBe(45 * 60_000)
    expect(enCurso.progreso).toBeCloseTo(0.5)
    expect(tiempoExamen(examen, a('09:30'), BOLIVIA).fase).toBe('finalizado')
  })

  it('un examen cancelado sigue cancelado', () => {
    expect(tiempoExamen({ ...examen, estado: 'cancelado' }, a('08:30'), BOLIVIA).fase).toBe('cancelado')
  })

  it('formatea el cronómetro', () => {
    expect(formatoCronometro(3_725_000)).toBe('01:02:05')
    expect(formatoCronometro((2 * 86_400 + 5) * 1000)).toBe('2 d 00:00:05')
    expect(formatoCronometro(-5)).toBe('00:00:00')
  })

  it('ordena lo activo primero: en curso, próximos, finalizados y cancelados al final', () => {
    const ex = (nombre: string, fecha: string, hora: string, estado = 'programado') =>
      ({ nombre, fecha, horaInicio: hora, duracionMinutos: 90, estado })
    const lista = [
      ex('finalizado de ayer', '2026-10-23', '08:00:00'),
      ex('cancelado', '2026-10-24', '09:00:00', 'cancelado'),
      ex('próximo lejano', '2026-10-30', '08:00:00'),
      ex('finalizado de hoy', '2026-10-24', '06:00:00'),
      ex('en curso', '2026-10-24', '08:00:00'),
      ex('próximo de hoy', '2026-10-24', '11:00:00'),
    ]
    expect(ordenarPorFase(lista, a('08:30'), BOLIVIA).map((e) => e.nombre)).toEqual([
      'en curso', 'próximo de hoy', 'próximo lejano', 'finalizado de hoy', 'finalizado de ayer', 'cancelado',
    ])
  })
})

describe('apertura del control de ingreso', () => {
  it('abre 15 minutos antes del inicio, también si cruza la medianoche', () => {
    expect(aperturaControl('2026-10-27', '08:00:00')).toEqual({ fecha: '27/10/2026', hora: '07:45' })
    expect(aperturaControl('2026-10-27', '00:10:00')).toEqual({ fecha: '26/10/2026', hora: '23:55' })
  })

  it('está cerrado si falta más de 15 minutos y abierto desde ahí', () => {
    const programado = (min: number): TiempoExamen => ({ fase: 'programado', inicioMs: 0, finMs: 0, restanteMs: min * 60_000, progreso: 0 })
    expect(controlSinAbrir(programado(60))).toBe(true)
    expect(controlSinAbrir(programado(15))).toBe(false)
    expect(controlSinAbrir(programado(5))).toBe(false)
    expect(controlSinAbrir({ fase: 'en_curso', inicioMs: 0, finMs: 0, restanteMs: 10, progreso: 0.5 })).toBe(false)
    expect(controlSinAbrir(null)).toBe(false)
  })
})
