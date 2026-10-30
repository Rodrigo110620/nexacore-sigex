import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExcepcionesNoHabilitadoReporte from '../components/control/ExcepcionesNoHabilitadoReporte'
import * as servicio from '../services/excepcionNoHabilitadoService'

vi.mock('../services/excepcionNoHabilitadoService', () => ({ listarExcepcionesNoHabilitado: vi.fn() }))

describe('reporte de excepciones de no habilitados (INCI-04)', () => {
  beforeEach(() => { vi.mocked(servicio.listarExcepcionesNoHabilitado).mockReset() })

  it('muestra cada excepción con su motivo, acción, aula, responsable y hora', async () => {
    vi.mocked(servicio.listarExcepcionesNoHabilitado).mockResolvedValue([{
      idExcepcion: 1, idEstudiante: 10, estudiante: 'Carla Prueba', codigoSis: '202000093',
      motivoInhabilitacion: 'Deuda en biblioteca', accionTomada: 'Se le indicó acudir a administración',
      observaciones: 'Insistió en ingresar', ambiente: 'Aula 691A', registradoPor: 'Luis Paz', fechaHora: '2026-10-27T08:05:00',
    }])
    render(<ExcepcionesNoHabilitadoReporte idExamen={20} />)

    const reporte = await screen.findByRole('region', { name: 'Excepciones de no habilitados' })
    expect(await within(reporte).findByText('Carla Prueba · SIS 202000093')).toBeInTheDocument()
    expect(within(reporte).getByText('Deuda en biblioteca')).toBeInTheDocument()
    expect(within(reporte).getByText('Se le indicó acudir a administración')).toBeInTheDocument()
    expect(within(reporte).getByText('Aula 691A')).toBeInTheDocument()
    expect(within(reporte).getByText('Luis Paz')).toBeInTheDocument()
    expect(within(reporte).getByText('27/10/2026 08:05')).toBeInTheDocument()
    expect(servicio.listarExcepcionesNoHabilitado).toHaveBeenCalledWith(20)
  })

  it('sin excepciones lo indica', async () => {
    vi.mocked(servicio.listarExcepcionesNoHabilitado).mockResolvedValue([])
    render(<ExcepcionesNoHabilitadoReporte idExamen={20} />)
    expect(await screen.findByText('No hay excepciones de no habilitados en la sesión actual.')).toBeInTheDocument()
  })
})
