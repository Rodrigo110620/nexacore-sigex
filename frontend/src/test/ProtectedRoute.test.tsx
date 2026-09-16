import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import ProtectedRoute from '../routes/ProtectedRoute'

function renderWithRouter(token: string | null, roles?: string[], requiredRole?: 'ADMIN') {
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
  if (roles) localStorage.setItem('roles', JSON.stringify(roles))
  else localStorage.removeItem('roles')

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Pantalla Login</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole={requiredRole}>
                <div>Pantalla Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('sin token redirige a /login', () => {
    renderWithRouter(null)
    expect(screen.getByText('Pantalla Login')).toBeInTheDocument()
    expect(screen.queryByText('Pantalla Dashboard')).not.toBeInTheDocument()
  })

  it('con token renderiza el contenido protegido', () => {
    renderWithRouter('token-valido')
    expect(screen.getByText('Pantalla Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Pantalla Login')).not.toBeInTheDocument()
  })

  it('con ADMIN renderiza el contenido que requiere ese rol', () => {
    renderWithRouter('token-admin', ['ADMIN'], 'ADMIN')

    expect(screen.getByText('Pantalla Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Acceso restringido')).not.toBeInTheDocument()
  })

  it('con otro rol muestra acceso restringido y no renderiza el contenido', () => {
    renderWithRouter('token-docente', ['DOCENTE'], 'ADMIN')

    expect(screen.getByRole('alert')).toHaveTextContent('Acceso restringido')
    expect(screen.queryByText('Pantalla Dashboard')).not.toBeInTheDocument()
  })

  it('con token pero sin roles muestra acceso restringido sin romper la ruta', () => {
    renderWithRouter('token-sin-roles', undefined, 'ADMIN')

    expect(screen.getByRole('alert')).toHaveTextContent('Acceso restringido')
    expect(screen.queryByText('Pantalla Dashboard')).not.toBeInTheDocument()
  })

  it('permite cerrar una sesión sin permisos y vuelve al login', () => {
    renderWithRouter('token-control', ['CONTROL'], 'ADMIN')

    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio de sesión' }))
    expect(screen.getByText('Pantalla Login')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('roles')).toBeNull()
  })
})
