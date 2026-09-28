import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import ControlInicioPage from '../pages/Control/ControlInicioPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import { obtenerResumenExamen } from '../services/controlExamenService'
import type { ExamenDto } from '../services/examenService'

const examenes = vi.hoisted(() => {
  const examen = (idExamen: number, asignatura: string, fecha: string, horaInicio: string, estado = 'programado') =>
    ({ idExamen, idParalelo: 1, asignatura, sigla: `SIG-${idExamen}`, docente: 'Prof. Hernán Ramos', fecha, horaInicio,
      duracionMinutos: 120, idAmbiente: 1, ambienteNombre: idExamen === 8 ? 'Lab 115' : 'Aula 204', estado,
      normasGenerales: [], normasParticulares: [] }) as ExamenDto
  return [
    examen(7, 'Cálculo I', '2026-10-15', '10:00:00'),
    examen(8, 'Física I', '2026-10-15', '14:00:00'),
    examen(9, 'Química', '2026-10-15', '10:00:00', 'cancelado'),
    examen(10, 'Álgebra', '2026-10-16', '08:00:00'),
  ]
})

vi.mock('../services/controlExamenService')
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn().mockResolvedValue(examenes) }))

function Destino() {
  return <p>Destino {useLocation().pathname}</p>
}

/** Renderiza y espera el avance del examen en curso, para no dejar actualizaciones pendientes. */
async function renderRuta(ruta = '/dashboard/inicio') {
  localStorage.setItem('token', 'token-control')
  localStorage.setItem('roles', JSON.stringify(['CONTROL']))
  const resultado = render(
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
  await screen.findByText('21.4%')
  return resultado
}

describe('ControlInicioPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 15, 10, 30)) // hora local: Cálculo I (10:00, 120 min) está en curso
    vi.mocked(obtenerResumenExamen).mockReset()
    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 45, habilitados: 42, noHabilitados: 3, ingresados: 9 })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra el examen en curso con su avance y lo refresca cada 30 s hasta salir', async () => {
    const { unmount } = await renderRuta()
    const enCurso = await screen.findByRole('article', { name: 'Examen en curso: Cálculo I' })

    expect(within(enCurso).getByText('21.4%')).toBeInTheDocument()
    expect(within(enCurso).getByText('/ 42 habilitados')).toBeInTheDocument()
    expect(within(enCurso).getByText('33')).toBeInTheDocument()
    expect(within(enCurso).getByRole('link', { name: /Iniciar Control de Ingreso/ })).toHaveAttribute('href', '/dashboard/control/7')
    expect(screen.queryByRole('article', { name: /Química/ })).not.toBeInTheDocument()
    expect(obtenerResumenExamen).toHaveBeenCalledTimes(1)

    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(obtenerResumenExamen).toHaveBeenCalledTimes(2)
    unmount()
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(obtenerResumenExamen).toHaveBeenCalledTimes(2)
  })

  it('filtra los exámenes del día por fecha y por búsqueda, sin los cancelados', async () => {
    await renderRuta()
    const lista = await screen.findByRole('region', { name: /Todos los exámenes del día/i })
    const nombres = () => within(lista).queryAllByRole('listitem').map((li) => li.querySelector('p')?.textContent)

    expect(nombres()).toEqual(['Cálculo I', 'Física I'])
    fireEvent.change(screen.getByLabelText('Buscar exámenes del día'), { target: { value: 'lab 115' } })
    expect(nombres()).toEqual(['Física I'])
    fireEvent.change(screen.getByLabelText('Buscar exámenes del día'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Fecha:'), { target: { value: '2026-10-16' } })
    expect(nombres()).toEqual(['Álgebra'])
  })

  it('"Iniciar control" navega a /dashboard/control/{id}', async () => {
    await renderRuta()
    fireEvent.click(await screen.findByRole('link', { name: 'Iniciar control de Física I' }))
    expect(await screen.findByText('Destino /dashboard/control/8')).toBeInTheDocument()
  })

  it('CONTROL en /dashboard termina en /dashboard/inicio', async () => {
    await renderRuta('/dashboard')
    expect(await screen.findByRole('region', { name: /Exámenes activos ahora/i })).toBeInTheDocument()
  })
})
