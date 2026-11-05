import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import InicioAdminPage from '../pages/Dashboard/InicioAdminPage'
import { listarExamenes, type ExamenDto } from '../services/examenService'
import { obtenerInicioAdmin, type InicioAdmin } from '../services/inicioService'
import { listarNotificaciones } from '../services/notificacionService'

const examen = (idExamen: number, asignatura: string, horaInicio: string, fecha = '2026-11-03', estado = 'programado') =>
  ({ idExamen, idParalelo: 1, asignatura, docente: 'Doc. Juan Pérez', fecha, horaInicio, duracionMinutos: 120, idAmbiente: 1,
    ambienteNombre: 'Aula 690A', estado, normasGenerales: [], normasParticulares: [] }) as ExamenDto

vi.mock('../services/inicioService')
vi.mock('../services/examenService')
vi.mock('../services/notificacionService', async (original) => ({
  ...(await original<typeof import('../services/notificacionService')>()),
  listarNotificaciones: vi.fn(),
}))

const horas = (valores: Record<number, number>) => Array.from({ length: 24 }, (_, h) => valores[h] ?? 0)

const RESUMEN: InicioAdmin = {
  ahora: '2026-11-03T14:25:00',
  hoy: { examenes: 3, enCurso: 1, asociados: 120, ingresados: 82, porIngresar: 20, ausentes: 6, incidencias: 3 },
  examenes: [
    { idExamen: 1, asociados: 60, habilitados: 58, ingresados: 52 },
    { idExamen: 2, asociados: 40, habilitados: 40, ingresados: 30 },
    { idExamen: 3, asociados: 20, habilitados: 20, ingresados: 0 },
  ],
  ingresosPorHora: horas({ 8: 50, 9: 2, 14: 30 }),
  esperadosPorHora: horas({ 18: 20 }),
  dias: ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03'].map((fecha, i) =>
    ({ fecha, asociados: 100 + i, ingresados: 90 + i, ausentes: 5, incidencias: i })),
  motivos: [{ motivo: 'No está inscrito en la materia', cantidad: 6 }, { motivo: 'Aula incorrecta', cantidad: 2 }],
  pendientes: { fotos: 2, qrDuplicados: 1, intentosHoy: 4 },
}

function Destino() {
  return <p>Destino {useLocation().pathname}</p>
}

function montar(ruta = '/dashboard/inicio', roles = ['ADMIN']) {
  localStorage.setItem('token', 'token-admin')
  localStorage.setItem('nombre', 'Carla Méndez')
  localStorage.setItem('roles', JSON.stringify(roles))
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/inicio" element={<InicioAdminPage />} />
          <Route path="/dashboard/examenes" element={<Destino />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('InicioAdminPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 10, 3, 14, 25))
    vi.mocked(obtenerInicioAdmin).mockReset().mockResolvedValue(RESUMEN)
    vi.mocked(listarExamenes).mockReset().mockResolvedValue([
      examen(1, 'Física I', '08:00:00', '2026-11-03'),
      examen(2, 'Programación Web', '14:00:00'),
      examen(2, 'Programación Web', '14:00:00'),
      examen(3, 'Cálculo II', '18:00:00'),
      examen(4, 'Química', '10:00:00', '2026-11-03', 'cancelado'),
      examen(5, 'Álgebra', '09:00:00', '2026-11-05'),
    ])
    vi.mocked(listarNotificaciones).mockReset().mockResolvedValue([
      { id: 9, tipo: 'QR_DUPLICADO', titulo: 'QR duplicado reportado', detalle: 'Programación Web · Aula 690A', idExamen: 2,
        idEstudiante: null, enlace: null, creadaEn: '2026-11-03T14:12:00', leida: false },
    ])
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('al iniciar sesión el ADMIN llega a su inicio con el resumen del día', async () => {
    montar('/dashboard')
    expect(await screen.findByRole('heading', { name: '¡Buenas tardes, Carla!' })).toBeInTheDocument()
    expect(screen.getByText('3 exámenes hoy · 1 en curso. Todo se actualiza en vivo.')).toBeInTheDocument()

    const resumen = await screen.findByRole('region', { name: 'Resumen de hoy' })
    for (const [titulo, valor] of [['Asociados hoy', '120'], ['Ingresaron', '82'], ['Por ingresar', '20'], ['Ausentes', '6'], ['Incidencias', '3']]) {
      expect(within(within(resumen).getByRole('article', { name: titulo })).getByText(valor)).toBeInTheDocument()
    }
    // Con incidencias, "Revisar" lleva a Reportes.
    expect(within(within(resumen).getByRole('article', { name: 'Incidencias' })).getByRole('link', { name: 'Revisar las incidencias en Reportes' }))
      .toHaveAttribute('href', '/dashboard/reportes')
    // 82 de 108 habilitados (ingresaron + por ingresar + ausentes).
    expect(screen.getAllByText('75,9 %').length).toBeGreaterThan(0)
  })

  it('muestra los exámenes de hoy sin cancelados ni repetidos, con su fase y avance', async () => {
    montar()
    const tabla = await screen.findByRole('region', { name: 'Exámenes de hoy' })
    const filas = within(tabla).getAllByRole('listitem')
    expect(filas.map((f) => within(f).getAllByText(/Física I|Programación Web|Cálculo II/)[0].textContent)).toEqual(['Física I', 'Programación Web', 'Cálculo II'])
    expect(within(filas[0]).getAllByText('FINALIZADO')).toHaveLength(2)
    expect(within(filas[1]).getAllByText('EN CURSO')).toHaveLength(2)
    expect(within(filas[1]).getByText('30 de 40 ingresaron')).toBeInTheDocument()
    expect(within(filas[2]).getAllByText('PRÓXIMO')).toHaveLength(2)
    expect(within(filas[1]).getByRole('link', { name: 'Ver detalle' })).toHaveAttribute('href', '/dashboard/examenes/2/1')
    // En el celular toda la fila abre el detalle, con horario y aula en una línea.
    const enCelular = within(filas[1]).getByRole('link', { name: 'Ver detalle de Programación Web' })
    expect(enCelular).toHaveAttribute('href', '/dashboard/examenes/2/1')
    expect(enCelular).toHaveTextContent('14:00 – 16:00Aula 690A')
    expect(enCelular).toHaveTextContent('30 de 40')

    const proximo = screen.getByRole('region', { name: 'Próximo examen' })
    expect(within(proximo).getByText('Cálculo II')).toBeInTheDocument()
    expect(within(proximo).getByText('Doc. Juan Pérez · 20 habilitados')).toBeInTheDocument()
  })

  it('muestra las gráficas, lo pendiente y la actividad reciente', async () => {
    montar()
    const porHora = await screen.findByRole('region', { name: 'Ingresos por hora' })
    expect(within(porHora).getByText('Hoy · pico a las 08:00 (50)')).toBeInTheDocument()
    expect(within(porHora).getByText('30 ingresos')).toBeInTheDocument()

    const semana = screen.getByRole('region', { name: 'Asistencia de los últimos 7 días' })
    expect(within(semana).getByText('Hoy')).toBeInTheDocument()

    const motivos = screen.getByRole('region', { name: 'Intentos incorrectos por motivo' })
    expect(within(motivos).getByText('6 · 75 %')).toBeInTheDocument()
    expect(within(motivos).getByRole('progressbar', { name: 'Aula incorrecta' })).toHaveAttribute('aria-valuenow', '2')

    const pendientes = screen.getByRole('region', { name: 'Incidencias por revisar' })
    expect(within(pendientes).getByText('7')).toBeInTheDocument()
    expect(within(pendientes).getByRole('link', { name: /Fotos por revisar/ })).toHaveAttribute('href', '/dashboard/estudiantes/fotos')

    expect(within(screen.getByRole('region', { name: 'Actividad reciente' })).getByText('QR duplicado reportado')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Accesos rápidos' })).getAllByRole('link')).toHaveLength(6)
  })

  it('se actualiza cada minuto y avisa si no se pudo cargar', async () => {
    montar()
    await screen.findByRole('region', { name: 'Resumen de hoy' })
    expect(obtenerInicioAdmin).toHaveBeenCalledTimes(1)
    vi.mocked(obtenerInicioAdmin).mockRejectedValueOnce(new Error('caído'))
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(obtenerInicioAdmin).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el resumen del día')
    // Se conservan los últimos datos.
    expect(screen.getByRole('region', { name: 'Resumen de hoy' })).toBeInTheDocument()
  })
})
