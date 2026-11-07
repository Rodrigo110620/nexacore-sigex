import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InicioDocentePage from '../pages/Dashboard/InicioDocentePage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import { obtenerResumenExamen } from '../services/controlExamenService'
import { listarExamenes, type ExamenDto } from '../services/examenService'

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ nombre: 'Docente Prueba', roles: ['DOCENTE'], isAdmin: false }) }))
vi.mock('../components/layout/PanelLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('../components/navigation/MobileBottomNav', () => ({ default: () => null }))
vi.mock('../services/estudianteService', () => ({ getFacultades: vi.fn().mockResolvedValue([{ id: 1, nombre: 'Ciencias y Tecnología' }]) }))
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn() }))

vi.mock('../hooks/useReloj', () => ({ default: () => Date.parse('2026-11-04T02:10:00Z') }))
vi.mock('../services/controlExamenService', () => ({ obtenerResumenExamen: vi.fn() }))

function Destino() {
  const location = useLocation()
  return <p>Destino {location.pathname}{location.search}</p>
}

function montar() {
  render(<MemoryRouter initialEntries={['/dashboard']}><Routes>
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/dashboard/inicio" element={<InicioDocentePage />} />
    <Route path="/dashboard/examenes" element={<Destino />} />
  </Routes></MemoryRouter>)
}

describe('Inicio del docente', () => {
  beforeEach(() => {
    vi.mocked(listarExamenes).mockReset()
    vi.mocked(obtenerResumenExamen).mockReset()
  })

  it('entra por Inicio, muestra un solo grupo por paralelo y abre sus exámenes', async () => {
    vi.mocked(listarExamenes).mockResolvedValue([
      { idExamen: 1, idParalelo: 7, asignatura: 'Base de Datos I', sigla: 'INF-272', estado: 'programado' },
      { idExamen: 2, idParalelo: 7, asignatura: 'Base de Datos I', sigla: 'INF-272', estado: 'programado' },
    ] as ExamenDto[])
    montar()
    expect(await screen.findByRole('heading', { name: '¿Qué grupo deseas gestionar hoy?' })).toBeInTheDocument()
    await screen.findByRole('option', { name: 'Base de Datos I (INF-272)' })
    expect(screen.getByLabelText('Grupo')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Materia'), { target: { value: 'Base de Datos I' } })
    expect(within(screen.getByLabelText('Grupo')).getAllByRole('option', { name: 'Grupo 7' })).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Grupo'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ir a mis exámenes de este grupo' }))
    expect(screen.getByText('Destino /dashboard/examenes?paralelo=7')).toBeInTheDocument()
  })

  it('sin asignaciones muestra el estado vacío e impide abrir un grupo inexistente', async () => {
    vi.mocked(listarExamenes).mockResolvedValue([])
    montar()
    expect(await screen.findByText('Aún no tienes exámenes o grupos asignados.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a mis exámenes de este grupo' })).toBeDisabled()
  })

  it('muestra los exámenes del día boliviano con sus cifras y accesos', async () => {
    vi.mocked(listarExamenes).mockResolvedValue([
      { idExamen: 1, idParalelo: 7, asignatura: 'Programación Web', fecha: '2026-11-03', horaInicio: '22:00', duracionMinutos: 60, estado: 'programado', ambienteNombre: '690A' },
      { idExamen: 2, idParalelo: 8, asignatura: 'Otro día', fecha: '2026-11-04', horaInicio: '14:00', duracionMinutos: 60, estado: 'programado' },
    ] as ExamenDto[])
    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 100, habilitados: 96, noHabilitados: 4, ingresados: 82 })
    montar()

    expect(await screen.findByText('82 de 96 ingresaron')).toBeInTheDocument()
    expect(screen.getByText(/1 examen hoy, 1 en curso/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Programación Web · Grupo 7' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Otro día/ })).toBeNull()
    expect(screen.getByRole('link', { name: 'Ver panel del examen' })).toHaveAttribute('href', '/dashboard/examenes/1/7')
    expect(screen.getByRole('link', { name: 'Controlar ingreso' })).toHaveAttribute('href', '/dashboard/control/1')
  })

  it('distingue en curso, no iniciado y finalizado, y no permite controlar uno terminado', async () => {
    vi.mocked(listarExamenes).mockResolvedValue([
      { idExamen: 11, idParalelo: 1, asignatura: 'En curso', fecha: '2026-11-03', horaInicio: '21:30', duracionMinutos: 120, estado: 'programado', ambienteNombre: '609' },
      { idExamen: 12, idParalelo: 2, asignatura: 'Próximo', fecha: '2026-11-03', horaInicio: '23:30', duracionMinutos: 90, estado: 'programado', ambienteNombre: '612' },
      { idExamen: 13, idParalelo: 3, asignatura: 'Terminado', fecha: '2026-11-03', horaInicio: '18:00', duracionMinutos: 60, estado: 'programado', ambienteNombre: '608' },
    ] as ExamenDto[])
    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 12, habilitados: 10, noHabilitados: 2, ingresados: 8 })
    montar()

    expect(await screen.findByText(/3 exámenes hoy, 1 en curso/)).toBeInTheDocument()
    expect(screen.getAllByText('En curso').length).toBeGreaterThan(0)
    expect(screen.getByText('No iniciado')).toBeInTheDocument()
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Controlar ingreso' })).toHaveLength(2)
  })

  it('muestra el próximo examen cuando no hay exámenes hoy', async () => {
    vi.mocked(listarExamenes).mockResolvedValue([
      { idExamen: 1, idParalelo: 7, asignatura: 'Programación Web', fecha: '2026-11-05', horaInicio: '14:00', duracionMinutos: 60, estado: 'programado', ambienteNombre: '690A' },
    ] as ExamenDto[])
    montar()

    expect(await screen.findByRole('heading', { name: 'No tienes exámenes hoy' })).toBeInTheDocument()
    expect(screen.getByText(/Tu próximo examen: Programación Web · jueves 05\/11\/2026 · 14:00, Aula 690A/)).toBeInTheDocument()
    expect(obtenerResumenExamen).not.toHaveBeenCalled()
  })
})
