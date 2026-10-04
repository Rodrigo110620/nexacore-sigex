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

  it('ADMIN: Inicio, Exámenes, Control, Estudiantes y Usuarios', () => {
    renderNav('/dashboard/usuarios', ['ADMIN'])

    const navigation = screen.getByRole('navigation', { name: 'Navegación principal móvil' })
    expect(navigation).toHaveClass('min-[960px]:hidden')
    expect(within(navigation).getByRole('link', { name: 'Usuarios' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(navigation).getByRole('link', { name: 'Exámenes' })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Control' })).toHaveAttribute('href', '/dashboard/control')
    expect(within(navigation).getByRole('link', { name: 'Estudiantes' })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/dashboard/inicio')
    expect(within(navigation).getAllByRole('listitem')).toHaveLength(5)
  })

  it('DOCENTE: Exámenes y Estudiantes, sin Inicio ni Usuarios', () => {
    renderNav('/dashboard/examenes', ['DOCENTE'])

    expect(screen.getByRole('link', { name: 'Exámenes' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Estudiantes' })).toHaveAttribute(
      'href',
      '/dashboard/estudiantes',
    )
    expect(screen.queryByText('Inicio')).not.toBeInTheDocument()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('CONTROL: Inicio, Control y Estudiantes están disponibles en el mismo panel', () => {
    renderNav('/dashboard/examenes', ['CONTROL'])

    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/dashboard/inicio')
    expect(screen.getByRole('link', { name: 'Control' })).toHaveAttribute('href', '/dashboard/control')
    expect(screen.getByRole('link', { name: 'Estudiantes' })).toHaveAttribute(
      'href',
      '/dashboard/estudiantes',
    )
    expect(screen.queryByRole('link', { name: 'Exámenes' })).not.toBeInTheDocument()
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('ADMIN + CONTROL conserva Usuarios y muestra Exámenes', () => {
    renderNav('/dashboard/examenes', ['ADMIN', 'CONTROL'])

    expect(screen.getByRole('link', { name: 'Exámenes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument()
  })

  it('DOCENTE + CONTROL muestra Inicio, Control y Estudiantes sin acceso a Usuarios', () => {
    renderNav('/dashboard/examenes', ['DOCENTE', 'CONTROL'])

    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Control' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Estudiantes' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })
})