import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import GrupoMenu from '../components/navigation/GrupoMenu'
import { navItemsFor } from '../components/navigation/navItems'

const configuracion = (roles: string[]) => navItemsFor(roles).find((i) => i.label === 'Configuración')!
const montar = (ruta: string, contraido = false) => {
  const item = configuracion(['ADMIN'])
  return render(<MemoryRouter initialEntries={[ruta]}><GrupoMenu item={{ ...item, hijos: item.hijos! }} contraido={contraido} clase="" /></MemoryRouter>)
}

describe('Configuración con subopciones en el menú lateral', () => {
  it('el ADMIN tiene Roles y permisos, Respaldo e Historial; un rol extra solo los roles (sin desplegable)', () => {
    expect(configuracion(['ADMIN']).hijos?.map((h) => [h.label, h.to])).toEqual([
      ['Roles y permisos', '/dashboard/configuracion'],
      ['Respaldo', '/dashboard/configuracion#respaldo'],
      ['Historial', '/dashboard/configuracion#historial'],
    ])
    expect(configuracion(['AUXILIAR'])).toBeUndefined()
    expect(navItemsFor([], ['ROLES_GESTIONAR']).find((i) => i.label === 'Configuración')?.hijos).toBeUndefined()
  })

  it('se abre solo dentro de Configuración y marca la sección actual', () => {
    montar('/dashboard/configuracion#historial')
    expect(screen.getByRole('button', { name: 'Configuración' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Historial' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Historial' })).toHaveAttribute('title', 'Historial de operaciones')
    expect(screen.getByRole('link', { name: 'Roles y permisos' })).not.toHaveAttribute('aria-current')
  })

  it('fuera de Configuración está plegado y se despliega al pulsarlo', () => {
    montar('/dashboard/inicio')
    const boton = screen.getByRole('button', { name: 'Configuración' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    // Plegada, su lista no se puede enfocar con el teclado.
    expect(screen.getByRole('list', { hidden: true })).toHaveAttribute('inert')
    fireEvent.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('list')).not.toHaveAttribute('inert')
    expect(screen.getByRole('link', { name: 'Respaldo' })).toHaveAttribute('href', '/dashboard/configuracion#respaldo')
  })

  it('contraído: el ícono pide desplegar el menú; desplegado, el grupo se ve abierto y al elegir se vuelve a contraer', () => {
    const onAsomar = vi.fn()
    const alElegir = vi.fn()
    const item = configuracion(['ADMIN'])
    const { rerender } = render(<MemoryRouter initialEntries={['/dashboard/configuracion#respaldo']}>
      <GrupoMenu item={{ ...item, hijos: item.hijos! }} contraido clase="" onAsomar={onAsomar} alElegir={alElegir} />
    </MemoryRouter>)
    // Solo el ícono, que anuncia la sección actual.
    fireEvent.click(screen.getByRole('button', { name: 'Configuración: Respaldo' }))
    expect(onAsomar).toHaveBeenCalled()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    rerender(<MemoryRouter initialEntries={['/dashboard/inicio']}>
      <GrupoMenu item={{ ...item, hijos: item.hijos! }} contraido={false} clase="" abiertoForzado onAsomar={onAsomar} alElegir={alElegir} />
    </MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Configuración' })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('link', { name: 'Historial' }))
    expect(alElegir).toHaveBeenCalled()
  })
})
