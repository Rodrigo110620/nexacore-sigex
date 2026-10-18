import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { VerificarAmbienteModal } from '../components/control/VerificarAmbienteModal'
import { validarAulaActual } from '../utils/examFormUtils'
import * as service from '../services/intentoIngresoService'
import type { ContextoControlIngreso } from '../types/controlIngreso'

vi.mock('../services/intentoIngresoService')

const ctx: ContextoControlIngreso = {
  idEstudiante: 10,
  estudiante: 'Laura Paredes',
  codigoSis: '202612345',
  documento: '74839201',
  idExamen: 20,
  asignatura: 'INF-101 - Programación',
  fecha: '2026-10-15',
  horaInicio: '10:00:00',
  duracionMinutos: 120,
  ambiente: '692F',
  normasGenerales: [],
  normasParticulares: [],
  habilitado: true,
  motivoInhabilitacion: null,
  ingresoRegistrado: false,
  fechaHoraIngreso: null,
  carrera: 'Ingeniería de Sistemas',
}

function renderModal(onReportado = vi.fn()) {
  render(<VerificarAmbienteModal isOpen onClose={vi.fn()} onReportado={onReportado} ctx={ctx} usuarioNombre="Carla Control" />)
  return onReportado
}

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks() })

describe('VerificarAmbienteModal (ACCS-06)', () => {
  it('muestra el aula del examen y el usuario real, no datos de ejemplo', () => {
    renderModal()
    expect(screen.getByText('692F')).toBeInTheDocument()
    expect(screen.getByText('Carla Control')).toBeInTheDocument()
    expect(screen.queryByText(/María Zanches/)).not.toBeInTheDocument()
    expect(screen.queryByText('05/10/2026')).not.toBeInTheDocument()
  })

  it('valida el aula actual: obligatoria y distinta de la asignada', () => {
    expect(validarAulaActual('', '692F')).toMatch(/Indica el aula/)
    expect(validarAulaActual('692f', '692F')).toMatch(/misma que el aula asignada/)
    expect(validarAulaActual('691B', '692F')).toBeNull()

    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /Reportar incidencia/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('Indica el aula')
    expect(service.registrarAmbienteIncorrecto).not.toHaveBeenCalled()
  })

  it('guarda el reporte en el servidor y muestra la hora oficial', async () => {
    vi.mocked(service.registrarAmbienteIncorrecto).mockResolvedValue({
      idIntento: 9, idExamen: 20, idEstudiante: 10, estudiante: 'Laura Paredes', codigoSis: '202612345',
      identificador: '202612345', motivo: 'Ambiente incorrecto: se presentó en el aula 691B; aula asignada: 692F',
      personalControl: 'Carla Control', fechaHora: '2026-10-15T10:05:30',
    })
    const onReportado = renderModal()

    // El aula actual solo es editable tras pulsar "Editar".
    expect(screen.queryByLabelText('AULA ACTUAL')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('AULA ACTUAL'), { target: { value: '691-b' } })
    fireEvent.click(screen.getByRole('button', { name: /Reportar incidencia/ }))

    await waitFor(() => expect(screen.getByText('INCIDENCIA REGISTRADA')).toBeInTheDocument())
    expect(service.registrarAmbienteIncorrecto).toHaveBeenCalledWith({ idExamen: 20, idEstudiante: 10, aulaActual: '691B' })
    expect(onReportado).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/aula asignada: 692F/)).toBeInTheDocument()
    expect(screen.getByText(/10:05:30/)).toHaveTextContent('(hora oficial)')
  })

  it('sin conexión no registra nada y conserva el aula ingresada', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const onReportado = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByLabelText('AULA ACTUAL'), { target: { value: '691B' } })
    fireEvent.click(screen.getByRole('button', { name: /Reportar incidencia/ }))

    expect(screen.getByRole('alert')).toHaveTextContent('no hay conexión a Internet')
    expect(service.registrarAmbienteIncorrecto).not.toHaveBeenCalled()
    expect(onReportado).not.toHaveBeenCalled()
    expect(screen.getByLabelText('AULA ACTUAL')).toHaveValue('691B')
  })

  it('muestra el aula del examen como texto y solo habilita el input al pulsar Editar', () => {
    render(<VerificarAmbienteModal isOpen onClose={vi.fn()} onReportado={vi.fn()} ctx={ctx} aulaActualExamen="692F" />)

    // Texto normal con el aula del examen, sin input.
    expect(screen.getByTitle('Haz clic para editar')).toHaveTextContent('692F')
    expect(screen.queryByLabelText('AULA ACTUAL')).not.toBeInTheDocument()

    // "Editar" habilita el campo con ese mismo valor.
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByLabelText('AULA ACTUAL')).toHaveValue('692F')

    // "Listo" vuelve a dejarlo como texto.
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    expect(screen.queryByLabelText('AULA ACTUAL')).not.toBeInTheDocument()
    expect(screen.getByTitle('Haz clic para editar')).toHaveTextContent('692F')
  })
})
