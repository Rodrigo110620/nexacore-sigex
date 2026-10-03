import { describe, expect, it } from 'vitest'
import { estadoDelExamen } from '../utils/examenFormat'

const ahora = new Date(2026, 9, 15, 10, 30) // 15/10/2026, 10:30 hora local
const examen = (fecha: string, horaInicio: string) => ({ fecha, horaInicio, duracionMinutos: 120 })

describe('estadoDelExamen', () => {
  it.each([
    ['faltan menos de 60 min', examen('2026-10-15', '11:15:00'), 'proximo', 'Comienza en 45 min'],
    ['falta 1 hora justa', examen('2026-10-15', '11:30:00'), 'proximo', 'Comienza en 1 hora'],
    ['cuenta solo horas completas', examen('2026-10-15', '14:29:00'), 'proximo', 'Comienza en 3 horas'],
    ['en curso desde su inicio', examen('2026-10-15', '10:30:00'), 'en-curso', 'En curso'],
    ['en curso hasta el minuto antes de terminar', examen('2026-10-15', '08:31:00'), 'en-curso', 'En curso'],
    ['finalizado al llegar a su fin', examen('2026-10-15', '08:30:00'), 'finalizado', 'Finalizado'],
    ['finalizado si es de un día pasado', examen('2026-10-14', '14:00:00'), 'finalizado', 'Finalizado'],
    ['programado si es de otro día futuro', examen('2026-10-16', '08:00:00'), 'proximo', 'Programado'],
  ])('%s', (_caso, datos, fase, texto) => {
    expect(estadoDelExamen(datos, ahora)).toEqual({ fase, texto })
  })
})
