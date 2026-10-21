import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import ProtectedRoute from '../routes/ProtectedRoute'

function renderWithRouter(token: string | null, roles?: string[]) {
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
  if (roles) localStorage.setItem('roles', JSON.stringify(roles))

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Pantalla Login</div>} />
          <Route path="/estudiante" element={<div>Portal Estudiante</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
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

  it('el estudiante va a su portal y no ve las pantallas del personal', () => {
    renderWithRouter('token-valido', ['ESTUDIANTE'])
    expect(screen.getByText('Portal Estudiante')).toBeInTheDocument()
    expect(screen.queryByText('Pantalla Dashboard')).not.toBeInTheDocument()
  })

  it('con token renderiza el contenido protegido', () => {
    renderWithRouter('token-valido')
    expect(screen.getByText('Pantalla Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Pantalla Login')).not.toBeInTheDocument()
  })
})
