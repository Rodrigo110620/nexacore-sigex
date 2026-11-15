import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ResetPasswordPage from '../pages/Login/ResetPasswordPage'
import { estadoEnlaceReset } from '../services/authService'

vi.mock('../components/layout/AuthLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../hooks/useIsMobileDevice', () => ({ useIsMobileDevice: () => false }))
vi.mock('../services/authService', () => ({ estadoEnlaceReset: vi.fn(), resetPassword: vi.fn() }))

const abrir = (ruta: string) => render(<MemoryRouter initialEntries={[ruta]}><ResetPasswordPage /></MemoryRouter>)

describe('Restablecer contraseña · enlace no válido (sección 3 del diseño)', () => {
  it('con un enlace vigente muestra el formulario', async () => {
    vi.mocked(estadoEnlaceReset).mockResolvedValue(true)
    abrir('/reset-password?token=abc')
    expect(await screen.findByRole('heading', { name: 'Restablecer contraseña' })).toBeInTheDocument()
    expect(estadoEnlaceReset).toHaveBeenCalledWith('abc')
  })

  it('con un enlace vencido o usado avisa apenas se abre y ofrece pedir uno nuevo', async () => {
    vi.mocked(estadoEnlaceReset).mockResolvedValue(false)
    abrir('/reset-password?token=usado')
    expect(await screen.findByRole('heading', { name: 'Este enlace ya no es válido' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Solicitar nuevo enlace/ })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('link', { name: /Volver al inicio de sesión/ })).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('heading', { name: 'Restablecer contraseña' })).not.toBeInTheDocument()
  })

  it('sin token también es un enlace no válido; si no se pudo consultar, no se bloquea el formulario', async () => {
    const { unmount } = abrir('/reset-password')
    expect(screen.getByRole('heading', { name: 'Este enlace ya no es válido' })).toBeInTheDocument()
    unmount()
    vi.mocked(estadoEnlaceReset).mockResolvedValue(null)
    abrir('/reset-password?token=abc')
    expect(await screen.findByRole('heading', { name: 'Restablecer contraseña' })).toBeInTheDocument()
  })
})
