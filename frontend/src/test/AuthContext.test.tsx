import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/AuthContext'

// Componente auxiliar para exponer el contexto en el DOM
function AuthConsumer() {
  const { isAuthenticated, token, roles, login, logout, hasRole } = useAuth()
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'autenticado' : 'no-autenticado'}</span>
      <span data-testid="token">{token ?? 'sin-token'}</span>
      <span data-testid="roles">{roles.join(',') || 'sin-roles'}</span>
      <span data-testid="is-admin">{hasRole('ADMIN') ? 'admin' : 'no-admin'}</span>
      <button onClick={() => login('jwt-test-123', ['ADMIN'])}>login</button>
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
    expect(screen.getByTestId('roles')).toHaveTextContent('sin-roles')
  })

  it('inicia autenticado si ya hay token en localStorage', () => {
    localStorage.setItem('token', 'token-previo')
    localStorage.setItem('roles', JSON.stringify(['ADMIN']))
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )
    expect(screen.getByTestId('auth-status')).toHaveTextContent('autenticado')
    expect(screen.getByTestId('token')).toHaveTextContent('token-previo')
    expect(screen.getByTestId('roles')).toHaveTextContent('ADMIN')
    expect(screen.getByTestId('is-admin')).toHaveTextContent('admin')
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
    expect(localStorage.getItem('roles')).toBe('["ADMIN"]')
  })

  it('logout borra el token y marca como no autenticado', () => {
    localStorage.setItem('token', 'token-activo')
    localStorage.setItem('roles', JSON.stringify(['ADMIN']))
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
    expect(localStorage.getItem('roles')).toBeNull()
    expect(screen.getByTestId('roles')).toHaveTextContent('sin-roles')
  })

  it.each([
    ['JSON malformado', 'no-es-json'],
    ['valor que no es arreglo', JSON.stringify('ADMIN')],
    ['rol desconocido', JSON.stringify(['SUPERADMIN'])],
    ['arreglo parcialmente inválido', JSON.stringify(['ADMIN', 42])],
  ])('convierte roles inválidos en []: %s', (_caseName, storedRoles) => {
    localStorage.setItem('token', 'token-activo')
    localStorage.setItem('roles', storedRoles)

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('roles')).toHaveTextContent('sin-roles')
    expect(screen.getByTestId('is-admin')).toHaveTextContent('no-admin')
  })
})
