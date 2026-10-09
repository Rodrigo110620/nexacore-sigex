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

    // 3) Rellena apellidos y reintenta → modal con el error del CI
    fireEvent.change(screen.getByPlaceholderText('Ej: González Flores'), { target: { value: 'González' } })
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }))
    expect(screen.getByText(/Error en el CI/i)).toBeInTheDocument()
    expect(screen.getByText('El documento es obligatorio')).toBeInTheDocument()
  })

  it('aplica las mismas restricciones de usuario a CI y correo institucional', () => {
    render(<RegistrarEstudianteModal open onClose={vi.fn()} onRegistered={vi.fn()} />)

    // Rellena nombre y apellidos válidos
    fireEvent.change(screen.getByPlaceholderText('Ej: María José'), { target: { value: 'María' } })
    fireEvent.change(screen.getByPlaceholderText('Ej: González Flores'), { target: { value: 'González' } })

    // CI inválido: filtra las letras y deja solo "12"
    fireEvent.change(screen.getByPlaceholderText('Ej: 74892104'), { target: { value: '12ab' } })
    expect(screen.getByPlaceholderText('Ej: 74892104')).toHaveValue('12')

    // Email no institucional
    fireEvent.change(screen.getByPlaceholderText('Ej: maria.gonzalez@umss.edu'), { target: { value: 'maria@gmail.com' } })

    // Primer intento → modal con el error del CI (es el primero en el orden de validación)
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }))
    expect(screen.getByText(/Error en el CI/i)).toBeInTheDocument()
    expect(screen.getByText('Debe tener 7 u 8 dígitos')).toBeInTheDocument()

    // Cierra el modal y corrige el CI
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }))
    fireEvent.change(screen.getByPlaceholderText('Ej: 74892104'), { target: { value: '74892104' } })

    // Segundo intento → ahora el error es del correo
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }))
    expect(screen.getByText(/Error en el Correo/i)).toBeInTheDocument()
    expect(screen.getByText('Solo se permiten correos institucionales UMSS')).toBeInTheDocument()
  })

  it('registra los datos personales y académicos', async () => {
    vi.mocked(service.registrarEstudiante).mockResolvedValue({ id: 5, nombre: 'María', apellidos: 'González', ci: '74892104', email: 'maria@umss.edu', codigoSis: '202404012', carreras: [] })
    const onRegistered = vi.fn()
    render(<RegistrarEstudianteModal open onClose={vi.fn()} onRegistered={onRegistered} />)
    fireEvent.change(screen.getByPlaceholderText('Ej: María José'), { target: { value: 'María' } })
    fireEvent.change(screen.getByPlaceholderText('Ej: González Flores'), { target: { value: 'González' } })
    fireEvent.change(screen.getByPlaceholderText('Ej: 74892104'), { target: { value: '74892104' } })
    fireEvent.change(screen.getByPlaceholderText('Ej: maria.gonzalez@umss.edu'), { target: { value: 'maria@umss.edu' } })
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }))
    fireEvent.change(screen.getByPlaceholderText('Ej: 202404012'), { target: { value: '202404012' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Tecnología' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/facultad académica/i), { target: { value: '1' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Sistemas' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/carrera profesional/i), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /^registrar estudiante$/i }))
    await waitFor(() => expect(service.registrarEstudiante).toHaveBeenCalledWith(expect.objectContaining({ codigoSis: '202404012', idFacultad: 1, idCarrera: 10 })))
    expect(onRegistered).toHaveBeenCalledWith('María González')
  })
})