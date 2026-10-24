import { describe, expect, it } from 'vitest'
import { formatoCronometro, instanteServidor, tiempoExamen } from '../utils/tiempoExamen'

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
})
