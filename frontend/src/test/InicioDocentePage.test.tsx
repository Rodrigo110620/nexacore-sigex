import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InicioDocentePage from '../pages/Dashboard/InicioDocentePage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import { obtenerResumenExamen } from '../services/controlExamenService'
import { listarExamenes, type ExamenDto } from '../services/examenService'
import { obtenerInicioDocente, type InicioDocente } from '../services/inicioService'

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ nombre: 'Docente Prueba', roles: ['DOCENTE'], isAdmin: false }) }))
vi.mock('../components/layout/PanelLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('../components/navigation/MobileBottomNav', () => ({ default: () => null }))
vi.mock('../services/estudianteService', () => ({ getFacultades: vi.fn().mockResolvedValue([{ id: 1, nombre: 'Ciencias y Tecnología' }]) }))
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn() }))

vi.mock('../hooks/useReloj', () => ({ default: () => Date.parse('2026-11-04T02:10:00Z') }))
vi.mock('../services/controlExamenService', () => ({ obtenerResumenExamen: vi.fn() }))
vi.mock('../services/inicioService', () => ({ obtenerInicioDocente: vi.fn() }))

const porHora = (pares: Record<number, number> = {}) => Array.from({ length: 24 }, (_, h) => pares[h] ?? 0)
const panel = (extra: Partial<InicioDocente> = {}): InicioDocente => ({
  ahora: '2026-11-03T22:10:00', grupos: 3, estudiantes: 214, expulsionesHoy: 1, ingresosPorHora: porHora({ 21: 5 }), expulsionesPorHora: porHora({ 21: 1 }),
  materias: [
    { idMateria: 1, sigla: 'SIS-301', nombre: 'Programación Web', grupos: ['G1', 'G2'], estudiantes: 96,
      proximoExamen: { idExamen: 1, fecha: '2026-11-03', horaInicio: '22:00:00', duracionMinutos: 60 }, asistencia: 94 },
    { idMateria: 2, sigla: 'SIS-302', nombre: 'Bases de Datos I', grupos: ['G1'], estudiantes: 78, proximoExamen: null, asistencia: null },
  ],
  recientes: [
    { fecha: '2026-11-03T22:05:00', tipo: 'EXPULSION', estudiante: 'Marco Paz Rivas', materia: 'Programación Web', detalle: 'Uso de celular' },
    { fecha: '2026-11-03T22:01:00', tipo: 'INGRESO', estudiante: 'Ana Rojas Vera', materia: 'Programación Web', detalle: '690B' },
  ],
  ...extra,
})

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
    vi.mocked(obtenerInicioDocente).mockReset()
    vi.mocked(obtenerInicioDocente).mockResolvedValue(panel())
  })

  // Secciones 15 y 18 del diseño en un solo panel: banner, indicadores, exámenes de hoy, mis materias y registros.
  it('entra por Inicio y muestra su panel: indicadores, mis materias y registros', async () => {
    vi.mocked(listarExamenes).mockResolvedValue([])
    montar()
    expect(await screen.findByRole('heading', { name: /Buenas noches, Docente!/ })).toBeInTheDocument()
    const indicadores = await screen.findByRole('region', { name: 'Mis indicadores' })
    expect(within(indicadores).getByRole('article', { name: 'Mis materias' })).toHaveTextContent('3 grupos asignados por el ADMIN')
    expect(within(indicadores).getByRole('article', { name: 'Mis estudiantes' })).toHaveTextContent('214')
    expect(within(indicadores).getByRole('article', { name: 'Expulsiones hoy' })).toHaveTextContent('1')
    const materias = screen.getByRole('region', { name: 'Mis materias' })
    expect(within(materias).getByText('SIS-301 · Grupos G1 y G2')).toBeInTheDocument()
    expect(within(materias).getByText('Asistencia 94 %')).toBeInTheDocument()
    expect(within(materias).getByRole('link', { name: /Programar el primer examen/ })).toHaveAttribute('href', '/dashboard/examenes?nuevo=1')
    const registros = screen.getByRole('list', { name: 'Registros de mis exámenes' })
    expect(within(registros).getAllByRole('listitem')[0]).toHaveTextContent('Expulsión · Marco Paz Rivas')
    expect(within(registros).getAllByRole('listitem')[1]).toHaveTextContent('Programación Web · Aula 690B')
    // El selector de grupo ya no está: lo reemplazan las tarjetas de Mis materias.
    expect(screen.queryByRole('heading', { name: '¿Qué grupo deseas gestionar hoy?' })).not.toBeInTheDocument()
  })

  it('sin materias asignadas lo dice y pide contactar al administrador', async () => {
    vi.mocked(listarExamenes).mockResolvedValue([])
    vi.mocked(obtenerInicioDocente).mockResolvedValue(panel({ materias: [], grupos: 0, estudiantes: 0, recientes: [] }))
    montar()
    expect(await screen.findByRole('heading', { name: 'Aún no tienes materias asignadas' })).toBeInTheDocument()
    expect(screen.getByText('Contacta al administrador del sistema.')).toBeInTheDocument()
  })

  it('muestra los exámenes del día boliviano en la lista compacta con sus cifras en vivo', async () => {
    vi.mocked(listarExamenes).mockResolvedValue([
      { idExamen: 1, idParalelo: 7, asignatura: 'Programación Web', grupo: 'G1', fecha: '2026-11-03', horaInicio: '22:00', duracionMinutos: 60, estado: 'programado', ambienteNombre: '690A' },
      { idExamen: 2, idParalelo: 8, asignatura: 'Otro día', fecha: '2026-11-04', horaInicio: '14:00', duracionMinutos: 60, estado: 'programado' },
    ] as ExamenDto[])
    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 100, habilitados: 96, noHabilitados: 4, ingresados: 82, expulsados: 1 })
    montar()

    const lista = await screen.findByRole('list', { name: 'Mis exámenes de hoy' })
    const fila = within(lista).getByRole('link', { name: 'Programación Web · G1: ver panel del examen' })
    expect(fila).toHaveAttribute('href', '/dashboard/control/1')
    expect(await within(fila).findByText('85 %')).toBeInTheDocument()
    expect(fila).toHaveTextContent('96 habilitados')
    expect(fila).toHaveTextContent('82 ingresados')
    expect(fila).toHaveTextContent('14 ausentes')
    expect(fila).toHaveTextContent('1 expulsado (cuenta como ingresado)')
    expect(within(fila).getByText('En vivo')).toBeInTheDocument()
    expect(screen.getByText(/1 examen hoy · 1 en curso/)).toBeInTheDocument()
    expect(screen.queryByText(/Otro día/)).toBeNull()
  })

  it('distingue en vivo, próximo (con la hora en que abre) y finalizado', async () => {
    vi.mocked(listarExamenes).mockResolvedValue([
      { idExamen: 11, idParalelo: 1, asignatura: 'En curso', fecha: '2026-11-03', horaInicio: '21:30', duracionMinutos: 120, estado: 'programado', ambienteNombre: '609' },
      { idExamen: 12, idParalelo: 2, asignatura: 'Próximo', fecha: '2026-11-03', horaInicio: '23:30', duracionMinutos: 90, estado: 'programado', ambienteNombre: '612' },
      { idExamen: 13, idParalelo: 3, asignatura: 'Terminado', fecha: '2026-11-03', horaInicio: '18:00', duracionMinutos: 60, estado: 'programado', ambienteNombre: '608' },
    ] as ExamenDto[])
    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 12, habilitados: 10, noHabilitados: 2, ingresados: 8 })
    montar()

    expect(await screen.findByText(/3 exámenes hoy · 1 en curso/)).toBeInTheDocument()
    const lista = screen.getByRole('list', { name: 'Mis exámenes de hoy' })
    expect(within(lista).getByText('En vivo')).toBeInTheDocument()
    expect(within(lista).getByText('PRÓXIMO')).toBeInTheDocument()
    expect(within(lista).getByText('FINALIZADO')).toBeInTheDocument()
    expect(within(lista).getByText('Abre a las 23:15')).toBeInTheDocument()
  })

  it('muestra el próximo examen cuando no hay exámenes hoy', async () => {
    vi.mocked(listarExamenes).mockResolvedValue([
      { idExamen: 1, idParalelo: 7, asignatura: 'Programación Web', fecha: '2026-11-05', horaInicio: '14:00', duracionMinutos: 60, estado: 'programado', ambienteNombre: '690A' },
    ] as ExamenDto[])
    montar()

    expect(await screen.findByText('No tienes exámenes hoy')).toBeInTheDocument()
    expect(screen.getByText(/Tu próximo examen: Programación Web · 05\/11\/2026 · 14:00, Aula 690A/)).toBeInTheDocument()
    expect(obtenerResumenExamen).not.toHaveBeenCalled()
  })
})
