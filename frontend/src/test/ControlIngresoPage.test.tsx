import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ControlIngresoPage from '../pages/Control/ControlIngresoPage'
import * as service from '../services/controlIngresoService'
import type { ContextoControlIngreso } from '../types/controlIngreso'

vi.mock('../components/layout/PanelLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('../services/controlIngresoService')
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ nombre: 'Carla Control' }) }))

const contextoBase: ContextoControlIngreso = {
  idEstudiante: 10,
  estudiante: 'Laura Paredes',
  codigoSis: '20261234',
  documento: '74839201',
  idExamen: 20,
  asignatura: 'INF-101 - Programación',
  fecha: '2026-10-15',
  horaInicio: '10:00:00',
  duracionMinutos: 120,
  ambiente: 'Aula 401',
  normasGenerales: ['Presentar CI'],
  normasParticulares: ['Tiempo adicional'],
  habilitado: true,
  motivoInhabilitacion: null,
  ingresoRegistrado: false,
  fechaHoraIngreso: null,
}

function renderPage(contexto: ContextoControlIngreso = contextoBase) {
  vi.mocked(service.obtenerContextoControl).mockResolvedValue(contexto)
  vi.mocked(service.obtenerTiposIncidencia).mockResolvedValue([
    { id: 3, nombre: 'DOCUMENTO_MAL_ESTADO', descripcion: null },
  ])
  return render(
    <MemoryRouter initialEntries={['/control/10/20']}>
      <Routes><Route path="/control/:idEstudiante/:idExamen" element={<ControlIngresoPage />} /><Route path="/dashboard/control/:idExamen/identificar" element={<p>Identificación del examen</p>} /></Routes>
    </MemoryRouter>,
  )
}

describe('ControlIngresoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(service.obtenerHistorialControl).mockResolvedValue([])
  })

  it('carga el contexto y muestra datos y normas', async () => {
    renderPage()
    expect(await screen.findByText('Laura Paredes')).toBeInTheDocument()
    expect(screen.getByText('INF-101 - Programación')).toBeInTheDocument()
    expect(screen.getByText('Presentar CI')).toBeInTheDocument()
    expect(screen.getByText('Tiempo adicional')).toBeInTheDocument()
  })

  it('permite volver a identificar cuando el ingreso ya está registrado', async () => {
    renderPage({ ...contextoBase, ingresoRegistrado: true })
    await screen.findByText('El ingreso ya fue registrado para este examen.')
    fireEvent.click(screen.getByRole('button', { name: 'Volver a identificar estudiante' }))
    expect(await screen.findByText('Identificación del examen')).toBeInTheDocument()
  })

  it('autoriza enviando observaciones, verificaciones e incidencia', async () => {
    vi.mocked(service.autorizarIngreso).mockResolvedValue({
      autorizado: true, resultado: 'AUTORIZADO', causa: null,
      fechaHoraIngreso: '2026-09-26T18:00:00Z', autorizadoPor: 'Carla Control',
    })
    renderPage()
    await screen.findByText('Laura Paredes')
    fireEvent.change(screen.getByPlaceholderText('Estudiante ingresa con credencial oficial en regla'), { target: { value: 'Sin novedades' } })
    expect(screen.getByRole('button', { name: 'Autorizar Ingreso' })).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Identidad biométrica cotejada / Carnet físico verificado'))
    fireEvent.click(screen.getByLabelText('Documento en mal estado'))
    fireEvent.change(screen.getByPlaceholderText('Opcional: describe la incidencia...'), { target: { value: 'Documento deteriorado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar Ingreso' }))

    await waitFor(() => expect(service.autorizarIngreso).toHaveBeenCalledWith({
      idEstudiante: 10,
      idExamen: 20,
      observaciones: 'Sin novedades',
      identidadVerificada: true,
      verificacionesAdicionales: ['Identidad biométrica cotejada / Carnet físico verificado'],
      incidencias: [{ idTipoIncidencia: 3, descripcion: 'Documento deteriorado' }],
    }))
    expect(await screen.findByText('Ingreso autorizado')).toBeInTheDocument()
  })

  it('permite registrar una denegación sin mostrar el botón de autorizar', async () => {
    vi.mocked(service.denegarIngreso).mockResolvedValue({
      autorizado: false, resultado: 'DENEGADO_CONTROL', causa: 'Deuda pendiente',
      fechaHoraIngreso: '2026-09-26T18:00:00Z', autorizadoPor: 'Carla Control',
    })
    renderPage({ ...contextoBase, habilitado: false, motivoInhabilitacion: 'Deuda pendiente' })

    expect(await screen.findByText('Deuda pendiente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Autorizar Ingreso' })).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Estudiante ingresa con credencial oficial en regla'), { target: { value: 'Se informó al estudiante' } })
    fireEvent.click(screen.getByRole('button', { name: 'Denegar' }))
    expect(screen.getByRole('button', { name: 'Confirmar Denegación' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Razón de denegación/), { target: { value: 'Deuda pendiente' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Denegación' }))

    await waitFor(() => expect(service.denegarIngreso).toHaveBeenCalledWith(expect.objectContaining({
      idEstudiante: 10,
      idExamen: 20,
      observaciones: 'Deuda pendiente — Se informó al estudiante',
      identidadVerificada: false,
    })))
    expect(await screen.findByText('Ingreso denegado')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar resultado' }))
    expect(screen.getByRole('button', { name: 'Autorizar Ingreso' })).toBeDisabled()
  })

  it('consulta y muestra el historial con los campos disponibles', async () => {
    vi.mocked(service.obtenerHistorialControl).mockResolvedValue([{
      idRegistro: 91,
      idEstudiante: 10,
      idExamen: 20,
      resultado: 'DENEGADO',
      causa: 'Matrícula observada',
      observaciones: 'Se informó al estudiante',
      verificacionesAdicionales: ['Identidad contrastada'],
      usuarioControl: 'Carla Control',
      fechaHora: '2026-09-26T18:00:00Z',
    }])
    renderPage()
    await screen.findByText('Laura Paredes')
    fireEvent.click(screen.getByRole('button', { name: /Historial del control/ }))

    expect(await screen.findByText('Personal de control: Carla Control')).toBeInTheDocument()
    expect(screen.getByText('Causa: Matrícula observada')).toBeInTheDocument()
    expect(screen.getByText('Observaciones: Se informó al estudiante')).toBeInTheDocument()
    expect(screen.getAllByText('Identidad contrastada')).toHaveLength(1)
  })

  it('muestra errores de carga sin presentar datos incompletos', async () => {
    vi.mocked(service.obtenerContextoControl).mockRejectedValue(new Error('fallo'))
    vi.mocked(service.obtenerTiposIncidencia).mockResolvedValue([])
    render(
      <MemoryRouter initialEntries={['/control/10/20']}>
        <Routes><Route path="/control/:idEstudiante/:idExamen" element={<ControlIngresoPage />} /></Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la información')
    expect(screen.queryByText('Laura Paredes')).not.toBeInTheDocument()
  })
})
