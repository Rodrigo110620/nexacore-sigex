import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ReporteUsoAmbientes from '../components/reportes/ReporteUsoAmbientes'
import { reporteUsoAmbientes, type ReporteUsoAmbiente } from '../services/usoAmbientesService'

vi.mock('../services/usoAmbientesService', () => ({ reporteUsoAmbientes: vi.fn() }))

const fila = (o: Partial<ReporteUsoAmbiente>): ReporteUsoAmbiente => ({
  idExamen: 1, ambiente: '607', capacidad: 40, docente: 'Juan Pérez', materia: 'Base de Datos I', grupo: 'G1',
  fecha: '2026-11-23', horaInicio: '20:04:00', horaFin: '21:34:00', ingresos: 2, utilizado: true, estado: 'UTILIZADO', ...o,
})

describe('Uso de Ambientes', () => {
  it('muestra cada dato en su columna y no da por «sin uso» lo que aún no pasa', async () => {
    vi.mocked(reporteUsoAmbientes).mockResolvedValue([
      fila({}),
      fila({ idExamen: 2, ambiente: '692A', estado: 'PENDIENTE', utilizado: false, ingresos: 0, fecha: '2026-11-30' }),
    ])
    render(<ReporteUsoAmbientes idExamen={null} buscar="" />)
    const tabla = await screen.findByRole('table')
    const encabezados = within(tabla).getAllByRole('columnheader').map((th) => th.textContent)
    expect(encabezados).toEqual(['Ambiente', 'Materia', 'Grupo', 'Docente', 'Fecha', 'Horario', 'Ingresos', 'Estado'])
    expect(within(tabla).getAllByText('20:04 – 21:34')).toHaveLength(2)
    expect(within(tabla).getByText('Pendiente')).toBeInTheDocument()
    expect(within(tabla).queryByText('Sin uso')).not.toBeInTheDocument()
  })

  it('filtra por docente', async () => {
    vi.mocked(reporteUsoAmbientes).mockResolvedValue([fila({}), fila({ idExamen: 3, ambiente: '608', docente: 'Ana Rojas' })])
    render(<ReporteUsoAmbientes idExamen={null} buscar="" />)
    const tabla = await screen.findByRole('table')
    expect(within(tabla).getAllByRole('row')).toHaveLength(3)
    fireEvent.change(screen.getByRole('combobox', { name: 'Docente' }), { target: { value: 'Ana Rojas' } })
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2)
    expect(within(screen.getByRole('table')).getByText('608')).toBeInTheDocument()
  })
})
