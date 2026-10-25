import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import InformacionIngresoPage from '../pages/Control/InformacionIngresoPage'
import ExpulsionesReporte from '../components/control/ExpulsionesReporte'
import { listarExpulsionesExamen, type ExpulsionResponse } from '../services/expulsionService'
import { listarRegistrosControlExamen, type RegistroControlIngresoExamen } from '../services/controlIngresoService'
import { listarIntentosIngreso } from '../services/intentoIngresoService'
import { listarReportesQrDuplicado } from '../services/reporteQrDuplicadoConsultaService'
import { emitirCambioLocal } from '../services/notificacionService'

vi.mock('../components/layout/PanelLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ roles: ['CONTROL'] }) }))
vi.mock('../hooks/useExamen', () => ({ default: () => ({ idExamen: 7, asignatura: 'Cálculo I',
  ambienteNombre: 'Aula 201', fecha: '2026-10-24', horaInicio: '14:00' }) }))
vi.mock('../services/expulsionService')
vi.mock('../services/controlIngresoService', () => ({ listarRegistrosControlExamen: vi.fn() }))
vi.mock('../services/intentoIngresoService')
vi.mock('../services/reporteQrDuplicadoConsultaService')

const expulsion: ExpulsionResponse = { idExpulsion: 90, idEstudiante: 24, idExamen: 7, motivo: 'Uso de celular',
  idResponsable: 7, responsable: 'Ana Rojas', fechaHora: '2026-10-24T14:00:00.123456' }
const manual: RegistroControlIngresoExamen = { idRegistro: 91, idEstudiante: 24, idExamen: 7, estudiante: 'Luis Flores',
  codigoSis: '202600002', resultado: 'AUTORIZADO', causa: null, observaciones: null, verificacionesAdicionales: [],
  usuarioControl: 'Diego Control', fechaHora: '2026-10-24T13:30:00', tipoIngreso: 'MANUAL', justificacionManual: 'Celular apagado' }
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listarRegistrosControlExamen).mockResolvedValue([manual])
  vi.mocked(listarIntentosIngreso).mockResolvedValue([])
  vi.mocked(listarReportesQrDuplicado).mockResolvedValue([])
  vi.mocked(listarExpulsionesExamen).mockResolvedValue([expulsion])
})

async function abrirReporte() {
  render(<MemoryRouter initialEntries={['/dashboard/control/7/informacion']}><Routes>
    <Route path="/dashboard/control/:idExamen/informacion" element={<InformacionIngresoPage />} />
  </Routes></MemoryRouter>)
  await screen.findByText('1 ingreso autorizado')
  fireEvent.click(screen.getByRole('tab', { name: /Excepciones/ }))
  return screen.getByRole('region', { name: 'Expulsiones de la sesión actual' })
}

it('incluye auditoría sin duplicados y conserva ingresos manuales y no autorizados', async () => {
  vi.mocked(listarExpulsionesExamen).mockResolvedValue([expulsion, expulsion])
  vi.mocked(listarIntentosIngreso).mockResolvedValue([{ idIntento: 55, idExamen: 7, idEstudiante: 23,
    estudiante: 'Eva Pérez', codigoSis: null, identificador: '123', motivo: 'Documento inválido',
    personalControl: 'Carla Control', fechaHora: '2026-10-24T13:00:00' }])
  const reporte = within(await abrirReporte())
  expect(await reporte.findByRole('heading', { name: /Luis Flores/ })).toBeInTheDocument()
  expect(reporte.getAllByRole('listitem')).toHaveLength(1)
  expect(reporte.getByText('Examen #7 · Cálculo I')).toBeInTheDocument()
  fireEvent.click(reporte.getByText('Ver registro de expulsión'))
  expect(reporte.getByText('Uso de celular')).toBeVisible()
  expect(reporte.getByText('Ana Rojas')).toBeVisible()
  expect(reporte.getByText('2026-10-24 14:00:00.123456')).toBeVisible()
  expect(reporte.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.getByRole('tab', { name: /Excepciones/ })).toHaveTextContent('1 manual')
  fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
  expect(screen.getByText(/Celular apagado/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: /Ingresos no autorizados/ }))
  expect(within(screen.getByRole('list', { name: 'Intentos no autorizados' })).getByText('Eva Pérez')).toBeInTheDocument()
})

it('recarga al reprogramar, oculta lo anterior mientras consulta y no acumula registros', async () => {
  let devolver!: (registros: ExpulsionResponse[]) => void
  vi.mocked(listarExpulsionesExamen).mockResolvedValueOnce([expulsion])
    .mockImplementationOnce(() => new Promise((resolve) => { devolver = resolve }))
    .mockResolvedValueOnce([expulsion, expulsion])
  const reporte = within(await abrirReporte())
  await reporte.findByRole('heading', { name: /Luis Flores/ })
  act(() => emitirCambioLocal({ tipo: 'EXAMEN', idExamen: 7, idEstudiante: null }))
  await reporte.findByRole('status')
  expect(reporte.queryByText('Uso de celular')).not.toBeInTheDocument()
  await act(async () => devolver([]))
  expect(await reporte.findByText('No hay expulsiones en la sesión actual.')).toBeInTheDocument()
  act(() => emitirCambioLocal({ tipo: 'INGRESO', idExamen: 7, idEstudiante: 24 }))
  await reporte.findByRole('heading', { name: /Luis Flores/ })
  expect(reporte.getAllByRole('listitem')).toHaveLength(1)
  expect(listarExpulsionesExamen).toHaveBeenCalledTimes(3)
})

it('un fallo de expulsiones permite consultar los manuales y reintentar solo este bloque', async () => {
  vi.mocked(listarExpulsionesExamen).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([expulsion])
  const reporte = within(await abrirReporte())
  expect(await reporte.findByRole('alert')).toHaveTextContent('No se pudieron cargar las expulsiones')
  fireEvent.click(screen.getByRole('button', { name: 'Ver detalles' }))
  expect(screen.getByText(/Celular apagado/)).toBeInTheDocument()
  fireEvent.click(reporte.getByRole('button', { name: 'Reintentar expulsiones' }))
  await reporte.findByRole('heading', { name: /Luis Flores/ })
  expect(listarRegistrosControlExamen).toHaveBeenCalledTimes(1)
})

it('sin nombre en el historial muestra el identificador real, sin inventar identidad', async () => {
  render(<ExpulsionesReporte idExamen={7} controles={[]} />)
  expect(await screen.findByRole('heading', { name: 'Estudiante #24' })).toBeInTheDocument()
  expect(screen.getByText('Examen #7')).toBeInTheDocument()
})

it('ignora una respuesta pendiente de otro examen al cambiar de contexto', async () => {
  let devolver!: (registros: ExpulsionResponse[]) => void
  vi.mocked(listarExpulsionesExamen).mockImplementationOnce(() => new Promise((resolve) => { devolver = resolve }))
    .mockResolvedValueOnce([])
  const vista = render(<ExpulsionesReporte idExamen={7} controles={[]} />)
  vista.rerender(<ExpulsionesReporte idExamen={8} controles={[]} />)
  await screen.findByText('No hay expulsiones en la sesión actual.')
  await act(async () => devolver([expulsion]))
  expect(screen.queryByText('Estudiante #24')).not.toBeInTheDocument()
  expect(listarExpulsionesExamen).toHaveBeenLastCalledWith(8)
})
