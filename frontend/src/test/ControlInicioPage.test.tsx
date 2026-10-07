import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import ControlInicioPage from '../pages/Control/ControlInicioPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import { obtenerResumenExamen } from '../services/controlExamenService'
import { listarExamenes, type ExamenDto } from '../services/examenService'

const examenes = vi.hoisted(() => {
  const examen = (idExamen: number, asignatura: string, horaInicio: string, ambienteNombre: string, fecha = '2026-10-15', estado = 'programado') =>
    ({ idExamen, idParalelo: 1, asignatura, sigla: `SIG-${idExamen}`, docente: 'Prof. Hernán Ramos', fecha, horaInicio,
      duracionMinutos: 120, idAmbiente: 1, ambienteNombre, estado, normasGenerales: [], normasParticulares: [] }) as ExamenDto
  return [
    examen(7, 'Cálculo I', '10:00:00', 'Aula 204'),
    examen(8, 'Física I', '14:00:00', 'Lab 115'),
    examen(9, 'Química', '10:00:00', 'Aula 204', '2026-10-15', 'cancelado'),
    examen(10, 'Álgebra', '08:00:00', 'Aula 105', '2026-10-16'),
    examen(11, 'Programación', '11:00:00', 'Aula 301'),
    examen(12, 'Biología', '08:00:00', 'Aula 204'),
  ]
})

vi.mock('../services/controlExamenService')
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn().mockResolvedValue(examenes) }))

function Destino() {
  return <p>Destino {useLocation().pathname}</p>
}

function montar(ruta: string, roles: string[]) {
  localStorage.setItem('token', 'token-control')
  localStorage.setItem('nombre', 'Ana Rojas')
  localStorage.setItem('roles', JSON.stringify(roles))
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/inicio" element={<ControlInicioPage />} />
          <Route path="/dashboard/control/:idExamen" element={<Destino />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

/** Panel de CONTROL: espera el avance del examen en curso, para no dejar actualizaciones pendientes. */
async function renderPanel(ruta = '/dashboard/inicio', roles = ['CONTROL']) {
  const resultado = montar(ruta, roles)
  await screen.findByText('21.4%')
  return resultado
}

const delDia = () => screen.getByRole('region', { name: /Todos los exámenes del día/i })
const grupos = () => within(delDia()).getAllByRole('group').map((g) => g.getAttribute('aria-label'))
const fila = (asignatura: string) => within(delDia()).getByText(asignatura).closest('li') as HTMLElement

describe('ControlInicioPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 15, 10, 30)) // hora local: Cálculo I (10:00, 120 min) está en curso
    vi.mocked(listarExamenes).mockClear()
    vi.mocked(obtenerResumenExamen).mockReset()
    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 45, habilitados: 42, noHabilitados: 3, ingresados: 9 })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('CONTROL ve CONTROL DE INGRESO y el examen en curso con su avance, que se refresca cada 30 s', async () => {
    const { unmount } = await renderPanel()
    const activos = screen.getByRole('region', { name: /Exámenes activos ahora/i })
    const enCurso = within(activos).getByRole('article', { name: 'Examen en curso: Cálculo I' })

    expect(screen.getAllByText(/control de ingreso/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bienvenido, Ana Rojas').length).toBeGreaterThan(0)
    expect(within(activos).getByText('EN CURSO')).toBeInTheDocument()
    expect(within(enCurso).getByText('/ 42 habilitados')).toBeInTheDocument()
    expect(within(enCurso).getByText('33')).toBeInTheDocument()
    expect(within(enCurso).getByRole('link', { name: /Iniciar Control de Ingreso/ })).toHaveAttribute('href', '/dashboard/control/7')
    expect(within(activos).getAllByRole('article')).toHaveLength(1)
    expect(obtenerResumenExamen).toHaveBeenCalledTimes(1)

    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(obtenerResumenExamen).toHaveBeenCalledTimes(2)
    unmount()
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(obtenerResumenExamen).toHaveBeenCalledTimes(2)
  })

  it('agrupa los exámenes del día en EN CURSO, PRÓXIMOS y FINALIZADOS con su estado y las restantes', async () => {
    await renderPanel()

    expect(grupos()).toEqual(['Exámenes en curso', 'Exámenes próximos', 'Exámenes finalizados'])
    expect(within(delDia()).getByText('3 evaluaciones restantes')).toBeInTheDocument()
    expect(within(fila('Cálculo I')).getByText('En curso')).toBeInTheDocument()
    expect(within(fila('Programación')).getByText('Comienza en 30 min')).toHaveClass('text-[#B45309]')
    expect(within(fila('Física I')).getByText('Comienza en 3 horas')).not.toHaveClass('text-[#B45309]')
    expect(within(fila('Física I')).getAllByText('Lab 115 · 14:00 - 16:00')).toHaveLength(2)
    expect(within(fila('Biología')).getByText('Finalizado')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Fecha:'), { target: { value: '2026-10-16' } })
    expect(grupos()).toEqual(['Exámenes próximos'])
    expect(within(fila('Álgebra')).getByText('Programado')).not.toHaveClass('text-[#B45309]')
    expect(within(delDia()).getByText('1 evaluación restante')).toBeInTheDocument()
  })

  it('filtra los exámenes del día por asignatura o ambiente, sin los cancelados', async () => {
    await renderPanel()
    const nombres = () => within(delDia()).queryAllByRole('listitem').map((li) => li.querySelector('p')?.textContent)
    const buscador = screen.getByPlaceholderText('Buscar por asignatura o ambiente...')

    expect(nombres()).toEqual(['Cálculo I', 'Programación', 'Física I', 'Biología'])
    fireEvent.change(buscador, { target: { value: 'lab 115' } })
    expect(nombres()).toEqual(['Física I'])
    fireEvent.change(buscador, { target: { value: 'algebra' } })
    expect(within(delDia()).getByText('Sin resultados para “algebra”.')).toBeInTheDocument()
  })

  it('"Iniciar control" navega a /dashboard/control/{id}', async () => {
    await renderPanel()
    fireEvent.click(screen.getByRole('link', { name: 'Iniciar control de Física I' }))
    expect(await screen.findByText('Destino /dashboard/control/8')).toBeInTheDocument()
  })

  it.each([
    ['CONTROL en /dashboard', '/dashboard', ['CONTROL']],
    ['ADMIN + CONTROL en Inicio', '/dashboard/inicio', ['ADMIN', 'CONTROL']],
    ['ADMIN en Inicio', '/dashboard/inicio', ['ADMIN']],
  ])('%s ve el panel de control de ingreso', async (_caso, ruta, roles) => {
    await renderPanel(ruta, roles)
    expect(screen.getByRole('region', { name: /Exámenes activos ahora/i })).toBeInTheDocument()
  })
})
