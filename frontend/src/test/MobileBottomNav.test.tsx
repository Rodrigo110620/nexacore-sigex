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

function renderNav(path: string, roles: string[]) {
  vi.mocked(useAuth).mockReturnValue({
    isAdmin: roles.includes('ADMIN'),
    isAuthenticated: true,
    roles,
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

  it('ADMIN: Inicio, Exámenes, Estudiantes y Usuarios', () => {
    renderNav('/dashboard/usuarios', ['ADMIN'])

    const navigation = screen.getByRole('navigation', { name: 'Navegación principal móvil' })
    expect(navigation).toHaveClass('min-[960px]:hidden')
    expect(within(navigation).getByRole('link', { name: 'Usuarios' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(navigation).getByRole('link', { name: 'Exámenes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Estudiantes, no disponible' })).toBeDisabled()
    expect(within(navigation).getAllByRole('listitem')).toHaveLength(4)
  })

  it('DOCENTE: solo Inicio y Exámenes, sin Usuarios ni Estudiantes', () => {
    renderNav('/dashboard/examenes', ['DOCENTE'])

    expect(screen.getByRole('link', { name: 'Exámenes' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Inicio, no disponible' })).toBeDisabled()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
    expect(screen.queryByText('Estudiantes')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('CONTROL: muestra el acceso de exámenes como Control', () => {
    renderNav('/dashboard/examenes', ['CONTROL'])

    expect(screen.getByRole('link', { name: 'Control' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: 'Exámenes' })).not.toBeInTheDocument()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('ADMIN + CONTROL conserva Usuarios y muestra Control', () => {
    renderNav('/dashboard/examenes', ['ADMIN', 'CONTROL'])

    expect(screen.getByRole('link', { name: 'Control' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument()
  })

  it('DOCENTE + CONTROL muestra Control sin acceso a Usuarios', () => {
    renderNav('/dashboard/examenes', ['DOCENTE', 'CONTROL'])

    expect(screen.getByRole('link', { name: 'Control' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
