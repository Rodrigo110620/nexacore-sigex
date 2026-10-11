import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import InformacionIngresoPage from '../pages/Control/InformacionIngresoPage'
import * as intentos from '../services/intentoIngresoService'
import * as controles from '../services/controlIngresoService'

vi.mock('../components/layout/PanelLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ roles: ['CONTROL'] }) }))
vi.mock('../services/intentoIngresoService')
vi.mock('../services/controlIngresoService', () => ({ listarRegistrosControlExamen: vi.fn() }))
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn().mockResolvedValue([]) }))

describe('InformacionIngresoPage (ACCS-02 / ACCS-05)', () => {
  beforeEach(() => { vi.clearAllMocks() })

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
    const intentosList = await screen.findByRole('list', { name: 'Intentos no autorizados' })
    expect(within(intentosList).getByText('Ana Pérez')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Ingresos Autorizados en Tiempo Real/ }))
    expect(screen.getByRole('tab', { name: /Ingresos Autorizados en Tiempo Real/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(await screen.findByRole('list', { name: 'Ingresos autorizados' })).getByText('Luis Flores')).toBeInTheDocument()
  })

  it('muestra listas vacías y contadores cero a partir de respuestas vacías', async () => {
    vi.mocked(intentos.listarIntentosIngreso).mockResolvedValue([])
    vi.mocked(controles.listarRegistrosControlExamen).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('No hay intentos registrados para este examen.')).toBeInTheDocument()
    expect(screen.getByText('0 intentos observados')).toBeInTheDocument()
    expect(screen.getByText('0 ingresos autorizados')).toBeInTheDocument()
  })

  it('muestra error y permite reintentar la consulta de las dos listas', async () => {
    vi.mocked(intentos.listarIntentosIngreso).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
    vi.mocked(controles.listarRegistrosControlExamen).mockResolvedValue([])
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la información de ingreso')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('No hay intentos registrados para este examen.')).toBeInTheDocument()
    expect(intentos.listarIntentosIngreso).toHaveBeenCalledTimes(2)
  })
})
