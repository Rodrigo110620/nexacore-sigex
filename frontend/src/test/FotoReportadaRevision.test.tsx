import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FotoReportadaModal from '../components/notificaciones/FotoReportadaModal'
import FotosReportadasReporte from '../components/control/FotosReportadasReporte'
import {
  aprobarFoto, descartarReporteFoto, listarFotosReportadas, obtenerRevisionReporte, rechazarFoto, type RevisionReporteFoto,
} from '../services/fotoRevisionService'

vi.mock('../services/fotoRevisionService', async (original) => ({
  ...(await original<typeof import('../services/fotoRevisionService')>()),
  obtenerRevisionReporte: vi.fn(),
  descartarReporteFoto: vi.fn().mockResolvedValue(undefined),
  aprobarFoto: vi.fn().mockResolvedValue(undefined),
  rechazarFoto: vi.fn().mockResolvedValue(undefined),
  listarFotosReportadas: vi.fn(),
}))
vi.mock('../services/estudianteService', () => ({ descargarFotoEstudiante: vi.fn().mockRejectedValue(new Error('sin foto en la prueba')) }))
vi.mock('../hooks/useEnVivo', () => ({ default: () => undefined }))

const solicitud = (enviada: boolean) => ({
  idEstudiante: 3, codigoSis: '124331610', nombre: 'Fernando', apellidos: 'Figueroa', carrera: 'Ing. de Sistemas',
  origen: 'REPORTE' as const, estado: enviada ? 'PENDIENTE' as const : 'ESPERANDO_FOTO' as const,
  enviadaEn: enviada ? '2026-11-06T16:10:00' : null, fotoUrl: enviada ? '/estudiantes/3/foto-solicitud' : null, fotoActualUrl: '/estudiantes/3/foto',
  reporte: { motivo: 'NO_CLARA' as const, detalle: null, reportadoPor: 'Diego Pardo', reportadoEn: '2026-11-06T15:53:07' },
})
const revision = (extra: { enviada?: boolean; puedeRevisar?: boolean } = {}): RevisionReporteFoto => ({
  idExamen: 6, examen: 'Base de Datos I', puedeRevisar: extra.puedeRevisar ?? true, solicitud: solicitud(extra.enviada ?? false),
})
const abrir = () => render(<MemoryRouter><FotoReportadaModal idEstudiante={3} nombre="Fernando Figueroa" idExamen={6} onClose={() => undefined} /></MemoryRouter>)

describe('Revisión de una foto reportada (DOCENTE y CONTROL en sus exámenes)', () => {
  beforeEach(() => {
    vi.mocked(obtenerRevisionReporte).mockReset()
    vi.mocked(descartarReporteFoto).mockClear()
    vi.mocked(aprobarFoto).mockClear()
    vi.mocked(rechazarFoto).mockClear()
  })

  it('sin foto nueva, confirma que la foto actual está bien', async () => {
    vi.mocked(obtenerRevisionReporte).mockResolvedValue(revision())
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar reporte' }))
    expect(await screen.findByText(/Se descartó el reporte de Fernando Figueroa/)).toBeInTheDocument()
    expect(descartarReporteFoto).toHaveBeenCalledWith(3)
    expect(screen.queryByRole('button', { name: /Aprobar foto/ })).not.toBeInTheDocument()
  })

  it('con foto nueva, la aprueba o la rechaza con un motivo', async () => {
    vi.mocked(obtenerRevisionReporte).mockResolvedValue(revision({ enviada: true }))
    abrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))
    fireEvent.change(screen.getByLabelText('Motivo del rechazo'), { target: { value: 'La foto sale borrosa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar foto' }))
    expect(await screen.findByText(/Se rechazó la foto de Fernando Figueroa/)).toBeInTheDocument()
    expect(rechazarFoto).toHaveBeenCalledWith(3, expect.stringMatching(/borrosa/))
  })

  it('quien no es del examen solo ve el reporte, sin poder resolverlo', async () => {
    vi.mocked(obtenerRevisionReporte).mockResolvedValue(revision({ puedeRevisar: false }))
    abrir()
    expect(await screen.findByText(/Reporte de control · Diego Pardo/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Descartar reporte' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ir al control del examen/ })).toHaveAttribute('href', '/dashboard/control/6')
  })
})

describe('Reportes → Fotos reportadas', () => {
  it('lista las pendientes y las resueltas, y abre la revisión de una pendiente', async () => {
    vi.mocked(listarFotosReportadas).mockResolvedValue([
      { idReporte: 2, idExamen: 6, examen: 'Base de Datos I', idEstudiante: 3, estudiante: 'Fernando Figueroa', codigoSis: '124331610',
        motivo: 'NO_CLARA', detalle: null, reportadoPor: 'Diego Pardo', reportadoEn: '2026-11-06T15:53:07', estado: 'PENDIENTE', resueltoEn: null },
      { idReporte: 1, idExamen: 6, examen: 'Base de Datos I', idEstudiante: 4, estudiante: 'Ana Rojas', codigoSis: '202100001',
        motivo: 'NO_SE_PARECE', detalle: 'Tiene barba', reportadoPor: 'Luis Paz', reportadoEn: '2026-11-05T09:10:00', estado: 'DESCARTADO', resueltoEn: '2026-11-05T10:00:00' },
    ])
    vi.mocked(obtenerRevisionReporte).mockResolvedValue(revision())
    render(<MemoryRouter><FotosReportadasReporte idExamen={null} /></MemoryRouter>)

    const seccion = await screen.findByRole('region', { name: 'Fotos reportadas' })
    expect(await within(seccion).findByText('1 pendiente')).toBeInTheDocument()
    const filas = within(within(seccion).getByRole('table')).getAllByRole('row').slice(1)
    expect(filas[0]).toHaveTextContent('Fernando Figueroa')
    expect(filas[0]).toHaveTextContent('Pendiente')
    expect(filas[1]).toHaveTextContent('La foto estaba bien')
    expect(within(filas[1]).queryByRole('button')).not.toBeInTheDocument()

    fireEvent.click(within(filas[0]).getByRole('button', { name: 'Revisar la foto de Fernando Figueroa' }))
    expect(await screen.findByRole('dialog', { name: 'Foto reportada' })).toBeInTheDocument()
  })
})
