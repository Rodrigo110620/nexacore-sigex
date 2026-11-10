import { act, fireEvent, render, screen, within } from '@testing-library/react'
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

  it('contraído: el menú flotante se recorre con el teclado y Escape devuelve el foco al ícono', () => {
    montar('/dashboard/configuracion#respaldo', true)
    const boton = screen.getByRole('button', { name: 'Configuración: Respaldo' })
    fireEvent.click(boton)
    const menu = screen.getByRole('menu', { name: 'Configuración' })
    const opciones = within(menu).getAllByRole('menuitem')
    expect(opciones).toHaveLength(3)
    expect(opciones[0]).toHaveFocus()
    expect(within(menu).getByRole('menuitem', { name: 'Respaldo' })).toHaveAttribute('aria-current', 'page')
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(opciones[1]).toHaveFocus()
    fireEvent.keyDown(menu, { key: 'End' })
    expect(opciones[2]).toHaveFocus()
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(opciones[0]).toHaveFocus()
    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(boton).toHaveFocus()
  })

  it('contraído: también se abre al pasar el mouse (sin robar el foco) y se cierra al salir', async () => {
    vi.useFakeTimers()
    try {
      montar('/dashboard/inicio', true)
      const grupo = screen.getByRole('button', { name: 'Configuración' }).parentElement!
      fireEvent.mouseEnter(grupo)
      act(() => { vi.advanceTimersByTime(200) })
      expect(screen.getByRole('menu', { name: 'Configuración' })).toBeInTheDocument()
      expect(within(screen.getByRole('menu')).getAllByRole('menuitem')[0]).not.toHaveFocus()
      fireEvent.mouseLeave(grupo)
      act(() => { vi.advanceTimersByTime(400) })
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
