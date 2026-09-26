import { render, screen, within } from '@testing-library/react'
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
  it('muestra opciones móviles y marca Usuarios activo', () => {
    renderNav()

    const navigation = screen.getByRole('navigation', { name: 'Navegación principal móvil' })
    expect(navigation).toHaveClass('min-[960px]:hidden')
    expect(within(navigation).getByRole('link', { name: 'Usuarios' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(navigation).getAllByRole('listitem')).toHaveLength(5)
    expect(within(navigation).queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
  })

  it('habilita Exámenes y deshabilita Inicio, Estudiantes y Más', () => {
    renderNav('/dashboard/examenes')

    expect(screen.getByRole('link', { name: 'Exámenes' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inicio, no disponible' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Estudiantes, no disponible' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Más, no disponible' })).toBeDisabled()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })
})
