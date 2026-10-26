import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import InicioEstudiantePage from '../pages/PortalEstudiante/InicioEstudiantePage'
import MiQrPage from '../pages/PortalEstudiante/MiQrPage'
import {
  obtenerMiPerfil,
  obtenerMiQr,
  obtenerMisExamenes,
  SinConexionError,
  type MiExamen,
  type MiPerfilEstudiante,
} from '../services/panelEstudianteService'
import { estadoExamen, separarExamenes } from '../utils/misExamenes'

vi.mock('../services/panelEstudianteService', async (original) => ({
  ...(await original<typeof import('../services/panelEstudianteService')>()),
  obtenerMiPerfil: vi.fn(),
  obtenerMisExamenes: vi.fn(),
  obtenerMiQr: vi.fn(),
}))

const PERFIL: MiPerfilEstudiante = {
  id: 1, codigoSis: '202104010', nombre: 'Ana', apellidos: 'Rojas Mendoza', ciEnmascarado: '••••210',
  email: '202104010@est.umss.edu', telefono: null, estadoMatricula: 'MATRICULADO', condicion: 'REGULAR',
  carreras: [{ idCarrera: 2, nombreCarrera: 'Ingeniería de Sistemas', idFacultad: 1, nombreFacultad: 'FCyT' }],
  fotoUrl: '/mi/foto', solicitudFoto: null,
}

const AHORA = new Date('2026-10-20T08:00:00')
const examen = (id: number, materia: string, fecha: string, extra: Partial<MiExamen> = {}): MiExamen => ({
  idExamen: id, materia, fecha, horaInicio: '09:00:00', duracionMinutos: 120, aula: '691A',
  habilitado: true, motivoInhabilitacion: null, resultadoIngreso: null, motivoDenegacion: null, fechaHoraIngreso: null,
  expulsado: false, normasGenerales: [], normasParticulares: [],
  ...extra,
})

function renderEn(ruta: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/estudiante" element={<InicioEstudiantePage />} />
          <Route path="/estudiante/qr" element={<MiQrPage />} />
          <Route path="/estudiante/foto" element={<p>Registro obligatorio</p>} />
          <Route path="/estudiante/perfil" element={<p>Página Mi perfil</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('separarExamenes y estadoExamen', () => {
  it('separa próximos y pasados en su orden', () => {
    const lista = [
      examen(1, 'Física', '2026-10-25'),
      examen(2, 'Cálculo I', '2026-10-21'),
      examen(3, 'Álgebra', '2026-10-10', { resultadoIngreso: 'AUTORIZADO' }),
      examen(4, 'Química', '2026-10-15'),
    ]
    const { proximos, pasados, proximo } = separarExamenes(lista, AHORA)
    expect(proximos.map((e) => e.materia)).toEqual(['Cálculo I', 'Física'])
    expect(pasados.map((e) => e.materia)).toEqual(['Química', 'Álgebra'])
    expect(proximo?.materia).toBe('Cálculo I')
  })

  it('un examen en curso sigue siendo próximo hasta que termina', () => {
    const enCurso = examen(5, 'Programación', '2026-10-20', { horaInicio: '07:30:00' })
    expect(separarExamenes([enCurso], AHORA).proximo?.materia).toBe('Programación')
  })

  it('muestra la habilitación si es próximo y el resultado del ingreso si ya pasó', () => {
    expect(estadoExamen(examen(1, 'A', '2026-10-25', { habilitado: null }), false)).toBe('PENDIENTE')
    expect(estadoExamen(examen(1, 'A', '2026-10-25', { habilitado: false }), false)).toBe('NO_HABILITADO')
    expect(estadoExamen(examen(1, 'A', '2026-10-10', { resultadoIngreso: 'DENEGADO' }), true)).toBe('DENEGADO')
    expect(estadoExamen(examen(1, 'A', '2026-10-10'), true)).toBe('NO_SE_PRESENTO')
  })

  it('si ya pasó por el control, el próximo examen muestra lo que pasó ahí y no la habilitación', () => {
    const ingreso = { fechaHoraIngreso: '2026-10-25T08:05:00', resultadoIngreso: 'AUTORIZADO' as const }
    expect(estadoExamen(examen(1, 'A', '2026-10-25', ingreso), false)).toBe('INGRESO')
    expect(estadoExamen(examen(1, 'A', '2026-10-25', { resultadoIngreso: 'DENEGADO' }), false)).toBe('DENEGADO')
    expect(estadoExamen(examen(1, 'A', '2026-10-25', { ...ingreso, expulsado: true }), false)).toBe('EXPULSADO')
    expect(estadoExamen(examen(1, 'A', '2026-10-10', { ...ingreso, expulsado: true }), true)).toBe('EXPULSADO')
  })
})

describe('Panel de inicio del estudiante (CTA-03)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    vi.mocked(obtenerMiPerfil).mockResolvedValue(PERFIL)
  })

  it('muestra el próximo examen, el aviso de habilitación y las pestañas', async () => {
    vi.mocked(obtenerMisExamenes).mockResolvedValue([
      examen(1, 'Cálculo I', '2099-03-10'),
      examen(2, 'Álgebra', '2020-03-10', { resultadoIngreso: 'DENEGADO', motivoDenegacion: 'Suplantación' }),
    ])
    renderEn('/estudiante')

    expect(await screen.findByText('Estás habilitado para tu próximo examen')).toBeInTheDocument()
    expect(screen.getAllByText('Cálculo I').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /mostrar mi qr/i })).toHaveAttribute('href', '/estudiante/qr')
    await userEvent.click(screen.getByRole('tab', { name: 'Pasados (1)' }))
    expect(screen.getByText('Ingreso denegado')).toBeInTheDocument()
    expect(screen.getByText('Suplantación')).toBeInTheDocument()
  })

  it('con el examen en curso y sin ingreso, avisa dentro de su tarjeta, con el cronómetro y un solo "Mostrar mi QR"', async () => {
    // Empezó hace 10 minutos (hora de Bolivia, UTC-4, sin importar la zona de la máquina).
    const inicio = new Date(Date.now() - 10 * 60_000 - 4 * 3_600_000)
    const dos = (n: number) => String(n).padStart(2, '0')
    vi.mocked(obtenerMisExamenes).mockResolvedValue([examen(1, 'Cálculo I',
      `${inicio.getUTCFullYear()}-${dos(inicio.getUTCMonth() + 1)}-${dos(inicio.getUTCDate())}`,
      { horaInicio: `${dos(inicio.getUTCHours())}:${dos(inicio.getUTCMinutes())}:00` })])
    renderEn('/estudiante')

    const tarjeta = (await screen.findByRole('heading', { name: 'Próximo examen' })).closest('article') as HTMLElement
    expect(within(tarjeta).getByRole('status')).toHaveTextContent('ya empezó y aún no registraste tu ingreso')
    expect(within(tarjeta).getByRole('timer')).toHaveTextContent('Tiempo restante')
    expect(screen.getAllByRole('link', { name: /mostrar mi qr/i })).toHaveLength(1)
  })

  it('muestra las normas del examen y solo sus adaptaciones', async () => {
    vi.mocked(obtenerMisExamenes).mockResolvedValue([examen(1, 'Cálculo I', '2099-03-10', {
      normasGenerales: ['Presentar CI vigente', 'No usar celular'],
      normasParticulares: ['Tiempo adicional de 15 minutos'],
    })])
    renderEn('/estudiante')

    const normas = await screen.findByRole('region', { name: 'Normas del examen' })
    expect(within(normas).getByText('Presentar CI vigente')).toBeInTheDocument()
    expect(within(normas).getByText('No usar celular')).toBeInTheDocument()
    expect(within(normas).getByText('Tus adaptaciones')).toBeInTheDocument()
    expect(within(normas).getByText('Tiempo adicional de 15 minutos')).toBeInTheDocument()
    // En la lista, solo cuántas normas tiene.
    expect(screen.getByText('3 normas para este examen')).toBeInTheDocument()
  })

  it('sin normas no muestra la sección', async () => {
    vi.mocked(obtenerMisExamenes).mockResolvedValue([examen(1, 'Cálculo I', '2099-03-10')])
    renderEn('/estudiante')
    await screen.findByRole('heading', { name: 'Próximo examen' })
    expect(screen.queryByRole('region', { name: 'Normas del examen' })).not.toBeInTheDocument()
  })

  it('confirma su ingreso con la hora y el aula, sin pedirle otra vez que se presente', async () => {
    vi.mocked(obtenerMisExamenes).mockResolvedValue([examen(1, 'Cálculo I', '2099-03-10', {
      resultadoIngreso: 'AUTORIZADO', fechaHoraIngreso: '2099-03-10T08:55:00',
    })])
    renderEn('/estudiante')

    const tarjeta = (await screen.findByRole('heading', { name: 'Próximo examen' })).closest('article') as HTMLElement
    expect(within(tarjeta).getByText('Tu ingreso quedó registrado a las 08:55')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Rinde tu examen en el aula 691A.')).toBeInTheDocument()
    expect(within(tarjeta).getAllByText('Ingresó').length).toBeGreaterThan(0)
    expect(screen.queryByText('Estás habilitado para tu próximo examen')).not.toBeInTheDocument()
    // El QR pasa a segundo plano.
    expect(screen.queryByRole('link', { name: /mostrar mi qr/i })).not.toBeInTheDocument()
    expect(within(tarjeta).getByRole('link', { name: /ver mi qr/i })).toHaveAttribute('href', '/estudiante/qr')
  })

  it('si se le denegó el ingreso, lo dice en la tarjeta con el motivo', async () => {
    vi.mocked(obtenerMisExamenes).mockResolvedValue([examen(1, 'Cálculo I', '2099-03-10', {
      resultadoIngreso: 'DENEGADO', motivoDenegacion: 'El carnet no coincide',
    })])
    renderEn('/estudiante')

    const tarjeta = (await screen.findByRole('heading', { name: 'Próximo examen' })).closest('article') as HTMLElement
    expect(within(tarjeta).getByRole('alert')).toHaveTextContent('No se autorizó tu ingreso')
    expect(within(tarjeta).getByRole('alert')).toHaveTextContent('Motivo: El carnet no coincide')
    expect(screen.queryByText('Estás habilitado para tu próximo examen')).not.toBeInTheDocument()
  })

  it('si lo expulsaron, lo indica sin detalles internos y sin el QR', async () => {
    vi.mocked(obtenerMisExamenes).mockResolvedValue([examen(1, 'Cálculo I', '2099-03-10', {
      resultadoIngreso: 'AUTORIZADO', fechaHoraIngreso: '2099-03-10T08:55:00', expulsado: true,
      fechaHoraExpulsion: '2099-03-10T09:40:00',
    })])
    renderEn('/estudiante')

    const tarjeta = (await screen.findByRole('heading', { name: 'Próximo examen' })).closest('article') as HTMLElement
    expect(within(tarjeta).getByRole('alert')).toHaveTextContent('Tu participación en este examen fue anulada a las 09:40')
    // Su cronómetro queda detenido en la hora de la expulsión.
    expect(within(tarjeta).getByRole('timer')).toHaveTextContent('Cronómetro detenido')
    expect(within(tarjeta).getAllByText('Expulsado').length).toBeGreaterThan(0)
    expect(within(tarjeta).queryByText(/Tu ingreso quedó registrado/)).not.toBeInTheDocument()
    expect(within(tarjeta).queryByRole('link', { name: /qr/i })).not.toBeInTheDocument()
  })

  it('como el personal, Mi perfil está en el menú de cuenta y no en la navegación', async () => {
    vi.mocked(obtenerMisExamenes).mockResolvedValue([])
    renderEn('/estudiante')
    await screen.findByText('No tienes exámenes programados')
    expect(screen.queryByRole('link', { name: 'Mi perfil' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Mi QR/ }).length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: /Menú de cuenta/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Mi perfil' }))
    expect(await screen.findByText('Página Mi perfil')).toBeInTheDocument()
  })

  it('advierte si no está habilitado, con la razón', async () => {
    vi.mocked(obtenerMisExamenes).mockResolvedValue([
      examen(1, 'Cálculo I', '2099-03-10', { habilitado: false, motivoInhabilitacion: 'Deuda en biblioteca' }),
    ])
    renderEn('/estudiante')
    expect(await screen.findByText('No estás habilitado para Cálculo I')).toBeInTheDocument()
    expect(screen.getByText('Razón: Deuda en biblioteca.')).toBeInTheDocument()
  })

  it('indica si la habilitación está pendiente', async () => {
    vi.mocked(obtenerMisExamenes).mockResolvedValue([examen(1, 'Cálculo I', '2099-03-10', { habilitado: null })])
    renderEn('/estudiante')
    expect(await screen.findByText('Tu habilitación para Cálculo I está pendiente')).toBeInTheDocument()
  })

  it('sin exámenes lo informa y sin conexión permite reintentar', async () => {
    vi.mocked(obtenerMisExamenes).mockRejectedValueOnce(new SinConexionError()).mockResolvedValueOnce([])
    renderEn('/estudiante')
    expect(await screen.findByText(/No hay conexión a Internet/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    expect(await screen.findByText('No tienes exámenes programados')).toBeInTheDocument()
  })

  it('si la foto es obligatoria lo manda a registrarla', async () => {
    vi.mocked(obtenerMiPerfil).mockResolvedValue({ ...PERFIL, fotoUrl: null })
    vi.mocked(obtenerMisExamenes).mockResolvedValue([])
    renderEn('/estudiante')
    expect(await screen.findByText('Registro obligatorio')).toBeInTheDocument()
  })
})

describe('Mi QR (CTA-03)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    vi.mocked(obtenerMiPerfil).mockResolvedValue(PERFIL)
  })
  afterEach(() => { vi.useRealTimers() })

  const qr = (segundos = 60) => ({
    contenido: 'qr', pngBase64: 'iVBORw0KGgo=', expiraEn: new Date(Date.now() + segundos * 1000).toISOString(), segundosValidez: 60,
  })

  it('muestra el QR temporal con su cuenta regresiva y el examen habilitado', async () => {
    vi.mocked(obtenerMiQr).mockResolvedValue(qr())
    vi.mocked(obtenerMisExamenes).mockResolvedValue([examen(1, 'Cálculo I', '2099-03-10')])
    renderEn('/estudiante/qr')
    expect(await screen.findByRole('img', { name: 'Tu código QR de ingreso' })).toBeInTheDocument()
    // Con la máquina cargada pueden pasar unos segundos antes de revisar: basta con que la cuenta corra cerca de 60.
    expect(screen.getByText(/Se renueva en (5\d|60) s/)).toBeInTheDocument()
    expect(await screen.findByText('Acceso habilitado')).toBeInTheDocument()
  })

  it('pide un QR nuevo antes de que venza', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(obtenerMiQr).mockResolvedValue(qr(10))
    vi.mocked(obtenerMisExamenes).mockResolvedValue([])
    renderEn('/estudiante/qr')
    await screen.findByRole('img', { name: 'Tu código QR de ingreso' })
    expect(obtenerMiQr).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(8000) })
    expect(obtenerMiQr).toHaveBeenCalledTimes(2)
  })

  it('sin conexión no muestra un QR y permite reintentar', async () => {
    vi.mocked(obtenerMiQr).mockRejectedValueOnce(new SinConexionError()).mockResolvedValueOnce(qr())
    vi.mocked(obtenerMisExamenes).mockResolvedValue([])
    renderEn('/estudiante/qr')
    expect(await screen.findByText('Sin conexión a Internet')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Tu código QR de ingreso' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    expect(await screen.findByRole('img', { name: 'Tu código QR de ingreso' })).toBeInTheDocument()
  })

  it('si no está habilitado lo marca sobre el QR y explica la razón', async () => {
    vi.mocked(obtenerMiQr).mockResolvedValue(qr())
    vi.mocked(obtenerMisExamenes).mockResolvedValue([
      examen(1, 'Cálculo I', '2099-03-10', { habilitado: false, motivoInhabilitacion: 'Deuda en biblioteca' }),
    ])
    renderEn('/estudiante/qr')
    expect(await screen.findByText('No estás habilitado para este examen')).toBeInTheDocument()
    expect(screen.getAllByText('No habilitado').length).toBeGreaterThan(0)
    expect(screen.getByText('Razón: Deuda en biblioteca.')).toBeInTheDocument()
  })
})
