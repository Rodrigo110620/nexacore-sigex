import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ConfiguracionPage from '../pages/panel_admin/ConfiguracionPage'
import * as servicio from '../services/rolesService'
import { navItemsFor } from '../components/navigation/navItems'
import { tienePermiso } from '../utils/permisos'

vi.mock('../components/layout/PanelLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../components/navigation/MobileBottomNav', () => ({ default: () => null }))
vi.mock('../services/rolesService', () => ({
  listarRolesConPermisos: vi.fn(), listarPermisos: vi.fn(), crearRolConPermisos: vi.fn(), actualizarRol: vi.fn(), eliminarRol: vi.fn(),
}))

const CATALOGO = [
  { codigo: 'CONTROL_INGRESO_TODOS', modulo: 'Control de ingreso', descripcion: 'Registrar ingresos e incidencias en cualquier examen', soloAdmin: false },
  { codigo: 'ESTUDIANTES_VER', modulo: 'Estudiantes', descripcion: 'Ver estudiantes', soloAdmin: false },
  { codigo: 'USUARIOS_GESTIONAR', modulo: 'Administración', descripcion: 'Gestionar los usuarios del personal', soloAdmin: true },
]
const ROLES = [
  { id: 1, nombre: 'ADMIN', descripcion: 'Administra todo el sistema.', delSistema: true, permisos: ['CONTROL_INGRESO_TODOS', 'ESTUDIANTES_VER', 'USUARIOS_GESTIONAR'], usuarios: 1 },
  { id: 2, nombre: 'DOCENTE', descripcion: 'Gestiona y controla sus propios exámenes.', delSistema: true, permisos: ['ESTUDIANTES_VER'], usuarios: 4 },
  { id: 9, nombre: 'AUXILIAR', descripcion: 'Apoya al control', delSistema: false, permisos: ['ESTUDIANTES_VER'], usuarios: 0 },
]

describe('Configuración → Roles y permisos', () => {
  beforeEach(() => {
    vi.mocked(servicio.listarRolesConPermisos).mockResolvedValue(ROLES)
    vi.mocked(servicio.listarPermisos).mockResolvedValue(CATALOGO)
    vi.mocked(servicio.crearRolConPermisos).mockReset()
  })

  it('los roles del sistema se ven con candado y los extra se pueden editar o borrar', async () => {
    render(<MemoryRouter><ConfiguracionPage /></MemoryRouter>)
    const items = await screen.findAllByRole('listitem')
    const docente = items.find((li) => within(li).queryByText('DOCENTE'))!
    expect(within(docente).getByText('Rol del sistema: sus permisos no se cambian.')).toBeInTheDocument()
    expect(within(docente).queryByRole('button', { name: /Editar permisos/ })).not.toBeInTheDocument()
    const auxiliar = items.find((li) => within(li).queryByText('AUXILIAR'))!
    expect(within(auxiliar).getByRole('button', { name: /Editar permisos/ })).toBeInTheDocument()
    expect(within(auxiliar).getByRole('button', { name: /Borrar/ })).toBeInTheDocument()
  })

  it('crea un rol extra con los permisos marcados y no ofrece los que son solo del ADMIN', async () => {
    vi.mocked(servicio.crearRolConPermisos).mockResolvedValue({ ...ROLES[2], id: 10, nombre: 'SUPERVISOR' })
    render(<MemoryRouter><ConfiguracionPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /Nuevo rol/ }))
    const form = screen.getByRole('region', { name: 'Nuevo rol' })
    expect(within(form).queryByText('Gestionar los usuarios del personal')).not.toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Nombre del rol'), { target: { value: 'supervisor' } })
    fireEvent.change(within(form).getByLabelText('Descripción'), { target: { value: 'Supervisa el control de ingreso' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Crear rol' }))
    expect(within(form).getByRole('alert')).toHaveTextContent('Elige al menos un permiso')
    fireEvent.click(within(form).getByLabelText('Registrar ingresos e incidencias en cualquier examen'))
    fireEvent.click(within(form).getByRole('button', { name: 'Crear rol' }))
    await waitFor(() => expect(servicio.crearRolConPermisos).toHaveBeenCalledWith({
      nombre: 'SUPERVISOR', descripcion: 'Supervisa el control de ingreso', permisos: ['CONTROL_INGRESO_TODOS'],
    }))
  })
})

describe('permisos en el frontend', () => {
  it('un rol extra ve en el menú solo lo que permiten sus permisos', () => {
    const items = navItemsFor(['AUXILIAR'], ['CONTROL_INGRESO_TODOS', 'ESTUDIANTES_VER'])
    expect(items.map((i) => i.label)).toEqual(['Inicio', 'Control', 'Estudiantes'])
  })
  it('sin permisos del servidor se calculan con los roles del sistema, como siempre', () => {
    expect(tienePermiso({ roles: ['DOCENTE'] }, 'EXAMENES_GESTIONAR_PROPIOS')).toBe(true)
    expect(tienePermiso({ roles: ['CONTROL'] }, 'EXPULSAR_TODOS', 'EXPULSAR_PROPIOS')).toBe(false)
    expect(tienePermiso({ roles: ['ADMIN'] }, 'ROLES_GESTIONAR')).toBe(true)
    expect(navItemsFor(['ADMIN']).map((i) => i.label)).toContain('Configuración')
  })
})
