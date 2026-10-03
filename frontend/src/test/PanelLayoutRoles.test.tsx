import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import PanelLayout from '../components/layout/PanelLayout'

const auth = vi.hoisted(() => ({ isAdmin: false, roles: ['DOCENTE'] as string[] }))
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ ...auth, logout: vi.fn() }),
}))
vi.mock('../components/layout/PanelTopBar', () => ({ default: () => null }))
vi.mock('../components/layout/Footer', () => ({ default: () => null }))

function renderLayout(roles: string[]) {
  auth.roles = roles
  auth.isAdmin = roles.includes('ADMIN')
  return render(
    <MemoryRouter>
      <PanelLayout><p>Contenido</p></PanelLayout>
    </MemoryRouter>,
  )
}

describe('PanelLayout con múltiples roles', () => {
  it('DOCENTE conserva Inicio y Exámenes', () => {
    renderLayout(['DOCENTE'])
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Exámenes' })).toBeInTheDocument()
  })

  it('ADMIN conserva Usuarios y la opción Exámenes', () => {
    renderLayout(['ADMIN'])
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Exámenes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
  })

  it('ADMIN + CONTROL conserva Usuarios y la navegación administrativa', () => {
    renderLayout(['ADMIN', 'CONTROL'])
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Exámenes' })).toBeInTheDocument()
  })

  it('DOCENTE + CONTROL obtiene Control sin adquirir Usuarios', () => {
    renderLayout(['DOCENTE', 'CONTROL'])
    expect(screen.getByRole('link', { name: 'Control' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
  })
})
