import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InicioDocentePage from '../pages/Dashboard/InicioDocentePage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import { listarExamenes, type ExamenDto } from '../services/examenService'

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ nombre: 'Docente Prueba', roles: ['DOCENTE'], isAdmin: false }) }))
vi.mock('../components/layout/PanelLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('../components/navigation/MobileBottomNav', () => ({ default: () => null }))
vi.mock('../services/estudianteService', () => ({ getFacultades: vi.fn().mockResolvedValue([{ id: 1, nombre: 'Ciencias y Tecnología' }]) }))
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn() }))

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
  beforeEach(() => { vi.mocked(listarExamenes).mockReset() })

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
})
