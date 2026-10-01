import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AsociarEstudiantesModal from '../components/examenes/AsociarEstudiantesModal'
import * as habilitacionService from '../services/habilitacionService'
import * as estudianteService from '../services/estudianteService'

vi.mock('../services/habilitacionService')
vi.mock('../services/estudianteService')

const ana = {
  idEstudiante: 1,
  nombre: 'Ana',
  apellidos: 'Rojas',
  codigoSis: '202600001',
  ci: '1111111',
  facultad: '—',
  estadoHabilitacion: 'HABILITADO' as const,
  motivo: null,
}

function renderModal(asociados = new Set<number>()) {
  const onAsociados = vi.fn()
  const onClose = vi.fn()
  render(
    <AsociarEstudiantesModal
      idExamen={2}
      idParalelo={2}
      asociados={asociados}
      onAsociados={onAsociados}
      onClose={onClose}
    />,
  )
  return { onAsociados, onClose }
}

describe('AsociarEstudiantesModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('envía los códigos pegados y cierra si todos se asociaron', async () => {
    vi.mocked(habilitacionService.asociarEstudiantesLote).mockResolvedValue({
      asociados: 2, yaAsociados: [], noEncontrados: [], estudiantes: [ana],
    })
    const { onAsociados, onClose } = renderModal()

    fireEvent.change(screen.getByLabelText('Códigos universitarios o CI'), {
      target: { value: '202600001\n 1111112, 1111113;' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Asociar 3' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(habilitacionService.asociarEstudiantesLote).toHaveBeenCalledWith(2, 2, ['202600001', '1111112', '1111113'])
    expect(onAsociados).toHaveBeenCalledWith([ana])
  })

  it('muestra el resumen y deja en el cuadro los que no se asociaron', async () => {
    vi.mocked(habilitacionService.asociarEstudiantesLote).mockResolvedValue({
      asociados: 1, yaAsociados: ['1111111'], noEncontrados: ['999'], estudiantes: [ana],
    })
    const { onClose } = renderModal()

    fireEvent.change(screen.getByLabelText('Códigos universitarios o CI'), {
      target: { value: '202600002 1111111 999' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Asociar 3' }))

    expect(await screen.findByText('Se asoció 1 estudiante.')).toBeInTheDocument()
    expect(screen.getByText('Ya estaban asociados: 1111111')).toBeInTheDocument()
    expect(screen.getByText('No se encontraron: 999')).toBeInTheDocument()
    expect(screen.getByLabelText('Códigos universitarios o CI')).toHaveValue('1111111\n999')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('asocia los seleccionados del registro por su código SIS y bloquea a los ya asociados', async () => {
    vi.mocked(estudianteService.getEstudiantes).mockResolvedValue({
      contenido: [
        { id: 1, codigoSis: '202600001', nombre: 'Ana', apellidos: 'Rojas', ci: '1111111', carreras: [] },
        { id: 2, codigoSis: '202600002', nombre: 'Luis', apellidos: 'Paz', ci: '2222222', carreras: [] },
      ],
      pagina: 0, tamano: 8, totalRegistros: 2, totalPaginas: 1,
    })
    vi.mocked(habilitacionService.asociarEstudiantesLote).mockResolvedValue({
      asociados: 1, yaAsociados: [], noEncontrados: [], estudiantes: [ana],
    })
    renderModal(new Set([1]))

    fireEvent.click(screen.getByRole('tab', { name: 'Del registro' }))
    const [anaCheck, luisCheck] = await screen.findAllByRole('checkbox')
    expect(anaCheck).toBeDisabled()
    fireEvent.click(luisCheck)
    fireEvent.click(screen.getByRole('button', { name: 'Asociar' }))

    await waitFor(() =>
      expect(habilitacionService.asociarEstudiantesLote).toHaveBeenCalledWith(2, 2, ['202600002']),
    )
  })

  it('avisa cuando no hay inscritos pendientes', async () => {
    vi.mocked(habilitacionService.asociarInscritos).mockResolvedValue({
      asociados: 0, yaAsociados: [], noEncontrados: [], estudiantes: [],
    })
    renderModal()

    fireEvent.click(screen.getByRole('tab', { name: 'Inscritos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Asociar inscritos' }))

    expect(await screen.findByText('No hay inscritos pendientes de asociar en este paralelo.')).toBeInTheDocument()
    expect(habilitacionService.asociarInscritos).toHaveBeenCalledWith(2, 2)
  })

  it('muestra el mensaje del backend si falla', async () => {
    vi.mocked(habilitacionService.asociarEstudiantesLote).mockRejectedValue({
      response: { data: { mensaje: 'No se encontró el examen 2' } },
    })
    renderModal()

    fireEvent.change(screen.getByLabelText('Códigos universitarios o CI'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Asociar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el examen 2')
  })
})
