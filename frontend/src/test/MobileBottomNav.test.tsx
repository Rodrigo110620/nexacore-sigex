import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import MobileBottomNav from '../components/navigation/MobileBottomNav'

function renderNav(path = '/dashboard/usuarios') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <MobileBottomNav />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('MobileBottomNav', () => {
  it('muestra opciones móviles, marca Usuarios activo y ofrece salir', () => {
    renderNav()

    const navigation = screen.getByRole('navigation', { name: 'Navegación principal móvil' })
    expect(navigation).toHaveClass('lg:hidden')
    expect(within(navigation).getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page')
    expect(within(navigation).getAllByRole('listitem')).toHaveLength(5)
    expect(within(navigation).getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled()
  })

  it('deshabilita las opciones que todavía no tienen ruta real', () => {
    renderNav()

    expect(screen.getByRole('button', { name: 'Inicio, no disponible' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Exámenes, no disponible' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Estudiantes, no disponible' })).toBeDisabled()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('cierra sesión al pulsar Salir', () => {
    localStorage.setItem('token', 'token-admin')
    localStorage.setItem('roles', JSON.stringify(['ADMIN']))
    renderNav()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(localStorage.getItem('token')).toBeNull()
  })
})
