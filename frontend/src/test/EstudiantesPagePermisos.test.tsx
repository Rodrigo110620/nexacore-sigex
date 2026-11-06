vi.mock('../services/estudianteService', () => ({ getMateriasDocente: vi.fn().mockResolvedValue([]) }))
import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('button', { name: 'Importar estudiantes' })).toBeEnabled()
  })

  it.each([['DOCENTE'], ['CONTROL']])('al %s no se le muestran Registrar ni Importar', (rol) => {
    pagina([rol])
    expect(screen.queryByRole('button', { name: /Registrar Estudiante/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Importar estudiantes' })).not.toBeInTheDocument()
  })

  it('el DOCENTE ve que solo aparecen sus estudiantes', () => {
    pagina(['DOCENTE'])
    expect(screen.getByText('Ves a los estudiantes matriculados en tus materias y paralelos.')).toBeInTheDocument()
  })
})
