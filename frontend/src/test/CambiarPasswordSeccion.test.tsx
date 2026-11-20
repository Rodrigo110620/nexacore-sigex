import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CambiarPasswordSeccion from '../components/auth/CambiarPasswordSeccion'
import { cambiarPassword } from '../services/profileService'

vi.mock('../services/profileService', () => ({ cambiarPassword: vi.fn().mockResolvedValue('Contraseña actualizada.') }))

describe('Cambiar contraseña: el mismo formulario para el estudiante y el personal', () => {
  it('pide la contraseña actual, valida y confirma igual para todos', async () => {
    render(<CambiarPasswordSeccion />)
    expect(screen.getByRole('heading', { name: 'Seguridad' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute('placeholder', 'Mínimo 8 caracteres')

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))
    expect(screen.getByText('Escribe tu contraseña actual')).toBeInTheDocument()
    expect(screen.getByText('Repite la nueva contraseña')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'Actual123!' } })
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'NuevaClave1!' } })
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'NuevaClave1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))
    expect(await screen.findByText('Contraseña actualizada.')).toBeInTheDocument()
    expect(cambiarPassword).toHaveBeenCalledWith({ passwordActual: 'Actual123!', passwordNueva: 'NuevaClave1!', passwordConfirmacion: 'NuevaClave1!' })
  })

  it('la regla extra del rol (estudiante) se aplica y se explica', () => {
    render(<CambiarPasswordSeccion restriccion={{ texto: 'No puede contener tu nombre, tu código SIS ni tu CI', viola: (n) => n.includes('Ana') }} />)
    expect(screen.getByText(/No puede contener tu nombre, tu código SIS ni tu CI\./)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'Actual123!' } })
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'AnaClave123!' } })
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'AnaClave123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))
    expect(screen.getAllByText('No puede contener tu nombre, tu código SIS ni tu CI').length).toBeGreaterThan(0)
  })
})
