import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import RevisionFotosPage from '../pages/panel_admin/RevisionFotosPage'
import ReportarFotoModal from '../components/control/ReportarFotoModal'
import RegenerarQrModal from '../components/estudiantes/RegenerarQrModal'
import * as fotoRevision from '../services/fotoRevisionService'
import type { SolicitudRevisionFoto } from '../services/fotoRevisionService'
import { fechaCorta } from '../utils/fechaCorta'

vi.mock('../services/fotoRevisionService', async (original) => ({
  ...(await original<typeof import('../services/fotoRevisionService')>()),
  listarRevisionFotos: vi.fn(),
  aprobarFoto: vi.fn(),
  rechazarFoto: vi.fn(),
  descartarReporteFoto: vi.fn(),
  reportarFoto: vi.fn(),
  regenerarQr: vi.fn(),
}))

const cambio: SolicitudRevisionFoto = {
  idEstudiante: 1,
  codigoSis: '202104010',
  nombre: 'Ana',
  apellidos: 'Rojas Mendoza',
  carrera: 'Ingeniería de Sistemas',
  origen: 'CAMBIO',
  estado: 'PENDIENTE',
  enviadaEn: '2026-10-19T21:14:00',
  fotoUrl: '/estudiantes/1/foto-solicitud',
  fotoActualUrl: '/estudiantes/1/foto',
  reporte: null,
}

const reportada: SolicitudRevisionFoto = {
  ...cambio,
  idEstudiante: 2,
  codigoSis: '202003215',
  nombre: 'Luis',
  apellidos: 'Fernández Quiroga',
  origen: 'REPORTE',
  estado: 'ESPERANDO_FOTO',
  enviadaEn: null,
  fotoUrl: null,
  fotoActualUrl: '/estudiantes/2/foto',
  reporte: { motivo: 'NO_SE_PARECE', detalle: 'No se parece a la foto registrada.', reportadoPor: 'Carla Méndez', reportadoEn: '2026-10-20T06:12:00' },
}

function renderPagina() {
  render(
    <AuthProvider>
      <MemoryRouter>
        <RevisionFotosPage />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('RevisionFotosPage (CTA-02)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    localStorage.setItem('token', 'token-admin')
    localStorage.setItem('roles', JSON.stringify(['ADMIN']))
  })

  it('lista cambios y reportes y aprueba la foto seleccionada', async () => {
    vi.mocked(fotoRevision.listarRevisionFotos).mockResolvedValueOnce([cambio, reportada]).mockResolvedValueOnce([reportada])
    vi.mocked(fotoRevision.aprobarFoto).mockResolvedValue()
    renderPagina()

    expect(await screen.findByText('2 pendientes')).toBeInTheDocument()
    expect(screen.getAllByText('Cambio de foto').length).toBeGreaterThan(0)
    expect(screen.getByText('Reportada por control')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Aprobar foto/ }))

    await waitFor(() => expect(fotoRevision.aprobarFoto).toHaveBeenCalledWith(1))
    expect(await screen.findByText(/Se aprobó la foto de Ana Rojas Mendoza/)).toBeInTheDocument()
  })

  it('rechaza con un motivo de 5 a 200 caracteres y ofrece motivos frecuentes', async () => {
    vi.mocked(fotoRevision.listarRevisionFotos).mockResolvedValue([cambio])
    vi.mocked(fotoRevision.rechazarFoto).mockResolvedValue()
    renderPagina()

    fireEvent.click(await screen.findByRole('button', { name: /^Rechazar$/ }))
    const dialogo = screen.getByRole('dialog', { name: 'Rechazar foto' })
    fireEvent.change(within(dialogo).getByLabelText('Motivo del rechazo'), { target: { value: 'Mal' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: /Rechazar foto/ }))
    expect(within(dialogo).getByText('El motivo debe tener entre 5 y 200 caracteres.')).toBeInTheDocument()
    expect(fotoRevision.rechazarFoto).not.toHaveBeenCalled()

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Foto borrosa' }))
    fireEvent.click(within(dialogo).getByRole('button', { name: /Rechazar foto/ }))
    await waitFor(() => expect(fotoRevision.rechazarFoto).toHaveBeenCalledWith(1, 'Foto borrosa'))
  })

  it('una foto reportada sin foto nueva solo se puede descartar', async () => {
    vi.mocked(fotoRevision.listarRevisionFotos).mockResolvedValueOnce([reportada]).mockResolvedValueOnce([])
    vi.mocked(fotoRevision.descartarReporteFoto).mockResolvedValue()
    renderPagina()

    expect(await screen.findByText('El estudiante aún no envía su nueva foto')).toBeInTheDocument()
    expect(screen.getByText(/Reporte de control · Carla Méndez/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aprobar foto/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar reporte' }))

    await waitFor(() => expect(fotoRevision.descartarReporteFoto).toHaveBeenCalledWith(2))
    expect(await screen.findByText('No hay fotos por revisar')).toBeInTheDocument()
  })

  it('sin solicitudes muestra el estado vacío', async () => {
    vi.mocked(fotoRevision.listarRevisionFotos).mockResolvedValue([])
    renderPagina()
    expect(await screen.findByText('No hay fotos por revisar')).toBeInTheDocument()
  })
})

describe('ReportarFotoModal (CTA-02)', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('envía el motivo, el detalle y el examen', async () => {
    vi.mocked(fotoRevision.reportarFoto).mockResolvedValue()
    const onReportada = vi.fn()
    render(<ReportarFotoModal idEstudiante={7} idExamen={3} estudiante="Luis Fernández Quiroga" codigoSis="202003215" onClose={vi.fn()} onReportada={onReportada} />)

    fireEvent.click(screen.getByLabelText('La foto no es clara o está desactualizada'))
    fireEvent.change(screen.getByLabelText('Detalle (opcional)'), { target: { value: '  Foto antigua  ' } })
    fireEvent.click(screen.getByRole('button', { name: /Reportar foto/ }))

    await waitFor(() => expect(fotoRevision.reportarFoto).toHaveBeenCalledWith(7, { motivo: 'NO_CLARA', detalle: 'Foto antigua', idExamen: 3 }))
    expect(onReportada).toHaveBeenCalledWith(expect.stringContaining('Se reportó la foto de Luis Fernández Quiroga'))
  })

  it('muestra el error del servidor y no cierra', async () => {
    vi.mocked(fotoRevision.reportarFoto).mockRejectedValue({ response: { data: { mensaje: 'La foto de este estudiante ya fue reportada y está en revisión.' } } })
    const onReportada = vi.fn()
    render(<ReportarFotoModal idEstudiante={7} estudiante="Luis" codigoSis="1" onClose={vi.fn()} onReportada={onReportada} />)

    fireEvent.click(screen.getByRole('button', { name: /Reportar foto/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('ya fue reportada')
    expect(onReportada).not.toHaveBeenCalled()
  })
})

describe('RegenerarQrModal (CTA-02)', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('pide confirmación, regenera y avisa a qué correo se envió', async () => {
    vi.mocked(fotoRevision.regenerarQr).mockResolvedValue()
    const onClose = vi.fn()
    render(<RegenerarQrModal idEstudiante={5} nombre="Ana Rojas Mendoza" email="ana.rojas@est.umss.edu" onClose={onClose} />)

    expect(screen.getByText('ana.rojas@est.umss.edu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Regenerar y enviar/ }))

    expect(await screen.findByText(/Se envió un QR nuevo a ana.rojas@est.umss.edu/)).toBeInTheDocument()
    expect(fotoRevision.regenerarQr).toHaveBeenCalledWith(5)
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('si falla, el QR actual sigue sin cambios', async () => {
    vi.mocked(fotoRevision.regenerarQr).mockRejectedValue({ response: { data: {} } })
    render(<RegenerarQrModal idEstudiante={5} nombre="Ana Rojas Mendoza" email="ana@est.umss.edu" onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Regenerar y enviar/ }))
    expect(await screen.findByText(/Su QR actual sigue sin cambios/)).toBeInTheDocument()
  })
})

describe('fechaCorta', () => {
  it('dice hoy, ayer o la fecha', () => {
    const ahora = new Date('2026-10-20T08:03:00')
    expect(fechaCorta('2026-10-20T06:12:00', ahora)).toBe('hoy · 06:12')
    expect(fechaCorta('2026-10-19T21:14:00', ahora)).toBe('ayer · 21:14')
    expect(fechaCorta('2026-10-15T07:55:00', ahora)).toMatch(/^15 oct\.? · 07:55$/)
  })
})
