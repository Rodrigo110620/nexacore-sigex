import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import ControlHoyPage from '../pages/Control/ControlHoyPage'
import type { ExamenDto } from '../services/examenService'

const auth = vi.hoisted(() => ({ roles: ['CONTROL'] as string[], permisos: null as string[] | null }))
const panel = vi.hoisted(() => ({ examenes: [] as unknown[] }))
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../components/layout/PanelLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../components/navigation/MobileBottomNav', () => ({ default: () => null }))
vi.mock('../components/examenes/CronometroExamen', () => ({ default: () => <span>cronómetro</span> }))
// Hoy = 10/11/2026 a las 10:00 en la hora local del equipo: la pantalla compara con la hora local, y el CI
// corre en UTC (con «-04:00» fijo, allí serían las 14:00 y el examen de las 09:30 ya habría terminado).
const AHORA = new Date(2026, 10, 10, 10, 0, 0)
vi.mock('../hooks/usePanelControl', () => ({ default: () => ({ examenes: panel.examenes, error: undefined, ahora: AHORA, recargar: vi.fn() }) }))
vi.mock('../hooks/useResumenesExamenes', () => ({ default: () => ({ resumenes: { 1: { total: 30, habilitados: 30, noHabilitados: 0, ingresados: 27 } }, recargar: vi.fn() }) }))

const ex = (id: number, asignatura: string, fecha: string, horaInicio: string): ExamenDto => ({
  idExamen: id, idParalelo: id, asignatura, grupo: 'G1', docente: 'Docente', fecha, horaInicio, duracionMinutos: 90,
  idAmbiente: 1, ambienteNombre: '608', estado: 'programado', normasGenerales: [], normasParticulares: [],
})
beforeEach(() => {
  auth.roles = ['CONTROL']
  panel.examenes = [
    ex(1, 'Base de Datos I', '2026-11-10', '09:30:00'), // en curso
    ex(2, 'Redes', '2026-11-10', '15:00:00'),           // próximo
    ex(3, 'Cálculo', '2026-11-10', '07:00:00'),         // terminado
    ex(4, 'Física', '2026-11-12', '08:00:00'),          // otro día: no aparece
  ]
})
const montar = () => render(<MemoryRouter><ControlHoyPage /></MemoryRouter>)

it('Control es el tablero del día: en curso con sus contadores, próximos y terminados plegados', () => {
  montar()
  const enCurso = screen.getByRole('listitem', { name: 'En curso: Base de Datos I · G1' })
  expect(enCurso).toHaveTextContent('27/30')
  expect(enCurso).toHaveTextContent('3 ausentes')
  expect(within(enCurso).getByRole('link', { name: 'Iniciar control de Base de Datos I · G1' })).toHaveAttribute('href', '/dashboard/control/1')
  expect(screen.getByRole('listitem', { name: 'Próximo: Redes · G1' })).toHaveTextContent('Abre a las')
  expect(screen.queryByText('Física · G1')).not.toBeInTheDocument()
  const terminados = screen.getByRole('button', { name: 'Terminados hoy (1)' })
  expect(screen.queryByText('Cálculo · G1')).not.toBeInTheDocument()
  fireEvent.click(terminados)
  expect(screen.getByText('Cálculo · G1')).toBeInTheDocument()
})

it('el ADMIN supervisa: «Ver control» en lugar de «Iniciar control»', () => {
  auth.roles = ['ADMIN']
  montar()
  expect(screen.getByRole('link', { name: 'Ver control de Base de Datos I · G1' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Ver todos los exámenes/ })).toHaveAttribute('href', '/dashboard/examenes')
})

it('sin exámenes hoy muestra el próximo', () => {
  panel.examenes = [ex(4, 'Física', '2026-11-12', '08:00:00')]
  montar()
  expect(screen.getByText('Hoy no hay exámenes')).toBeInTheDocument()
  expect(screen.getByText('Física · G1')).toBeInTheDocument()
})

it('el historial guarda los exámenes de días anteriores, con buscador y fecha', () => {
  panel.examenes = [
    ex(1, 'Base de Datos I', '2026-11-10', '09:30:00'),
    ex(5, 'Álgebra', '2026-11-07', '08:00:00'),
    { ...ex(6, 'Redes', '2026-11-05', '08:00:00'), docente: 'Ana Rojas' },
  ]
  montar()
  expect(screen.queryByText('Álgebra · G1')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: /Historial/ }))
  expect(screen.getByText('Álgebra · G1')).toBeInTheDocument()
  expect(screen.getByText('Redes · G1')).toBeInTheDocument()
  expect(screen.queryByText('Base de Datos I · G1')).not.toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Buscar en el historial'), { target: { value: 'rojas' } })
  expect(screen.queryByText('Álgebra · G1')).not.toBeInTheDocument()
  expect(screen.getByText('Redes · G1')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Buscar en el historial'), { target: { value: '' } })
  fireEvent.change(screen.getByLabelText('Filtrar por fecha'), { target: { value: '2026-11-07' } })
  expect(screen.getByText('Álgebra · G1')).toBeInTheDocument()
  expect(screen.queryByText('Redes · G1')).not.toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Buscar en el historial'), { target: { value: 'nada' } })
  expect(screen.getByText('Sin resultados para los filtros aplicados.')).toBeInTheDocument()
})
