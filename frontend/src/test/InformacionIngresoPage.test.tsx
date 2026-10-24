import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import InformacionIngresoPage from '../pages/Control/InformacionIngresoPage'
import * as intentos from '../services/intentoIngresoService'
import * as controles from '../services/controlIngresoService'
import * as reportes from '../services/reporteQrDuplicadoConsultaService'

vi.mock('../components/layout/PanelLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ roles: ['CONTROL'] }) }))
vi.mock('../services/intentoIngresoService')
vi.mock('../services/controlIngresoService', () => ({ listarRegistrosControlExamen: vi.fn() }))
vi.mock('../services/reporteQrDuplicadoConsultaService', () => ({ listarReportesQrDuplicado: vi.fn() }))
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn().mockResolvedValue([]) }))

describe('InformacionIngresoPage (ACCS-02 / ACCS-05)', () => {
  it('INCI-02 muestra el responsable y el motivo del ingreso manual en Excepciones', async () => {
    vi.mocked(intentos.listarIntentosIngreso).mockResolvedValue([])
    vi.mocked(controles.listarRegistrosControlExamen).mockResolvedValue([{
      idRegistro: 91, idEstudiante: 24, idExamen: 7, estudiante: 'Luis Flores', codigoSis: '202600002',
      resultado: 'AUTORIZADO', causa: null, observaciones: null, verificacionesAdicionales: [],
      usuarioControl: 'Diego Control', fechaHora: '2026-10-24T13:30:00', tipoIngreso: 'MANUAL', justificacionManual: 'Celular apagado, no presenta QR',
    }])
    renderPage()
    await screen.findByText('1 ingreso autorizado')
    fireEvent.click(screen.getByRole('tab', { name: /Ingresos manuales/ }))
    expect(screen.getByText('Luis Flores')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    expect(screen.getByText(/Celular apagado, no presenta QR/)).toBeInTheDocument()
    expect(screen.getAllByText(/Diego Control/).length).toBeGreaterThan(0)
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(reportes.listarReportesQrDuplicado).mockResolvedValue([])
  })

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/dashboard/control/7/informacion']}>
        <Routes>
          <Route path="/dashboard/control/:idExamen/informacion" element={<InformacionIngresoPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('presenta contadores derivados y permite alternar entre intentos y autorizaciones reales', async () => {
    vi.mocked(intentos.listarIntentosIngreso).mockResolvedValue([{
      idIntento: 2, idExamen: 7, idEstudiante: 23, estudiante: 'Ana Pérez', codigoSis: '202600001',
      identificador: '202600001', motivo: 'Intentó ingresar a un examen ajeno', personalControl: 'Carla Control',
      fechaHora: '2026-10-08T14:00:00',
    }])
    vi.mocked(controles.listarRegistrosControlExamen).mockResolvedValue([{
      idRegistro: 91, idEstudiante: 24, idExamen: 7, estudiante: 'Luis Flores', codigoSis: '202600002',
      resultado: 'AUTORIZADO', causa: null, observaciones: null, verificacionesAdicionales: [],
      usuarioControl: 'Diego Control', fechaHora: '2026-10-08T13:30:00',
    }])

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Información de ingreso tiempo real' })).toBeInTheDocument()
    expect(intentos.listarIntentosIngreso).toHaveBeenCalledWith(7)
    expect(controles.listarRegistrosControlExamen).toHaveBeenCalledWith(7)
    expect(screen.getByText('1 intento observado')).toBeInTheDocument()
    expect(screen.getByText('1 ingreso autorizado')).toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal móvil' })
    expect(within(navigation).getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Control' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual([
      expect.stringContaining('Ingresos Autorizados en Tiempo Real'),
      expect.stringContaining('Ingresos manuales'),
      expect.stringContaining('Ingresos no autorizados'),
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    expect(screen.getByText('Tipo de ingreso:')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Ingresos no autorizados/ }))
    const intentosList = await screen.findByRole('list', { name: 'Intentos no autorizados' })
    expect(within(intentosList).getByText('Ana Pérez')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
    expect(screen.getByText('Motivo:')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Ingresos Autorizados en Tiempo Real/ }))
    expect(screen.getByRole('tab', { name: /Ingresos Autorizados en Tiempo Real/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(await screen.findByRole('list', { name: 'Ingresos autorizados' })).getAllByText('Luis Flores').length).toBeGreaterThan(0)
  })

  it('muestra listas vacías y contadores cero a partir de respuestas vacías', async () => {
    vi.mocked(intentos.listarIntentosIngreso).mockResolvedValue([])
    vi.mocked(controles.listarRegistrosControlExamen).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No hay ingresos autorizados registrados para este examen.')).toBeInTheDocument()
    expect(screen.getByText('0 intentos observados')).toBeInTheDocument()
    expect(screen.getByText('0 ingresos autorizados')).toBeInTheDocument()
  })

  it('muestra error y permite reintentar la consulta de las dos listas', async () => {
    vi.mocked(intentos.listarIntentosIngreso).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
    vi.mocked(controles.listarRegistrosControlExamen).mockResolvedValue([])
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la información de ingreso')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No hay ingresos autorizados registrados para este examen.')).toBeInTheDocument()
    expect(intentos.listarIntentosIngreso).toHaveBeenCalledTimes(2)
  })
})
