import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportesPage from '../pages/panel_admin/ReportesPage'
import { listarExamenes, type ExamenDto } from '../services/examenService'
import { reporteIntentos, type IntentoReporte } from '../services/intentoIngresoService'

vi.mock('../components/layout/PanelLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../components/navigation/MobileBottomNav', () => ({ default: () => null }))
vi.mock('../hooks/useEnVivo', () => ({ default: () => undefined }))
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn() }))
vi.mock('../services/intentoIngresoService', () => ({ reporteIntentos: vi.fn() }))
vi.mock('../services/controlIngresoService', () => ({ listarRegistrosControlExamen: vi.fn().mockResolvedValue([]) }))
vi.mock('../components/control/ExpulsionesReporte', () => ({ default: ({ idExamen }: { idExamen: number }) => <p>Expulsiones del examen {idExamen}</p> }))
vi.mock('../components/control/ExcepcionesNoHabilitadoReporte', () => ({ default: ({ idExamen }: { idExamen: number }) => <p>Excepciones del examen {idExamen}</p> }))

const intento = (extra: Partial<IntentoReporte>): IntentoReporte => ({
  idIntento: 1, idExamen: 20, examen: 'Física I', fechaExamen: '2026-10-31', horaExamen: '08:30:00', idEstudiante: 10,
  estudiante: 'Zoe Quispe Luna', codigoSis: '201901234', identificador: '201901234', motivo: 'No está inscrito en la materia',
  tipo: 'NO_CORRESPONDE', personalControl: 'Luis Paz', fechaHora: '2026-10-31T08:47:10', ...extra,
})

describe('ReportesPage (DASH-06 / HU#7)', () => {
  beforeEach(() => {
    vi.mocked(listarExamenes).mockResolvedValue([
      { idExamen: 20, idParalelo: 1, asignatura: 'Física I', fecha: '2026-10-31', horaInicio: '08:30:00' },
      { idExamen: 21, idParalelo: 2, asignatura: 'Cálculo I', fecha: '2026-10-30', horaInicio: '10:00:00' },
    ] as ExamenDto[])
    vi.mocked(reporteIntentos).mockReset()
  })

  it('lista los intentos de todos los exámenes con estudiante, examen, hora, motivo y quién controló', async () => {
    vi.mocked(reporteIntentos).mockResolvedValue({ contenido: [
      intento({}),
      intento({ idIntento: 2, idExamen: 21, examen: 'Cálculo I', estudiante: null, identificador: '9999999', codigoSis: null,
        motivo: 'Ambiente incorrecto: se presentó en el aula 691B', tipo: 'AULA_INCORRECTA', fechaHora: '2026-10-30T10:02:33' }),
    ], pagina: 0, tamano: 20, totalRegistros: 2, totalPaginas: 1 })
    render(<MemoryRouter><ReportesPage /></MemoryRouter>)

    const reporte = await screen.findByRole('region', { name: 'Intentos de ingreso incorrectos' })
    const tabla = within(reporte).getByRole('table')
    expect(await within(tabla).findByText('Zoe Quispe Luna')).toBeInTheDocument()
    expect(within(tabla).getByText('Física I · 31/10/2026 08:30')).toBeInTheDocument()
    expect(within(tabla).getByText('31/10/2026 08:47:10')).toBeInTheDocument()
    expect(within(tabla).getAllByText('Luis Paz')).toHaveLength(2)
    expect(within(tabla).getByText('No identificado (9999999)')).toBeInTheDocument()
    expect(within(tabla).getByText('Aula incorrecta')).toBeInTheDocument()
    expect(within(tabla).getByText('No le corresponde')).toBeInTheDocument()
    expect(within(reporte).getByText('2 intentos')).toBeInTheDocument()
    expect(reporteIntentos).toHaveBeenCalledWith(null, 0, 20)
  })

  it('pagina los intentos con la misma paginación que las demás tablas', async () => {
    vi.mocked(reporteIntentos).mockImplementation(async (_id, pagina = 0) => ({
      contenido: [intento({ idIntento: pagina + 1, estudiante: pagina === 0 ? 'Zoe Quispe Luna' : 'Ana Rojas' })],
      pagina, tamano: 20, totalRegistros: 45, totalPaginas: 3,
    }))
    render(<MemoryRouter><ReportesPage /></MemoryRouter>)

    const paginacion = await screen.findByRole('navigation', { name: 'Paginación de intentos' })
    expect(within(paginacion).getByText(/Mostrando/)).toHaveTextContent('Mostrando 1–20 de 45 intentos')
    fireEvent.click(within(paginacion).getByRole('button', { name: 'Ir a la página 2' }))
    expect(await screen.findAllByText('Ana Rojas')).not.toHaveLength(0)
    expect(reporteIntentos).toHaveBeenLastCalledWith(null, 1, 20)
    expect(screen.getByRole('navigation', { name: 'Paginación de intentos' })).toHaveTextContent('Mostrando 21–40 de 45 intentos')
  })

  it('el filtro por examen pide solo los intentos de ese examen', async () => {
    vi.mocked(reporteIntentos).mockResolvedValue({ contenido: [], pagina: 0, tamano: 20, totalRegistros: 0, totalPaginas: 0 })
    render(<MemoryRouter><ReportesPage /></MemoryRouter>)
    await screen.findByRole('option', { name: 'Física I · 31/10/2026 · 08:30' })
    fireEvent.change(screen.getByLabelText('Examen'), { target: { value: '20' } })
    expect(await screen.findByText('No hubo intentos incorrectos en este examen.')).toBeInTheDocument()
    expect(reporteIntentos).toHaveBeenLastCalledWith(20, 0, 20)
  })

  it('las expulsiones y excepciones se ven al elegir un examen', async () => {
    vi.mocked(reporteIntentos).mockResolvedValue({ contenido: [], pagina: 0, tamano: 20, totalRegistros: 0, totalPaginas: 0 })
    render(<MemoryRouter><ReportesPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('tab', { name: 'Expulsiones' }))
    expect(screen.getByText('Elige un examen para ver sus expulsiones.')).toBeInTheDocument()
    await screen.findByRole('option', { name: 'Cálculo I · 30/10/2026 · 10:00' })
    fireEvent.change(screen.getByLabelText('Examen'), { target: { value: '21' } })
    expect(screen.getByText('Expulsiones del examen 21')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Excepciones' }))
    expect(screen.getByText('Excepciones del examen 21')).toBeInTheDocument()
  })
})
