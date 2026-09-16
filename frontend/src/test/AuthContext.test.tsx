import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/AuthContext'

function AuthConsumer() {
  const { isAuthenticated, token, nombre, roles, isAdmin, login, logout, hasRole } = useAuth()
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'autenticado' : 'no-autenticado'}</span>
      <span data-testid="token">{token ?? 'sin-token'}</span>
      <span data-testid="nombre">{nombre ?? 'sin-nombre'}</span>
      <span data-testid="roles">{roles.join(',') || 'sin-roles'}</span>
      <span data-testid="is-admin">{isAdmin ? 'admin' : 'no-admin'}</span>
      <span data-testid="has-admin">{hasRole('ADMIN') ? 'admin' : 'no-admin'}</span>
      <button onClick={() => login('jwt-test-123', 'Admin Test', ['ADMIN'])}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => localStorage.clear())

  it('inicia sin sesión si no hay token en localStorage', () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    expect(screen.getByTestId('auth-status')).toHaveTextContent('no-autenticado')
    expect(screen.getByTestId('token')).toHaveTextContent('sin-token')
    expect(screen.getByTestId('roles')).toHaveTextContent('sin-roles')
    expect(screen.getByTestId('nombre')).toHaveTextContent('sin-nombre')
  })

  it('recupera token, nombre, roles e isAdmin desde localStorage', () => {
    localStorage.setItem('token', 'token-previo')
    localStorage.setItem('nombre', 'Usuario Previo')
    localStorage.setItem('roles', JSON.stringify(['ADMIN']))
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    expect(screen.getByTestId('auth-status')).toHaveTextContent('autenticado')
    expect(screen.getByTestId('token')).toHaveTextContent('token-previo')
    expect(screen.getByTestId('nombre')).toHaveTextContent('Usuario Previo')
    expect(screen.getByTestId('is-admin')).toHaveTextContent('admin')
    expect(screen.getByTestId('has-admin')).toHaveTextContent('admin')
  })

  it('login guarda token, nombre, roles y marca isAuthenticated', () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    act(() => { screen.getByText('login').click() })
    expect(screen.getByTestId('auth-status')).toHaveTextContent('autenticado')
    expect(screen.getByTestId('nombre')).toHaveTextContent('Admin Test')
    expect(localStorage.getItem('token')).toBe('jwt-test-123')
    expect(localStorage.getItem('nombre')).toBe('Admin Test')
    expect(localStorage.getItem('roles')).toBe('["ADMIN"]')
  })

  it('logout borra token, nombre y roles', () => {
    localStorage.setItem('token', 'token-activo')
    localStorage.setItem('nombre', 'Admin')
    localStorage.setItem('roles', JSON.stringify(['ADMIN']))
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    act(() => { screen.getByText('logout').click() })
    expect(screen.getByTestId('auth-status')).toHaveTextContent('no-autenticado')
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('nombre')).toBeNull()
    expect(localStorage.getItem('roles')).toBeNull()
    expect(screen.getByTestId('roles')).toHaveTextContent('sin-roles')
  })

  it.each([
    ['JSON malformado', 'no-es-json', 'sin-roles'],
    ['valor que no es arreglo', JSON.stringify('ADMIN'), 'sin-roles'],
    ['arreglo parcialmente inválido', JSON.stringify(['ADMIN', 42]), 'ADMIN'],
    ['rol dinámico válido', JSON.stringify(['SUPERVISOR']), 'SUPERVISOR'],
  ])('normaliza roles almacenados: %s', (_caseName, storedRoles, expectedRoles) => {
    localStorage.setItem('token', 'token-activo')
    localStorage.setItem('roles', storedRoles)
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    expect(screen.getByTestId('roles')).toHaveTextContent(expectedRoles)
    expect(screen.getByTestId('is-admin')).toHaveTextContent(expectedRoles === 'ADMIN' ? 'admin' : 'no-admin')
  })
})
