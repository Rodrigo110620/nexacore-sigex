import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PerfilDelRol from '../components/perfil/PerfilDelRol'
import { getPerfilDelRol } from '../services/profileService'

vi.mock('../services/profileService', () => ({ getPerfilDelRol: vi.fn() }))

const montar = (esAdmin = false) => render(<MemoryRouter><PerfilDelRol esAdmin={esAdmin} /></MemoryRouter>)

describe('Mi perfil: lo propio de cada rol', () => {
  beforeEach(() => vi.mocked(getPerfilDelRol).mockReset())

  it('el docente ve sus datos, sus materias con grupos y lo que puede hacer', async () => {
    vi.mocked(getPerfilDelRol).mockResolvedValue({
      permisos: [{ codigo: 'EXAMENES_GESTIONAR_PROPIOS', modulo: 'Exámenes', descripcion: 'Programar y editar sus exámenes' }],
      docente: { titulo: 'Lic.', especialidad: null, categoria: 'INTERINO',
        materias: [{ idMateria: 5, sigla: 'INF-261', nombre: 'Base de Datos I', grupos: ['G1', 'G2'] }] },
      examenesAsignados: null,
    })
    montar()
    const docente = await screen.findByRole('region', { name: 'Datos del docente' })
    expect(within(docente).getByText('Lic.')).toBeInTheDocument()
    expect(within(docente).getByText('Interino')).toBeInTheDocument()
    expect(within(docente).getByText('Sin registrar')).toBeInTheDocument()
    expect(within(docente).getByText('INF-261 · Grupos: G1, G2')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Mis exámenes asignados' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Lo que puedes hacer' })).getByText('Programar y editar sus exámenes')).toBeInTheDocument()
  })

  it('el control ve sus exámenes asignados, y si no tiene, lo dice', async () => {
    vi.mocked(getPerfilDelRol).mockResolvedValue({
      permisos: [], docente: null,
      examenesAsignados: [{ idExamen: 7, materia: 'Cálculo I', fecha: '2026-11-09', horaInicio: '08:00:00', duracionMinutos: 90, aula: '690A', estado: 'programado' }],
    })
    montar()
    const lista = await screen.findByRole('list', { name: 'Mis exámenes asignados' })
    expect(within(lista).getByRole('link')).toHaveAttribute('href', '/dashboard/control/7')
    expect(within(lista).getByText('Cálculo I')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Datos del docente' })).not.toBeInTheDocument()
  })

  it('el ADMIN ve que tiene acceso total', async () => {
    vi.mocked(getPerfilDelRol).mockResolvedValue({ permisos: [], docente: null, examenesAsignados: null })
    montar(true)
    expect(await screen.findByText('Como administrador tienes acceso total al sistema.')).toBeInTheDocument()
  })
})
