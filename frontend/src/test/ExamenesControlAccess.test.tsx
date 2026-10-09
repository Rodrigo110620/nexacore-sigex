import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExamenesPage from '../pages/Examenes/ExamenesPage'
import { listarExamenes, type ExamenDto } from '../services/examenService'

const auth = vi.hoisted(() => ({ isAdmin: false, roles: ['CONTROL'] }))
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn() }))
vi.mock('../components/layout/PanelLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('../components/navigation/MobileBottomNav', () => ({ default: () => null }))
vi.mock('../components/examenes/RegisterExamenModal', () => ({ default: () => null }))

const examen: ExamenDto = {
  idExamen: 7, idParalelo: 2, asignatura: 'Cálculo', sigla: 'MAT-101',
  docente: 'Docente de prueba', fecha: '2026-10-15', horaInicio: '09:00:00',
  duracionMinutos: 90, idAmbiente: 3, ambienteNombre: 'Aula 204',
  estado: 'programado', normasGenerales: [], normasParticulares: [],
}

describe('acceso CONTROL desde el listado integrado', () => {
  beforeEach(() => {
    auth.isAdmin = false
    auth.roles = ['CONTROL']
    vi.mocked(listarExamenes).mockResolvedValue([
      examen, { ...examen, idExamen: 8, asignatura: 'Cancelado', estado: 'cancelado' },
    ])
  })

  it('conserva filtros y detalle y permite iniciar control solo en exámenes vigentes', async () => {
    render(<MemoryRouter><ExamenesPage /></MemoryRouter>)
    const accesos = await screen.findAllByRole('link', { name: 'Iniciar control de ingreso para Cálculo' })
    expect(accesos).toHaveLength(2)
    accesos.forEach(link => expect(link).toHaveAttribute('href', '/dashboard/control/7'))
    expect(screen.queryByRole('link', { name: /Iniciar control.*Cancelado/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Ver detalle' })).toHaveLength(4)
    expect(screen.getAllByLabelText('Filtrar por ambiente').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Filtrar por fecha').length).toBeGreaterThan(0)
  })

  it('DOCENTE puede registrar y controlar sus exámenes', async () => {
    const role = 'DOCENTE'
    auth.roles = [role]
    auth.isAdmin = false
    render(<MemoryRouter><ExamenesPage /></MemoryRouter>)
    await screen.findAllByRole('button', { name: 'Ver detalle' })
    expect(await screen.findAllByRole('link', { name: 'Iniciar control de ingreso para Cálculo' })).toHaveLength(2)
    expect(screen.queryAllByRole('button', { name: 'Registrar Examen' }).length).toBeGreaterThan(0)
  })

  it('ADMIN conserva la administración y también puede iniciar el control', async () => {
    auth.roles = ['ADMIN']
    auth.isAdmin = true
    render(<MemoryRouter><ExamenesPage /></MemoryRouter>)
    expect((await screen.findAllByRole('button', { name: 'Registrar Examen' })).length).toBeGreaterThan(0)
    expect(await screen.findAllByRole('link', { name: 'Iniciar control de ingreso para Cálculo' })).toHaveLength(2)
  })

  it('ADMIN + CONTROL conserva administración y obtiene acciones CONTROL', async () => {
    auth.roles = ['ADMIN', 'CONTROL']
    auth.isAdmin = true
    render(<MemoryRouter><ExamenesPage /></MemoryRouter>)

    expect((await screen.findAllByRole('button', { name: 'Registrar Examen' })).length).toBeGreaterThan(0)
    expect(await screen.findAllByRole('link', { name: 'Iniciar control de ingreso para Cálculo' })).toHaveLength(2)
  })

  it('DOCENTE + CONTROL conserva registro y acciones de control', async () => {
    auth.roles = ['DOCENTE', 'CONTROL']
    auth.isAdmin = false
    render(<MemoryRouter><ExamenesPage /></MemoryRouter>)

    expect(await screen.findAllByRole('link', { name: 'Iniciar control de ingreso para Cálculo' })).toHaveLength(2)
    expect(screen.queryAllByRole('button', { name: 'Registrar Examen' }).length).toBeGreaterThan(0)
  })
})
