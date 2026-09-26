import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import MobileBottomNav from '../components/navigation/MobileBottomNav'

// Mock useAuth para controlar el rol en tests
vi.mock('../context/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../context/AuthContext')>()
  return {
    ...mod,
    useAuth: vi.fn(() => ({ isAdmin: false, isAuthenticated: true, roles: [] })),
  }
})

import { useAuth } from '../context/AuthContext'

function renderNav(path = '/dashboard/usuarios', isAdmin = false) {
  vi.mocked(useAuth).mockReturnValue({
    isAdmin,
    isAuthenticated: true,
    roles: isAdmin ? ['ADMIN'] : ['DOCENTE'],
    token: 'tok',
    nombre: 'Test',
    login: vi.fn(),
    logout: vi.fn(),
  })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileBottomNav />
    </MemoryRouter>,
  )
}

describe('MobileBottomNav', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('ADMIN: muestra Usuarios como link activo', () => {
    renderNav('/dashboard/usuarios', true)

    const navigation = screen.getByRole('navigation', { name: 'Navegación principal móvil' })
    expect(navigation).toHaveClass('min-[960px]:hidden')
    expect(within(navigation).getByRole('link', { name: 'Usuarios' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(navigation).getAllByRole('listitem')).toHaveLength(5)
  })

  it('DOCENTE: Usuarios aparece deshabilitado (no link)', () => {
    renderNav('/dashboard/examenes', false)

    expect(screen.getByRole('link', { name: 'Exámenes' })).toHaveAttribute('aria-current', 'page')
    // Para DOCENTE Usuarios es un botón deshabilitado, no un link
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Usuarios, solo administrador' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Inicio, no disponible' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Estudiantes, no disponible' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Más, no disponible' })).toBeDisabled()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})
