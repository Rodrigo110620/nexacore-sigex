import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import PanelLayout from '../components/layout/PanelLayout'
import UsuariosPage from '../pages/panel_admin/UsuariosPage'

vi.mock('../hooks/useUsers', () => ({
  default: () => ({
    data: {
      contenido: [
        {
          id: 12,
          nombre: 'Ana',
          apellidos: 'Rojas Vidal',
          email: 'ana.rojas@umss.edu.bo',
          ci: '6512340',
          rol: 'ADMIN',
          estado: 'activo',
        },
      ],
      pagina: 0,
      tamano: 10,
      totalRegistros: 1,
      totalPaginas: 1,
    },
    users: [
      {
        id: 12,
        nombre: 'Ana',
        apellidos: 'Rojas Vidal',
        email: 'ana.rojas@umss.edu.bo',
        ci: '6512340',
        rol: 'ADMIN',
        estado: 'activo',
      },
    ],
    loading: false,
    error: null,
    updateFilters: vi.fn(),
    changePage: vi.fn(),
    retry: vi.fn(),
  }),
}))

describe('UsuariosPage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'token-admin')
    localStorage.setItem('roles', JSON.stringify(['ADMIN']))
  })

  it('integra el listado HU1 con el modal de registro de Lia', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <UsuariosPage />
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(screen.getAllByText('GESTIÓN DE USUARIOS')).toHaveLength(2)
    expect(screen.getAllByText('ana.rojas@umss.edu.bo').length).toBeGreaterThan(0)
    expect(screen.getByRole('complementary')).toHaveClass('min-[960px]:flex')
    expect(screen.getByRole('navigation', { name: 'Navegación principal móvil' })).toHaveClass('min-[960px]:hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Registrar Usuario' }))

    expect(screen.getByRole('heading', { name: 'Registrar Usuario' })).toBeInTheDocument()
    expect(screen.getByText('Credenciales por correo')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Notificar por email' })).not.toBeInTheDocument()
  })

  it('DashboardPage redirige hacia la pantalla unificada', async () => {
    const DashboardPage = (await import('../pages/Dashboard/DashboardPage')).default

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/usuarios" element={<p>Gestión unificada</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(screen.getByText('Gestión unificada')).toBeInTheDocument()
  })

  it('conserva el breakpoint original del layout en otras pantallas', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <PanelLayout><p>Otro panel</p></PanelLayout>
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(screen.getByRole('complementary')).toHaveClass('lg:flex')
    expect(screen.getByRole('complementary')).not.toHaveClass('min-[960px]:flex')
  })
})
