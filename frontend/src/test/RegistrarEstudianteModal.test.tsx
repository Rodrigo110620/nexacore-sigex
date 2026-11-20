import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegistrarEstudianteModal from '../components/estudiantes/RegistrarEstudianteModal'
import * as service from '../services/estudianteService'

vi.mock('../services/estudianteService')

describe('RegistrarEstudianteModal', () => {
  beforeEach(() => {
    vi.mocked(service.getFacultades).mockResolvedValue([{ id: 1, nombre: 'Tecnología' }])
    vi.mocked(service.getCarreras).mockResolvedValue([{ idCarrera: 10, idFacultad: 1, nombre: 'Sistemas', nombreFacultad: 'Tecnología' }])
  })

  it('valida los campos obligatorios del primer paso mostrando un error a la vez', () => {
    render(<RegistrarEstudianteModal open onClose={vi.fn()} onRegistered={vi.fn()} />)

    // 1) Primer intento → modal con el error del Nombre
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }))
    expect(screen.getByText(/Error en el Nombre/i)).toBeInTheDocument()
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()

    // Cierra el modal
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }))
    expect(screen.queryByText(/Error en el Nombre/i)).not.toBeInTheDocument()

    // 2) Rellena nombre y reintenta → modal con el error de Apellidos
    fireEvent.change(screen.getByPlaceholderText('Ej: María José'), { target: { value: 'María' } })
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }))
    expect(screen.getByText(/Error en los Apellidos/i)).toBeInTheDocument()
    expect(screen.getByText('Los apellidos son obligatorios')).toBeInTheDocument()

    // Cierra el modal
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }))

    // 3) Rellena apellidos: el CI es opcional y el correo ya no se pide → pasa al paso 2
    fireEvent.change(screen.getByPlaceholderText('Ej: González Flores'), { target: { value: 'González' } })
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }))
    expect(screen.getByText('Paso 2 de 2')).toBeInTheDocument()
  })

  it('ya no pide el correo y el CI es opcional, pero si lo escriben debe ser válido', () => {
    render(<RegistrarEstudianteModal open onClose={vi.fn()} onRegistered={vi.fn()} />)
    expect(screen.queryByPlaceholderText('Ej: 201904725@est.umss.edu')).not.toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Ej: María José'), { target: { value: 'María' } })
    fireEvent.change(screen.getByPlaceholderText('Ej: González Flores'), { target: { value: 'González' } })

    // CI inválido: filtra las letras y deja solo "12"
    fireEvent.change(screen.getByPlaceholderText('Opcional (Ej: 74892104)'), { target: { value: '12ab' } })
    expect(screen.getByPlaceholderText('Opcional (Ej: 74892104)')).toHaveValue('12')
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }))
    expect(screen.getByText(/Error en el CI/i)).toBeInTheDocument()
    expect(screen.getByText('Debe tener 7 u 8 dígitos')).toBeInTheDocument()
  })

  it('registra sin CI y con el correo generado del código SIS', async () => {
    vi.mocked(service.registrarEstudiante).mockResolvedValue({ id: 5, nombre: 'María', apellidos: 'González', ci: null, email: '202404012@est.umss.edu', codigoSis: '202404012', carreras: [] })
    const onRegistered = vi.fn()
    render(<RegistrarEstudianteModal open onClose={vi.fn()} onRegistered={onRegistered} />)
    fireEvent.change(screen.getByPlaceholderText('Ej: María José'), { target: { value: 'María' } })
    fireEvent.change(screen.getByPlaceholderText('Ej: González Flores'), { target: { value: 'González' } })
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }))
    fireEvent.change(screen.getByPlaceholderText('Ej: 202404012'), { target: { value: '202404012' } })
    expect(screen.getByTestId('correo-generado')).toHaveTextContent('202404012@est.umss.edu')
    await waitFor(() => expect(screen.getByRole('option', { name: 'Tecnología' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/facultad académica/i), { target: { value: '1' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Sistemas' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/carrera profesional/i), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /^registrar estudiante$/i }))
    await waitFor(() => expect(service.registrarEstudiante).toHaveBeenCalledWith(expect.objectContaining({
      codigoSis: '202404012', email: '202404012@est.umss.edu', ci: undefined, idFacultad: 1, idCarrera: 10 })))
    expect(onRegistered).toHaveBeenCalledWith('María González')
  })
})
