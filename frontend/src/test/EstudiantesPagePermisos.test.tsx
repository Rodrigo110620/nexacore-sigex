vi.mock('../services/estudianteService', () => ({
  getMateriasDocente: vi.fn().mockResolvedValue([
    { idMateria: 5, materia: 'Base de Datos I', idParalelo: 2, paralelo: '2' },
    { idMateria: 9, materia: 'Taller de Programación', idParalelo: 1, paralelo: '1' },
  ]),
  getEstudiantes: vi.fn((p: { idParalelo?: string }) => Promise.resolve({ contenido: [], pagina: 0, tamano: 1, totalPaginas: 1,
    totalRegistros: p.idParalelo === '2' ? 32 : p.idParalelo === '1' ? 28 : 60 })),
}))
import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import EstudiantesPage from '../pages/panel_admin/EstudiantesPage'

const sesion = vi.hoisted(() => ({ roles: ['ADMIN'] as string[], permisos: null as string[] | null }))

vi.mock('../components/layout/PanelLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../components/navigation/MobileBottomNav', () => ({ default: () => null }))
vi.mock('../components/estudiantes/EstudianteFilters', () => ({ default: () => null }))
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ roles: sesion.roles, permisos: sesion.permisos }) }))
vi.mock('../services/fotoRevisionService', () => ({ listarRevisionFotos: vi.fn().mockResolvedValue([]) }))
vi.mock('../hooks/useEstudiantes', () => ({
  default: () => ({
    data: { contenido: [], pagina: 0, tamano: 10, totalRegistros: 0, totalPaginas: 0 },
    estudiantes: [], loading: false, error: null, updateFilters: vi.fn(), changePage: vi.fn(), retry: vi.fn(),
  }),
}))

const pagina = (roles: string[]) => {
  sesion.roles = roles
  sesion.permisos = null
  render(<MemoryRouter><EstudiantesPage /></MemoryRouter>)
}

describe('acciones de la página Estudiantes según el rol', () => {
  it('oculta registrar e importar al docente aunque su sesión conserve el permiso', () => {
    sesion.roles = ['DOCENTE']
    sesion.permisos = ['ESTUDIANTES_GESTIONAR', 'EXAMENES_VER_PROPIOS']
    render(<MemoryRouter><EstudiantesPage /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: /Registrar Estudiante/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Importar estudiantes' })).not.toBeInTheDocument()
  })
  it('el ADMIN ve Registrar e Importar', () => {
    pagina(['ADMIN'])
    expect(screen.getByRole('button', { name: /Registrar Estudiante/ })).toBeEnabled()
    // Importar y descargar la lista están en un solo menú «Importar / Exportar».
    fireEvent.click(screen.getByRole('button', { name: /Importar \/ Exportar/ }))
    expect(screen.getByRole('menuitem', { name: /Importar estudiantes/ })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: /Descargar lista/ })).toBeEnabled()
  })

  it.each([['DOCENTE'], ['CONTROL']])('al %s no se le muestran Registrar ni Importar', (rol) => {
    pagina([rol])
    expect(screen.queryByRole('button', { name: /Registrar Estudiante/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Importar estudiantes' })).not.toBeInTheDocument()
  })

  it('el DOCENTE elige una card de materia y grupo y la lista muestra solo ese grupo', async () => {
    pagina(['DOCENTE'])
    const todos = await screen.findByRole('button', { name: /Todos mis estudiantes/ })
    expect(todos).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('button', { name: 'Base de Datos I · 2: 32 estudiantes' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Taller de Programación · 1: 28 estudiantes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Todos mis estudiantes' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Base de Datos I · 2/ }))
    expect(screen.getByRole('button', { name: /Base de Datos I · 2/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Base de Datos I · 2' })).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar estudiante')).toBeInTheDocument()
  })

  it('el ADMIN no ve las cards: sigue con la tabla y sus filtros', () => {
    pagina(['ADMIN'])
    expect(screen.queryByRole('region', { name: 'Mis materias y grupos' })).not.toBeInTheDocument()
  })
})
