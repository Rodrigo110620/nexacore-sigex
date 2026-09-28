import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import ControlExamenPage from '../pages/Control/ControlExamenPage'
import {
  listarEstudiantesExamen,
  obtenerResumenExamen,
  type EstudianteAsignado,
} from '../services/controlExamenService'

vi.mock('../services/controlExamenService')
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn().mockResolvedValue([]) }))

const estudiante = (id: number, nombre: string, estado: EstudianteAsignado['estado']): EstudianteAsignado => ({
  idEstudiante: id,
  nombre,
  apellidos: 'Flores',
  codigoSis: `20210400${id}`,
  ci: `748921${id}`,
  carrera: 'Ingeniería de Sistemas',
  estado,
  motivoInhabilitacion: estado === 'DESHABILITADO' ? 'Deuda en biblioteca' : null,
  ingresado: false,
})

function Destino() {
  const { pathname, search } = useLocation()
  return <p>Destino {pathname + search}</p>
}

function renderPage() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard/control/7']}>
        <Routes>
          <Route path="/dashboard/control/:idExamen" element={<ControlExamenPage />} />
          <Route path="/dashboard/control/:idExamen/identificar" element={<Destino />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('ControlExamenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'token-control')
    localStorage.setItem('roles', JSON.stringify(['CONTROL']))
    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 45, habilitados: 42, noHabilitados: 3, ingresados: 10 })
    vi.mocked(listarEstudiantesExamen).mockResolvedValue({
      contenido: [estudiante(1, 'María', 'HABILITADO'), estudiante(2, 'Luis', 'DESHABILITADO')],
      pagina: 0,
      tamano: 10,
      totalRegistros: 45,
      totalPaginas: 5,
    })
  })

  it('muestra las estadísticas del resumen y las filas con su estado', async () => {
    renderPage()
    const filas = within(await screen.findByRole('table')).getAllByRole('row')

    expect(within(await screen.findByRole('region', { name: 'Total asignados' })).getByText('45')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Habilitados' })).getByText('93.3%')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Con observación' })).getByText('3')).toBeInTheDocument()
    expect(within(filas[1]).getByText('María Flores')).toBeInTheDocument()
    expect(within(filas[1]).getByText('HABILITADO')).toBeInTheDocument()
    expect(within(filas[2]).getByText('NO HABILITADO')).toBeInTheDocument()
    expect(within(filas[2]).getByText('7489212')).toBeInTheDocument()
    expect(listarEstudiantesExamen).toHaveBeenCalledWith(7, 'TODOS', 0)
    expect(screen.getByRole('link', { name: /Iniciar Control de Ingreso/ })).toHaveAttribute('href', '/dashboard/control/7/identificar')
  })

  it('al cambiar de pestaña pide ese estado desde la página 0', async () => {
    renderPage()
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('button', { name: 'Ir a la página 2' }))
    await waitFor(() => expect(listarEstudiantesExamen).toHaveBeenLastCalledWith(7, 'TODOS', 1))
    await screen.findByRole('table')

    fireEvent.click(await screen.findByRole('button', { name: 'No habilitados (3)' }))

    expect(screen.getByRole('button', { name: 'No habilitados (3)' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(listarEstudiantesExamen).toHaveBeenLastCalledWith(7, 'NO_HABILITADOS', 0))
  })

  it('el ojo lleva a la identificación con ?codigo= del estudiante', async () => {
    renderPage()
    const tabla = await screen.findByRole('table')

    fireEvent.click(within(tabla).getByRole('link', { name: 'Identificar a Luis Flores' }))

    expect(await screen.findByText('Destino /dashboard/control/7/identificar?codigo=202104002')).toBeInTheDocument()
  })
})
