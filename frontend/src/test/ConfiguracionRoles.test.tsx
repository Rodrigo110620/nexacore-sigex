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
// Sesión de ADMIN: la sección de respaldo de la base solo la ve el ADMIN.
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ roles: ['ADMIN'], permisos: null }) }))
vi.mock('../services/respaldoService', () => ({
  descargarRespaldo: vi.fn(),
  obtenerEstadoRespaldo: vi.fn().mockResolvedValue({ baseDatos: 'PostgreSQL 18.6', tamanoBytes: 1024, automatico: false, historial: [] }),
}))
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

  it('IMP-10: el ADMIN pasa a la pestaña Respaldo', async () => {
    render(<ConfiguracionPage />)
    expect(await screen.findByRole('tab', { name: /Roles y permisos/, selected: true })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Respaldo/ }))
    expect(screen.getByRole('heading', { name: 'Respaldo de la base de datos' })).toBeInTheDocument()
    expect(await screen.findByText('PostgreSQL 18.6')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Roles y permisos' })).not.toBeInTheDocument()
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
    expect(items.map((i) => i.label)).toEqual(['Inicio', 'Control', 'Reportes', 'Estudiantes'])
  })
  it('sin permisos del servidor se calculan con los roles del sistema, como siempre', () => {
    expect(tienePermiso({ roles: ['DOCENTE'] }, 'EXAMENES_GESTIONAR_PROPIOS')).toBe(true)
    expect(tienePermiso({ roles: ['CONTROL'] }, 'EXPULSAR_TODOS', 'EXPULSAR_PROPIOS')).toBe(false)
    expect(tienePermiso({ roles: ['ADMIN'] }, 'ROLES_GESTIONAR')).toBe(true)
    expect(navItemsFor(['ADMIN']).map((i) => i.label)).toContain('Configuración')
  })

  it('sugiere plantillas al crear un rol y avisa qué permiso falta para que funcione', async () => {
    vi.mocked(servicio.listarPermisos).mockResolvedValue([
      { codigo: 'EXAMENES_VER_TODOS', modulo: 'Exámenes', descripcion: 'Ver todos los exámenes', soloAdmin: false },
      { codigo: 'HABILITACION_VER', modulo: 'Habilitación', descripcion: 'Ver los estudiantes asociados a un examen', soloAdmin: false },
      ...CATALOGO,
      { codigo: 'FOTOS_REPORTAR', modulo: 'Estudiantes', descripcion: 'Reportar una foto', soloAdmin: false },
      { codigo: 'EXPULSAR_TODOS', modulo: 'Control de ingreso', descripcion: 'Expulsar en cualquier examen', soloAdmin: false },
    ])
    render(<MemoryRouter><ConfiguracionPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /Nuevo rol/ }))
    const form = screen.getByRole('region', { name: 'Nuevo rol' })

    // Recién al escribir aparecen las sugerencias que coinciden.
    expect(within(form).queryByRole('group', { name: 'Plantillas sugeridas' })).not.toBeInTheDocument()
    fireEvent.change(within(form).getByLabelText('Nombre del rol'), { target: { value: 'aux' } })
    const sugeridas = within(form).getByRole('group', { name: 'Plantillas sugeridas' })
    expect(within(form).getByText('Sugerencias para «AUX»')).toBeInTheDocument()
    expect(within(sugeridas).queryByRole('button', { name: /Secretaría de reportes/ })).not.toBeInTheDocument()
    fireEvent.click(within(sugeridas).getByRole('button', { name: /Auxiliar de control/ }))
    // El nombre que escribió se mantiene; la descripción vacía se completa.
    expect(within(form).getByLabelText('Nombre del rol')).toHaveValue('AUX')
    expect(within(form).getByLabelText('Descripción')).toHaveValue('Apoya al control de ingreso en la puerta del aula')
    expect(within(form).getByLabelText('Registrar ingresos e incidencias en cualquier examen')).toBeChecked()
    expect(within(form).getByLabelText('Ver todos los exámenes')).toBeChecked()
    expect(within(form).queryByRole('list', { name: 'Permisos que faltan' })).not.toBeInTheDocument()

    // Sin ver los exámenes, controlar el ingreso no sirve: se avisa y se puede agregar con un clic.
    fireEvent.click(within(form).getByLabelText('Ver todos los exámenes'))
    fireEvent.click(within(form).getByLabelText('Ver los estudiantes asociados a un examen'))
    const faltan = within(form).getByRole('list', { name: 'Permisos que faltan' })
    expect(faltan).toHaveTextContent('«Registrar ingresos e incidencias en cualquier examen» necesita «Ver todos los exámenes»')
    fireEvent.click(within(faltan).getByRole('button', { name: /Agregar/ }))
    expect(within(form).getByLabelText('Ver todos los exámenes')).toBeChecked()
    expect(within(form).queryByRole('list', { name: 'Permisos que faltan' })).not.toBeInTheDocument()
  })

  it('si no se pueden cargar los roles, se puede reintentar', async () => {
    vi.mocked(servicio.listarRolesConPermisos).mockRejectedValueOnce(new Error('caído'))
    render(<MemoryRouter><ConfiguracionPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('AUXILIAR')).toBeInTheDocument()
  })
})
