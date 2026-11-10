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

// Exámenes es la agenda: sin botón de control en las filas (el control se opera desde Control, el tablero del día).
describe('Exámenes es la agenda: solo «Ver detalle»; registrar, según el rol', () => {
  beforeEach(() => {
    auth.isAdmin = false
    auth.roles = ['DOCENTE']
    vi.mocked(listarExamenes).mockResolvedValue([
      examen, { ...examen, idExamen: 8, asignatura: 'Cancelado', estado: 'cancelado' },
    ])
  })

  it.each([['DOCENTE'], ['ADMIN'], ['DOCENTE', 'CONTROL'], ['ADMIN', 'CONTROL']])('%s: sin botón de control en las filas, con filtros y detalle', async (...roles) => {
    auth.roles = roles
    auth.isAdmin = roles.includes('ADMIN')
    render(<MemoryRouter><ExamenesPage /></MemoryRouter>)
    expect(await screen.findAllByRole('button', { name: 'Ver detalle' })).toHaveLength(4)
    expect(screen.queryByRole('link', { name: /control de ingreso/ })).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('Filtrar por ambiente').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Filtrar por fecha').length).toBeGreaterThan(0)
  })

  it('solo quien es DOCENTE registra exámenes (el ADMIN no)', async () => {
    render(<MemoryRouter><ExamenesPage /></MemoryRouter>)
    await screen.findAllByRole('button', { name: 'Ver detalle' })
    expect(screen.queryAllByRole('button', { name: 'Registrar Examen' }).length).toBeGreaterThan(0)
  })

  it('el ADMIN no registra exámenes', async () => {
    auth.roles = ['ADMIN']
    auth.isAdmin = true
    render(<MemoryRouter><ExamenesPage /></MemoryRouter>)
    await screen.findAllByRole('button', { name: 'Ver detalle' })
    expect(screen.queryByRole('button', { name: 'Registrar Examen' })).not.toBeInTheDocument()
  })
})
