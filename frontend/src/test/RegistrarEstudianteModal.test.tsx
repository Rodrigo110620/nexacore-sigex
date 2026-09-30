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

  it('valida los campos obligatorios del primer paso', () => {
    render(<RegistrarEstudianteModal open onClose={vi.fn()} onRegistered={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }))
    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('Los apellidos son obligatorios')).toBeInTheDocument()
    expect(screen.getByText('El documento es obligatorio')).toBeInTheDocument()
  })

  it('aplica las mismas restricciones de usuario a CI y correo institucional', () => {
    render(<RegistrarEstudianteModal open onClose={vi.fn()} onRegistered={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Ej: María José'), { target: { value: 'María' } })
    fireEvent.change(screen.getByPlaceholderText('Ej: González Flores'), { target: { value: 'González' } })
    fireEvent.change(screen.getByPlaceholderText('Ej: 74892104'), { target: { value: '12ab' } })
    expect(screen.getByPlaceholderText('Ej: 74892104')).toHaveValue('12')
    fireEvent.change(screen.getByPlaceholderText('Ej: maria.gonzalez@umss.edu'), { target: { value: 'maria@gmail.com' } })
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }))
    expect(screen.getByText('Debe tener 7 u 8 dígitos')).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: /guardar y registrar/i }))
    await waitFor(() => expect(service.registrarEstudiante).toHaveBeenCalledWith(expect.objectContaining({ codigoSis: '202404012', idFacultad: 1, idCarrera: 10 })))
    expect(onRegistered).toHaveBeenCalledWith('María González')
  })

})
