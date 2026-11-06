import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import ControlInicioPage from '../pages/Control/ControlInicioPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import { obtenerResumenExamen } from '../services/controlExamenService'
import { listarExamenes, type ExamenDto } from '../services/examenService'
import { obtenerInicioControl, type InicioControl } from '../services/inicioService'
import { aperturaControl } from '../utils/tiempoExamen'

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
vi.mock('../services/inicioService', () => ({ obtenerInicioControl: vi.fn() }))

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

const porHora = (pares: Record<number, number> = {}) => Array.from({ length: 24 }, (_, h) => pares[h] ?? 0)
const registro = (i: number): InicioControl['recientes'][number] => ({
  fecha: `2026-10-15T10:${String(29 - i).padStart(2, '0')}:05`, tipo: i === 1 ? 'INTENTO' : i === 2 ? 'INGRESO_MANUAL' : 'INGRESO',
  estudiante: i === 1 ? null : `Estudiante ${i}`, codigo: i === 1 ? '9999999' : `20200000${i}`, examen: 'Cálculo I',
})
const mios = (extra: Partial<InicioControl> = {}): InicioControl => ({
  ahora: '2026-10-15T10:30:00', ingresos: 9, ingresosManuales: 1, intentosIncorrectos: 2, fotosReportadas: 1, qrDuplicados: 0, expulsiones: 0,
  ingresosPorHora: porHora({ 9: 3, 10: 6 }), intentosPorHora: porHora({ 10: 2 }), fotosPorHora: porHora({ 10: 1 }), qrPorHora: porHora(),
  recientes: Array.from({ length: 8 }, (_, i) => registro(i)), ...extra,
})

/** Panel de CONTROL: espera los contadores del examen en curso, para no dejar actualizaciones pendientes. */
async function renderPanel(ruta = '/dashboard/inicio', roles = ['CONTROL']) {
  const resultado = montar(ruta, roles)
  const enCurso = await screen.findByRole('article', { name: 'Examen en curso: Cálculo I' })
  await within(enCurso).findByText('33')
  return resultado
}

describe('ControlInicioPage (sección 17 de Figma)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 15, 10, 30)) // hora local: Cálculo I (10:00, 120 min) está en curso
    vi.mocked(listarExamenes).mockClear()
    vi.mocked(obtenerResumenExamen).mockReset()
    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 45, habilitados: 42, noHabilitados: 3, ingresados: 9 })
    vi.mocked(obtenerInicioControl).mockReset()
    vi.mocked(obtenerInicioControl).mockResolvedValue(mios())
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('saluda, resume el día y muestra el examen en curso con sus contadores, que se refrescan cada 30 s', async () => {
    const { unmount } = await renderPanel()
    const banner = screen.getByRole('region', { name: 'Bienvenida' })
    expect(within(banner).getByRole('heading', { name: '¡Buenos días, Ana!' })).toBeInTheDocument()
    expect(within(banner).getByText('Hoy hay 4 exámenes · 1 en curso. Tus registros se guardan con tu nombre.')).toBeInTheDocument()
    expect(within(banner).getByText(/21[.,]4 %/)).toBeInTheDocument()
    expect(within(banner).getByRole('link', { name: /Escanear QR/ })).toHaveAttribute('href', '/dashboard/control/7/identificar')

    const enCurso = screen.getByRole('article', { name: 'Examen en curso: Cálculo I' })
    expect(within(enCurso).getByText('42')).toBeInTheDocument()
    expect(within(enCurso).getByText('Aula 204')).toBeInTheDocument()
    expect(within(enCurso).getByRole('link', { name: 'Escanear QR en Cálculo I' })).toHaveAttribute('href', '/dashboard/control/7/identificar')
    expect(within(enCurso).getByRole('link', { name: 'Buscar por CI o código en Cálculo I' })).toHaveAttribute('href', '/dashboard/control/7/identificar')
    expect(within(enCurso).getByRole('link', { name: 'Ver ingresos de Cálculo I' })).toHaveAttribute('href', '/dashboard/control/7')
    expect(screen.getAllByRole('article', { name: /Examen en curso/ })).toHaveLength(1)

    // Un resumen por examen de hoy (sin el cancelado ni el de mañana).
    expect(obtenerResumenExamen).toHaveBeenCalledTimes(4)
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(obtenerResumenExamen).toHaveBeenCalledTimes(8)
    unmount()
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(obtenerResumenExamen).toHaveBeenCalledTimes(8)
  })

  it('muestra sus 4 indicadores y sus registros de hoy, con la opción de ver todos', async () => {
    await renderPanel()
    const indicadores = screen.getByRole('region', { name: 'Mis indicadores de hoy' })
    expect(within(within(indicadores).getByRole('article', { name: 'Ingresos que registré' })).getByText('Hoy · 8 por QR o CI y 1 manual')).toBeInTheDocument()
    expect(within(indicadores).getByRole('article', { name: 'Intentos incorrectos' })).toHaveTextContent('2')
    expect(within(indicadores).getByRole('article', { name: 'Fotos reportadas' })).toHaveTextContent('Pendientes de revisión del ADMIN')
    expect(within(indicadores).getByRole('article', { name: 'QR duplicados' })).toHaveTextContent('Ninguno reportado hoy')
    expect(screen.getByRole('img', { name: 'Ingresos que registré: por hora' })).toBeInTheDocument()

    const tabla = screen.getByRole('table', { name: 'Mis registros de hoy' })
    const filas = () => within(tabla).getAllByRole('row').slice(1)
    expect(filas()).toHaveLength(6)
    expect(filas()[0]).toHaveTextContent('10:29:05Estudiante 0Cálculo I202000000Ingreso')
    expect(filas()[1]).toHaveTextContent('10:28:059999999Cálculo I9999999Intento incorrecto')
    expect(filas()[2]).toHaveTextContent('Ingreso manual')
    fireEvent.click(screen.getByRole('button', { name: /Ver todos mis registros/ }))
    expect(filas()).toHaveLength(8)
  })

  it('lista los exámenes de hoy con su estado, su avance y a qué hora abre el próximo', async () => {
    await renderPanel()
    const lista = screen.getByRole('region', { name: 'Exámenes de hoy' })
    const items = within(lista).getAllByRole('listitem')
    expect(items.map((li) => li.getAttribute('aria-label'))).toEqual(
      ['Examen de hoy: Biología', 'Examen de hoy: Cálculo I', 'Examen de hoy: Programación', 'Examen de hoy: Física I'])
    expect(items[0]).toHaveTextContent('FINALIZADO')
    expect(items[0]).toHaveTextContent('9 de 42')
    expect(items[1]).toHaveTextContent('EN CURSO')
    expect(items[2]).toHaveTextContent('PRÓXIMO')
    expect(items[2]).toHaveTextContent(`Abre a las ${aperturaControl('2026-10-15', '11:00:00').hora}`)
    expect(within(items[3]).getByRole('link')).toHaveAttribute('href', '/dashboard/control/8')
  })

  it('sin examen en curso lo dice y avisa cuál es el próximo', async () => {
    vi.setSystemTime(new Date(2026, 9, 15, 7, 0))
    montar('/dashboard/inicio', ['CONTROL'])
    expect(await screen.findByText('No hay exámenes en curso en este momento.')).toBeInTheDocument()
    expect(screen.getByText(/El próximo es Biología a las 08:00/)).toBeInTheDocument()
    await screen.findByText('Hoy · 8 por QR o CI y 1 manual')
  })

  it('si no se cargan sus registros, se puede reintentar', async () => {
    vi.mocked(obtenerInicioControl).mockReset()
    vi.mocked(obtenerInicioControl).mockRejectedValueOnce(new Error('caído')).mockResolvedValue(mios())
    montar('/dashboard/inicio', ['CONTROL'])
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Hoy · 8 por QR o CI y 1 manual')).toBeInTheDocument()
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
