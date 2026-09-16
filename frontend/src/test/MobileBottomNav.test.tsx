import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import MobileBottomNav from '../components/navigation/MobileBottomNav'

describe('MobileBottomNav', () => {
  it('muestra las cuatro opciones y marca Usuarios como página actual', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileBottomNav />
      </MemoryRouter>,
    )

    const navigation = screen.getByRole('navigation', { name: 'Navegación principal móvil' })
    expect(navigation).toHaveClass('lg:hidden')
    expect(within(navigation).getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page')
    expect(within(navigation).getAllByRole('listitem')).toHaveLength(4)
  })

  it('deshabilita las opciones que todavía no tienen ruta real', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileBottomNav />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Inicio, no disponible' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Exámenes, no disponible' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Estudiantes, no disponible' })).toBeDisabled()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})
