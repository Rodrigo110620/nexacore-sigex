import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../context/AuthContext'
import LoginSesion from '../pages/Login/Login_Sesion'
import { loginUser } from '../services/authService'

vi.mock('../services/authService')
const mockedLoginUser = vi.mocked(loginUser)

function SessionProbe() {
  const { roles } = useAuth()
  return <p>Roles conservados: {roles.join(',')}</p>
}

describe('Login_Sesion', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('entrega token y roles al contexto después de iniciar sesión', async () => {
    mockedLoginUser.mockResolvedValue({
      token: 'jwt-admin',
      nombre: 'Admin SIGEX',
      roles: ['ADMIN'],
    })

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginSesion />} />
            <Route path="/dashboard" element={<SessionProbe />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    fireEvent.change(screen.getByPlaceholderText('usuario.umss.edu.bo'), {
      target: { value: 'admin@nexacore.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /INGRESAR/ }))

    await waitFor(() => expect(screen.getByText('Roles conservados: ADMIN')).toBeInTheDocument())
    expect(localStorage.getItem('token')).toBe('jwt-admin')
    expect(localStorage.getItem('roles')).toBe('["ADMIN"]')
  })
})
