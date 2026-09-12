import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/AuthContext'

// Componente auxiliar para exponer el contexto en el DOM
function AuthConsumer() {
  const { isAuthenticated, token, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'autenticado' : 'no-autenticado'}</span>
      <span data-testid="token">{token ?? 'sin-token'}</span>
      <button onClick={() => login('jwt-test-123')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('inicia sin sesión si no hay token en localStorage', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )
    expect(screen.getByTestId('auth-status')).toHaveTextContent('no-autenticado')
    expect(screen.getByTestId('token')).toHaveTextContent('sin-token')
  })

  it('inicia autenticado si ya hay token en localStorage', () => {
    localStorage.setItem('token', 'token-previo')
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )
    expect(screen.getByTestId('auth-status')).toHaveTextContent('autenticado')
    expect(screen.getByTestId('token')).toHaveTextContent('token-previo')
  })

  it('login guarda el token y marca isAuthenticated', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )
    act(() => {
      screen.getByText('login').click()
    })
    expect(screen.getByTestId('auth-status')).toHaveTextContent('autenticado')
    expect(localStorage.getItem('token')).toBe('jwt-test-123')
  })

  it('logout borra el token y marca como no autenticado', () => {
    localStorage.setItem('token', 'token-activo')
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )
    act(() => {
      screen.getByText('logout').click()
    })
    expect(screen.getByTestId('auth-status')).toHaveTextContent('no-autenticado')
    expect(localStorage.getItem('token')).toBeNull()
  })
})
