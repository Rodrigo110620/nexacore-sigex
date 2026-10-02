import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EstudiantesHabilitadosTab from '../components/examenes/EstudiantesHabilitadosTab'
import * as habilitacionService from '../services/habilitacionService'
import type { EstudianteHabilitacionDto } from '../services/habilitacionService'

vi.mock('../services/habilitacionService')

const estudiante = (
  idEstudiante: number,
  nombre: string,
  estadoHabilitacion: EstudianteHabilitacionDto['estadoHabilitacion'],
  motivo: string | null = null,
): EstudianteHabilitacionDto => ({
  idEstudiante,
  nombre,
  apellidos: 'Prueba',
  codigoSis: `2026000${idEstudiante}`,
  ci: `111111${idEstudiante}`,
  facultad: '—',
  estadoHabilitacion,
  motivo,
})

const ana = estudiante(1, 'Ana', 'PENDIENTE')
const luis = estudiante(2, 'Luis', 'HABILITADO', 'Matrícula regular confirmada')

async function renderTab(lista = [ana, luis]) {
  vi.mocked(habilitacionService.listarEstudiantesExamen).mockResolvedValue(lista)
  render(<EstudiantesHabilitadosTab idExamen={2} idParalelo={2} isAdmin />)
  await waitFor(() => expect(screen.queryByText('Cargando estudiantes...')).not.toBeInTheDocument())
}

/** La vista mobile (tarjetas) y la de escritorio (tabla) se renderizan juntas: se usa la primera. */
const primero = (elementos: HTMLElement[]) => elementos[0]

describe('EstudiantesHabilitadosTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('muestra el estado pendiente de los recién asociados', async () => {
    await renderTab()

    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Habilitado').length).toBeGreaterThan(0)
  })

  it('exige la razón al marcar como no habilitado', async () => {
    await renderTab()
    fireEvent.click(primero(screen.getAllByRole('button', { name: 'Cambiar' })))

    const dialogo = screen.getByRole('heading', { name: 'Cambiar habilitación' }).closest('form') as HTMLFormElement
    fireEvent.change(within(dialogo).getByLabelText('Estado'), { target: { value: 'NO_HABILITADO' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    expect(await within(dialogo).findByText('Indica la razón por la que no está habilitado.')).toBeInTheDocument()
    expect(habilitacionService.actualizarHabilitacion).not.toHaveBeenCalled()

    vi.mocked(habilitacionService.actualizarHabilitacion).mockResolvedValue([
      { ...ana, estadoHabilitacion: 'NO_HABILITADO', motivo: 'Deuda en biblioteca' },
      luis,
    ])
    fireEvent.change(within(dialogo).getByLabelText(/Razón de inhabilitación/), { target: { value: ' Deuda en biblioteca ' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(habilitacionService.actualizarHabilitacion).toHaveBeenCalledWith(2, 2, {
      idsEstudiante: [1],
      estadoHabilitacion: 'NO_HABILITADO',
      motivo: 'Deuda en biblioteca',
    }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Cambiar habilitación' })).not.toBeInTheDocument())
    expect(screen.getAllByText('Deuda en biblioteca').length).toBeGreaterThan(0)
  })

  it('deshabilita varios estudiantes a la vez pidiendo la razón', async () => {
    await renderTab()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todos' }))
    fireEvent.click(screen.getByRole('button', { name: /Deshabilitar/ }))

    const dialogo = screen.getByRole('heading', { name: 'Cambiar habilitación' }).closest('form') as HTMLFormElement
    expect(within(dialogo).getByText('2 estudiantes seleccionados')).toBeInTheDocument()
    vi.mocked(habilitacionService.actualizarHabilitacion).mockResolvedValue([])
    fireEvent.change(within(dialogo).getByLabelText(/Razón de inhabilitación/), { target: { value: 'Bloqueo SIGA' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(habilitacionService.actualizarHabilitacion).toHaveBeenCalledWith(2, 2, {
      idsEstudiante: [1, 2],
      estadoHabilitacion: 'NO_HABILITADO',
      motivo: 'Bloqueo SIGA',
    }))
  })

  it('habilita en bloque a los seleccionados', async () => {
    await renderTab()
    vi.mocked(habilitacionService.actualizarHabilitacion).mockResolvedValue([{ ...ana, estadoHabilitacion: 'HABILITADO' }, luis])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todos' }))
    fireEvent.click(screen.getByRole('button', { name: /Habilitar/ }))

    await waitFor(() => expect(habilitacionService.actualizarHabilitacion).toHaveBeenCalledWith(2, 2, expect.objectContaining({
      idsEstudiante: [1, 2],
      estadoHabilitacion: 'HABILITADO',
    })))
  })
})
