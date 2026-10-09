import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EstudianteNoVinculadoModal from '../components/control/EstudianteNoVinculadoModal'
import * as service from '../services/intentoIngresoService'
import type { EstudianteIdentificado } from '../services/identificacionService'

vi.mock('../services/intentoIngresoService')

const estudiante: EstudianteIdentificado = {
  idEstudiante: 23,
  nombre: 'Ana',
  apellidos: 'Pérez',
  codigoSis: '202600001',
  ci: '74839201',
  carrera: 'Ingeniería',
  fotoUrl: null,
  estado: 'NO_VINCULADO',
}

describe('EstudianteNoVinculadoModal (ACCS-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(service.listarIntentosIngreso).mockResolvedValue([])
  })

  it('consulta y muestra el historial de intentos del estudiante en este examen', async () => {
    vi.mocked(service.listarIntentosIngreso).mockResolvedValue([{
      idIntento: 4, idExamen: 7, idEstudiante: 23, estudiante: 'Ana Pérez',
      codigoSis: estudiante.codigoSis, identificador: estudiante.codigoSis,
      motivo: 'Intento previo', personalControl: 'Carla Control', fechaHora: '2026-10-08T14:00:00Z',
    }])

    render(<EstudianteNoVinculadoModal estudiante={estudiante} idExamen={7} onCerrar={vi.fn()} />)

    expect(await screen.findByText(/Intento previo · /)).toBeInTheDocument()
    expect(service.listarIntentosIngreso).toHaveBeenCalledWith(7, 23)
  })

  it('registra el intento, usa el código SIS y confirma el resultado', async () => {
    vi.mocked(service.registrarIntentoIngreso).mockResolvedValue()
    const onCerrar = vi.fn()
    render(<EstudianteNoVinculadoModal estudiante={estudiante} idExamen={7} onCerrar={onCerrar} />)
    fireEvent.click(screen.getByRole('button', { name: /registrar intento/i }))

    await waitFor(() => expect(service.registrarIntentoIngreso).toHaveBeenCalledWith({
      idExamen: 7,
      idEstudiante: 23,
      identificador: '202600001',
      motivo: 'Intentó ingresar a un examen que no le corresponde.',
    }))
    expect(await screen.findByText('Intento registrado correctamente')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a identificar estudiante' }))
    expect(onCerrar).toHaveBeenCalledOnce()
  })

  it('muestra el error del servicio y permite reintentar', async () => {
    vi.mocked(service.registrarIntentoIngreso)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce()
    render(<EstudianteNoVinculadoModal estudiante={estudiante} idExamen={7} onCerrar={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /registrar intento/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('No se pudo registrar el intento')
    fireEvent.click(screen.getByRole('button', { name: /registrar intento/i }))
    expect(await screen.findByText('Intento registrado correctamente')).toBeInTheDocument()
    expect(service.registrarIntentoIngreso).toHaveBeenCalledTimes(2)
  })
})
