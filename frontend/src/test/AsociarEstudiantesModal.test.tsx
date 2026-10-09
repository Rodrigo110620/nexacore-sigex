import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    vi.mocked(estudianteService.getFacultades).mockResolvedValue([])
    vi.mocked(estudianteService.getCarreras).mockResolvedValue([])
    vi.mocked(estudianteService.getEstudiantes).mockResolvedValue({
      contenido: [], pagina: 0, tamano: 50, totalRegistros: 0, totalPaginas: 0,
    })
  })

  it('envía los códigos pegados, confirma con un modal de éxito y cierra', async () => {
    vi.mocked(habilitacionService.asociarEstudiantesLote).mockResolvedValue({
      asociados: 2, yaAsociados: [], noEncontrados: [], estudiantes: [ana],
    })
    const { onAsociados, onClose } = renderModal()

    fireEvent.click(screen.getByRole('tab', { name: 'Códigos / CI' }))
    fireEvent.change(screen.getByLabelText('Códigos universitarios o CI'), {
      target: { value: '202600001\n 1111112, 1111113;' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Asociar (3)' }))

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Se asociaron 2 estudiantes al examen')
    expect(habilitacionService.asociarEstudiantesLote).toHaveBeenCalledWith(2, 2, ['202600001', '1111112', '1111113'])
    expect(onAsociados).toHaveBeenCalledWith([ana])
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('muestra el resumen y deja en el cuadro los que no se asociaron', async () => {
    vi.mocked(habilitacionService.asociarEstudiantesLote).mockResolvedValue({
      asociados: 1, yaAsociados: ['1111111'], noEncontrados: ['999'], estudiantes: [ana],
    })
    const { onClose } = renderModal()

    fireEvent.click(screen.getByRole('tab', { name: 'Códigos / CI' }))
    fireEvent.change(screen.getByLabelText('Códigos universitarios o CI'), {
      target: { value: '202600002 1111111 999' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Asociar (3)' }))

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
        {
          id: 2, codigoSis: '202600002', nombre: 'Luis', apellidos: 'Paz', ci: '2222222',
          carreras: [{ idCarrera: 1, nombreCarrera: 'Ingeniería de Sistemas', idFacultad: 1, nombreFacultad: 'FCyT' }],
        },
      ],
      pagina: 0, tamano: 50, totalRegistros: 2, totalPaginas: 1,
    })
    vi.mocked(habilitacionService.asociarEstudiantesLote).mockResolvedValue({
      asociados: 1, yaAsociados: [], noEncontrados: [], estudiantes: [ana],
    })
    renderModal(new Set([1]))

    const anaCheck = await screen.findByRole('checkbox', { name: 'Seleccionar a Ana Rojas' })
    expect(anaCheck).toBeDisabled()
    expect(screen.getAllByText(/Ingeniería de Sistemas/).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar a Luis Paz' }))
    expect(within(screen.getByRole('list', { name: 'Estudiantes seleccionados' })).getByText('Luis Paz (202600002)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Asociar (1)' }))

    await waitFor(() =>
      expect(habilitacionService.asociarEstudiantesLote).toHaveBeenCalledWith(2, 2, ['202600002']),
    )
  })

  it('selecciona a todos los disponibles y resume con "Ver todo" si son más de 10', async () => {
    const contenido = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1, codigoSis: `20260${String(i + 1).padStart(4, '0')}`, nombre: `Est${i + 1}`, apellidos: 'Prueba',
      ci: `90000${i + 1}`, carreras: [],
    }))
    vi.mocked(estudianteService.getEstudiantes).mockResolvedValue({
      contenido, pagina: 0, tamano: 50, totalRegistros: 12, totalPaginas: 1,
    })
    renderModal(new Set([1]))

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar todos' }))

    const resumen = screen.getByRole('list', { name: 'Estudiantes seleccionados' })
    expect(screen.getByText('Seleccionados: 11')).toBeInTheDocument()
    expect(within(resumen).getAllByRole('listitem')).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: 'Ver todo (11)' }))
    expect(within(resumen).getAllByRole('listitem')).toHaveLength(11)
    expect(screen.getByRole('button', { name: 'Asociar (11)' })).toBeInTheDocument()
  })

  it('filtra por facultad y carrera y limita la búsqueda a 40 caracteres', async () => {
    vi.mocked(estudianteService.getFacultades).mockResolvedValue([{ id: 1, nombre: 'FCyT' }])
    vi.mocked(estudianteService.getCarreras).mockResolvedValue([
      { idCarrera: 5, nombre: 'Ingeniería de Sistemas', idFacultad: 1, nombreFacultad: 'FCyT' },
    ])
    vi.mocked(estudianteService.getEstudiantes).mockResolvedValue({
      contenido: [], pagina: 0, tamano: 50, totalRegistros: 0, totalPaginas: 0,
    })
    renderModal()

    expect(await screen.findByText('No se encontraron estudiantes con ese criterio.')).toBeInTheDocument()
    const buscador = screen.getByPlaceholderText('Buscar por nombre, CI, código SIS')
    expect(buscador).toHaveAttribute('maxLength', '40')
    fireEvent.change(buscador, { target: { value: '  Juan   Pérez' } })
    expect(buscador).toHaveValue('Juan Pérez')

    fireEvent.click(await screen.findByLabelText('Facultad'))
    fireEvent.click(await screen.findByRole('option', { name: 'FCyT' }))
    fireEvent.click(screen.getByLabelText('Carrera'))
    fireEvent.click(await screen.findByRole('option', { name: 'Ingeniería de Sistemas' }))

    await waitFor(() => expect(estudianteService.getEstudiantes).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Juan Pérez', idFacultad: '1', idCarrera: '5' }),
      expect.anything(),
    ))
  })

  it('exige seleccionar al menos un estudiante antes de asociar', async () => {
    vi.mocked(estudianteService.getEstudiantes).mockResolvedValue({
      contenido: [], pagina: 0, tamano: 50, totalRegistros: 0, totalPaginas: 0,
    })
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Asociar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Selecciona al menos un estudiante para asociar.')
    expect(habilitacionService.asociarEstudiantesLote).not.toHaveBeenCalled()
  })

  it('sin conexión no asocia, avisa con un modal y conserva lo ingresado', async () => {
    const onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    renderModal()

    fireEvent.click(screen.getByRole('tab', { name: 'Códigos / CI' }))
    fireEvent.change(screen.getByLabelText('Códigos universitarios o CI'), { target: { value: '202600001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Asociar (1)' }))

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Sin conexión a Internet')
    expect(habilitacionService.asociarEstudiantesLote).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Códigos universitarios o CI')).toHaveValue('202600001')
    onLine.mockRestore()
  })

  it('pide confirmación al cerrar con la X si hay datos sin asociar', () => {
    const { onClose } = renderModal()

    fireEvent.click(screen.getByRole('tab', { name: 'Códigos / CI' }))
    fireEvent.change(screen.getByLabelText('Códigos universitarios o CI'), { target: { value: '202600001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.getByText('¿Descartar los datos?')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onClose).toHaveBeenCalled()
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

    fireEvent.click(screen.getByRole('tab', { name: 'Códigos / CI' }))
    fireEvent.change(screen.getByLabelText('Códigos universitarios o CI'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Asociar (1)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontró el examen 2')
  })
})
