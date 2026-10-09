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
  render(<EstudiantesHabilitadosTab idExamen={2} idParalelo={2} isAdmin examenResumen="Cálculo I · 12/10/2026 · 691A" />)
  await waitFor(() => expect(screen.queryByText('Cargando estudiantes...')).not.toBeInTheDocument())
}

/** La vista mobile (tarjetas) y la de escritorio (tabla) se renderizan juntas: se usa la primera. */
const primero = (elementos: HTMLElement[]) => elementos[0]

describe('EstudiantesHabilitadosTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })


  it('con varias aulas muestra el aula de cada uno y avisa si alguien no entra', async () => {
    vi.mocked(habilitacionService.obtenerRepartoAulas).mockResolvedValue({
      aulas: [
        { idAmbiente: 1, nombre: '692A', capacidad: 1, orden: 0, asignados: 1 },
        { idAmbiente: 2, nombre: '691A', capacidad: 0, orden: 1, asignados: 0 },
      ],
      sinAula: 1,
    })
    await renderTab([{ ...ana, aula: '692A' }, { ...luis, aula: null }])

    expect(await screen.findByText('Reparto por aula (orden alfabético)')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Aula' })).toBeInTheDocument()
    expect(screen.getAllByText('692A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sin aula').length).toBeGreaterThan(0)
    expect(screen.getByRole('alert')).toHaveTextContent('1 estudiante no tiene aula')
  })

  it('con una sola aula y todos ubicados no muestra la columna Aula', async () => {
    vi.mocked(habilitacionService.obtenerRepartoAulas).mockResolvedValue({
      aulas: [{ idAmbiente: 1, nombre: '692A', capacidad: null, orden: 0, asignados: 2 }],
      sinAula: 0,
    })
    await renderTab([{ ...ana, aula: '692A' }, { ...luis, aula: '692A' }])

    await waitFor(() => expect(habilitacionService.obtenerRepartoAulas).toHaveBeenCalled())
    expect(screen.queryByRole('columnheader', { name: 'Aula' })).not.toBeInTheDocument()
    expect(screen.queryByText('Reparto por aula (orden alfabético)')).not.toBeInTheDocument()
  })
  it('muestra el estado pendiente de los recién asociados', async () => {
    await renderTab()

    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Habilitado').length).toBeGreaterThan(0)
  })

  it('exige la razón al marcar como no habilitado', async () => {
    await renderTab()
    fireEvent.click(primero(screen.getAllByRole('button', { name: 'Cambiar' })))

    const dialogo = screen.getByRole('dialog', { name: 'Cambiar estado de habilitación' })
    expect(within(dialogo).getByText('20260001')).toBeInTheDocument()
    expect(within(dialogo).getByText('Cálculo I · 12/10/2026 · 691A')).toBeInTheDocument()
    // Con "Habilitado" la razón queda oculta.
    expect(within(dialogo).queryByLabelText(/Razón de inhabilitación/)).not.toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'No habilitado' }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    expect(await within(dialogo).findByText('Indica la razón por la que no está habilitado.')).toBeInTheDocument()
    expect(habilitacionService.actualizarHabilitacion).not.toHaveBeenCalled()

    vi.mocked(habilitacionService.actualizarHabilitacion).mockResolvedValue([
      { ...ana, estadoHabilitacion: 'NO_HABILITADO', motivo: 'Deuda en biblioteca' },
      luis,
    ])
    fireEvent.change(within(dialogo).getByLabelText(/Razón de inhabilitación/), { target: { value: 'Deuda en biblioteca' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(habilitacionService.actualizarHabilitacion).toHaveBeenCalledWith(2, 2, {
      idsEstudiante: [1],
      estadoHabilitacion: 'NO_HABILITADO',
      motivo: 'Deuda en biblioteca',
    }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Se registró como no habilitado al estudiante')
    expect(screen.queryByRole('dialog', { name: 'Cambiar estado de habilitación' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Deuda en biblioteca').length).toBeGreaterThan(0)
  })

  it('al escribir la razón deja solo palabras y pone mayúscula inicial', async () => {
    await renderTab()
    // Sin respuesta el componente guardaría undefined como lista y fallaría al renderizar.
    vi.mocked(habilitacionService.actualizarHabilitacion).mockResolvedValue([
      { ...ana, estadoHabilitacion: 'NO_HABILITADO', motivo: 'Deuda en biblioteca' },
      luis,
    ])
    fireEvent.click(primero(screen.getAllByRole('button', { name: 'Cambiar' })))
    const dialogo = screen.getByRole('dialog', { name: 'Cambiar estado de habilitación' })
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'No habilitado' }))
    const campo = within(dialogo).getByLabelText(/Razón de inhabilitación/)
    fireEvent.change(campo, { target: { value: '  deuda #2 en  biblioteca! ' } })

    expect(campo).toHaveValue('Deuda en biblioteca ')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(habilitacionService.actualizarHabilitacion).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.objectContaining({ motivo: 'Deuda en biblioteca' }),
    ))
  })

  it('rechaza una razón demasiado corta sin guardar', async () => {
    await renderTab()
    fireEvent.click(primero(screen.getAllByRole('button', { name: 'Cambiar' })))
    const dialogo = screen.getByRole('dialog', { name: 'Cambiar estado de habilitación' })
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'No habilitado' }))
    fireEvent.change(within(dialogo).getByLabelText(/Razón de inhabilitación/), { target: { value: 'Deuda' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    expect(await within(dialogo).findByText(/al menos 10/)).toBeInTheDocument()
    expect(habilitacionService.actualizarHabilitacion).not.toHaveBeenCalled()
  })

  it('limita la razón a 40 caracteres', async () => {
    await renderTab()
    fireEvent.click(primero(screen.getAllByRole('button', { name: 'Cambiar' })))
    const dialogo = screen.getByRole('dialog', { name: 'Cambiar estado de habilitación' })
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'No habilitado' }))

    expect(within(dialogo).getByLabelText(/Razón de inhabilitación/)).toHaveAttribute('maxLength', '40')
  })

  it('al volver a habilitar no reenvía la razón anterior', async () => {
    const rosa = estudiante(3, 'Rosa', 'NO_HABILITADO', 'Deuda en biblioteca')
    await renderTab([rosa])
    vi.mocked(habilitacionService.actualizarHabilitacion).mockResolvedValue([{ ...rosa, estadoHabilitacion: 'HABILITADO', motivo: null }])
    fireEvent.click(primero(screen.getAllByRole('button', { name: 'Cambiar' })))
    const dialogo = screen.getByRole('dialog', { name: 'Cambiar estado de habilitación' })
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Habilitado' }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(habilitacionService.actualizarHabilitacion).toHaveBeenCalledWith(2, 2, {
      idsEstudiante: [3],
      estadoHabilitacion: 'HABILITADO',
      motivo: undefined,
    }))
  })

  it('pide confirmación al cerrar con la X si hay cambios sin guardar', async () => {
    await renderTab()
    fireEvent.click(primero(screen.getAllByRole('button', { name: 'Cambiar' })))
    const dialogo = screen.getByRole('dialog', { name: 'Cambiar estado de habilitación' })
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'No habilitado' }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar' }))

    expect(screen.getByText('¿Descartar los datos?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByRole('dialog', { name: 'Cambiar estado de habilitación' })).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.queryByRole('dialog', { name: 'Cambiar estado de habilitación' })).not.toBeInTheDocument()
  })

  it('conserva el estado anterior y avisa si falla el guardado', async () => {
    await renderTab()
    vi.mocked(habilitacionService.actualizarHabilitacion).mockRejectedValue({
      response: { data: { mensaje: 'El examen está cancelado y no admite cambios de habilitación' } },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todos' }))
    fireEvent.click(screen.getByRole('button', { name: /Habilitar/ }))

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('no admite cambios de habilitación')
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
  })

  it('solo aplica la acción en bloque a los seleccionados visibles', async () => {
    await renderTab()
    vi.mocked(habilitacionService.actualizarHabilitacion).mockResolvedValue([ana, luis])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todos' }))
    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'PENDIENTE' } })
    fireEvent.click(screen.getByRole('button', { name: /Habilitar/ }))

    await waitFor(() => expect(habilitacionService.actualizarHabilitacion).toHaveBeenCalledWith(2, 2, {
      idsEstudiante: [1],
      estadoHabilitacion: 'HABILITADO',
      motivo: undefined,
    }))
  })

  it('deshabilita varios estudiantes a la vez pidiendo la razón', async () => {
    await renderTab()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todos' }))
    fireEvent.click(screen.getByRole('button', { name: /Deshabilitar/ }))

    const dialogo = screen.getByRole('dialog', { name: 'Cambiar estado de habilitación' })
    expect(within(dialogo).getByText('2 estudiantes seleccionados')).toBeInTheDocument()
    vi.mocked(habilitacionService.actualizarHabilitacion).mockResolvedValue([])
    fireEvent.change(within(dialogo).getByLabelText(/Razón de inhabilitación/), { target: { value: 'Bloqueo en el SIGA' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(habilitacionService.actualizarHabilitacion).toHaveBeenCalledWith(2, 2, {
      idsEstudiante: [1, 2],
      estadoHabilitacion: 'NO_HABILITADO',
      motivo: 'Bloqueo en el SIGA',
    }))
  })

  it('habilita en bloque a los seleccionados', async () => {
    await renderTab()
    vi.mocked(habilitacionService.actualizarHabilitacion).mockResolvedValue([{ ...ana, estadoHabilitacion: 'HABILITADO' }, luis])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar todos' }))
    fireEvent.click(screen.getByRole('button', { name: /Habilitar/ }))

    await waitFor(() => expect(habilitacionService.actualizarHabilitacion).toHaveBeenCalledWith(2, 2, {
      idsEstudiante: [1, 2],
      estadoHabilitacion: 'HABILITADO',
      motivo: undefined,
    }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Se habilitó a los 2 estudiantes')
  })
})
