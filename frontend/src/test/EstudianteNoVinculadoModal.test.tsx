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

  it('evita un segundo envío mientras el primer registro sigue en curso', async () => {
    let resolverRegistro: (() => void) | undefined
    vi.mocked(service.registrarIntentoIngreso).mockImplementation(() => new Promise<void>((resolve) => {
      resolverRegistro = resolve
    }))
    render(<EstudianteNoVinculadoModal estudiante={estudiante} idExamen={7} onCerrar={vi.fn()} />)

    const boton = screen.getByRole('button', { name: /registrar intento/i })
    fireEvent.click(boton)
    fireEvent.click(boton)

    expect(service.registrarIntentoIngreso).toHaveBeenCalledOnce()
    resolverRegistro?.()
    expect(await screen.findByText('Intento registrado correctamente')).toBeInTheDocument()
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

it('BUG 9: limita el pegado, muestra el error debajo del motivo e impide enviarlo', () => {
  render(<EstudianteNoVinculadoModal estudiante={estudiante} idExamen={7} onCerrar={vi.fn()} />)
  const campo = screen.getByLabelText('Motivo del intento')
  fireEvent.change(campo, { target: { value: 'R'.repeat(100) } })
  expect(campo).toHaveValue('R'.repeat(65))
  expect(campo).toHaveAttribute('maxLength', '65')
  expect(screen.getByText('65/65 caracteres. Mínimo 10.')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('inconsistente')
  expect(screen.getByRole('button', { name: 'Registrar intento' })).toBeDisabled()
})
it('BUG 9: confirma antes de perder datos y permite continuar editando', () => {
  const cerrar = vi.fn()
  render(<EstudianteNoVinculadoModal estudiante={estudiante} idExamen={7} onCerrar={cerrar} />)
  fireEvent.change(screen.getByLabelText('Motivo del intento'), { target: { value: 'Examen equivocado' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
  expect(screen.getByText('¿Descartar los datos?')).toBeInTheDocument()
  expect(cerrar).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
  expect(screen.getByLabelText('Motivo del intento')).toHaveValue('Examen equivocado')
  fireEvent.keyDown(document, { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
  expect(cerrar).toHaveBeenCalledOnce()
})
it('BUG 9: sin conexión conserva el motivo y muestra el mensaje solicitado', async () => {
  vi.mocked(service.registrarIntentoIngreso).mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }))
  render(<EstudianteNoVinculadoModal estudiante={estudiante} idExamen={7} onCerrar={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Motivo del intento'), { target: { value: 'INTENTÓ INGRESAR; EXAMEN EQUIVOCADO.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Registrar intento' }))
  expect(await screen.findByRole('status')).toHaveTextContent('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.')
  expect(screen.getByLabelText('Motivo del intento')).toHaveValue('INTENTÓ INGRESAR; EXAMEN EQUIVOCADO.')
  expect(service.registrarIntentoIngreso).toHaveBeenLastCalledWith(expect.objectContaining({ motivo: 'Intentó ingresar; examen equivocado.' }))
})
