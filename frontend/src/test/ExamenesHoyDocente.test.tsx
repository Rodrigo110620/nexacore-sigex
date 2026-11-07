import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ExamenesHoyDocente from '../components/inicio/ExamenesHoyDocente'
import { obtenerResumenExamen } from '../services/controlExamenService'
import { emitirCambioLocal } from '../services/notificacionService'
import type { ExamenDto } from '../services/examenService'

vi.mock('../services/controlExamenService', () => ({ obtenerResumenExamen: vi.fn() }))

const examen = (idExamen: number, asignatura: string, fecha: string, horaInicio: string, ambienteNombre = '607') =>
  ({ idExamen, idParalelo: 1, asignatura, docente: 'Juan Pérez', fecha, horaInicio, duracionMinutos: 120, idAmbiente: 1,
    ambienteNombre, estado: 'programado', normasGenerales: [], normasParticulares: [] }) as ExamenDto

const montar = (examenes: ExamenDto[]) => render(<MemoryRouter><ExamenesHoyDocente examenes={examenes} /></MemoryRouter>)
const fila = (asignatura: string) => screen.getByRole('listitem', { name: `Examen de hoy: ${asignatura}` })

describe('DASH-01: contadores en vivo en el inicio del docente', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 10, 6, 14, 30))
    vi.mocked(obtenerResumenExamen).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('muestra habilitados, ingresados y ausentes; el expulsado cuenta como ingresado y el trasladado una sola vez', async () => {
    vi.mocked(obtenerResumenExamen).mockImplementation(async (id) => id === 1
      ? { total: 4, habilitados: 3, noHabilitados: 1, ingresados: 2, expulsados: 1, trasladados: 1 }
      : { total: 40, habilitados: 40, noHabilitados: 0, ingresados: 0 })
    montar([examen(1, 'Programación Web', '2026-11-06', '14:00:00'), examen(2, 'Taller de Programación', '2026-11-06', '18:30:00', 'Laboratorio 2'),
      examen(3, 'Cálculo I', '2026-11-07', '08:00:00')])

    const web = await screen.findByRole('listitem', { name: 'Examen de hoy: Programación Web' })
    expect(within(web).getByText('EN CURSO')).toBeInTheDocument()
    expect(within(web).getByText('Aula 607')).toBeInTheDocument()
    expect(await within(web).findByText('1 expulsado: cuentan como ingresados. 1 trasladado de aula: cuentan en su aula nueva.')).toBeInTheDocument()
    expect(within(web).getByLabelText('Contadores de Programación Web')).toHaveTextContent('3habilitados2ingresados1ausentes')
    expect(within(web).getByRole('link', { name: /Ver el control del examen/ })).toHaveAttribute('href', '/dashboard/control/1')

    // Antes de iniciar: 0 ingresados y todos los habilitados ausentes.
    const taller = fila('Taller de Programación')
    expect(within(taller).getByText('PRÓXIMO')).toBeInTheDocument()
    expect(await within(taller).findByLabelText('Contadores de Taller de Programación')).toHaveTextContent('40habilitados0ingresados40ausentes')
    // Solo los de hoy.
    expect(screen.queryByText('Cálculo I')).not.toBeInTheDocument()
  })

  it('cuando un estudiante ingresa, los contadores cambian sin recargar', async () => {
    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 3, habilitados: 3, noHabilitados: 0, ingresados: 1 })
    montar([examen(1, 'Programación Web', '2026-11-06', '14:00:00')])
    expect(await screen.findByLabelText('Contadores de Programación Web')).toHaveTextContent('1ingresados2ausentes')

    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 3, habilitados: 3, noHabilitados: 0, ingresados: 2 })
    act(() => emitirCambioLocal({ tipo: 'INGRESO', idExamen: 1, idEstudiante: 7 }))
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(screen.getByLabelText('Contadores de Programación Web')).toHaveTextContent('2ingresados1ausentes')
    expect(screen.getByText('En vivo')).toBeInTheDocument()
  })

  it('sin exámenes hoy muestra el próximo', () => {
    montar([examen(3, 'Cálculo I', '2026-11-09', '08:00:00')])
    expect(screen.getByText(/No tienes exámenes hoy/)).toHaveTextContent('Tu próximo examen: Cálculo I · 09/11/2026 · 08:00.')
    expect(obtenerResumenExamen).not.toHaveBeenCalled()
  })

  it('si no se pueden cargar los contadores, se puede reintentar', async () => {
    vi.mocked(obtenerResumenExamen).mockRejectedValueOnce(new Error('caído')).mockResolvedValue({ total: 2, habilitados: 2, noHabilitados: 0, ingresados: 1 })
    montar([examen(1, 'Programación Web', '2026-11-06', '14:00:00')])
    const reintentar = await screen.findByRole('button', { name: 'Reintentar' })
    act(() => reintentar.click())
    expect(await screen.findByLabelText('Contadores de Programación Web')).toHaveTextContent('1ingresados1ausentes')
  }, 10_000)
})
