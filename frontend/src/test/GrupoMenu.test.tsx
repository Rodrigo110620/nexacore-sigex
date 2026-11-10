import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
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
    expect(screen.queryByRole('link', { name: 'Respaldo' })).not.toBeInTheDocument()
    fireEvent.click(boton)
    expect(screen.getByRole('link', { name: 'Respaldo' })).toHaveAttribute('href', '/dashboard/configuracion#respaldo')
  })

  it('con el menú contraído las subopciones salen en un menú flotante', () => {
    montar('/dashboard/inicio', true)
    fireEvent.click(screen.getByRole('button', { name: 'Configuración' }))
    const menu = screen.getByRole('menu', { name: 'Configuración' })
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(3)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
