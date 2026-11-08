import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import FotosReportadasReporte from '../components/control/FotosReportadasReporte'
import { listarFotosReportadas } from '../services/fotoRevisionService'

vi.mock('../services/fotoRevisionService', async (original) => ({
  ...(await original<typeof import('../services/fotoRevisionService')>()),
  listarFotosReportadas: vi.fn(),
}))
vi.mock('../hooks/useEnVivo', () => ({ default: () => undefined }))

describe('Reportes → Fotos reportadas', () => {
  it('lista las pendientes y las resueltas, y abre la revisión de una pendiente', async () => {
    vi.mocked(listarFotosReportadas).mockResolvedValue([
      { idReporte: 2, idExamen: 6, examen: 'Base de Datos I', idEstudiante: 3, estudiante: 'Fernando Figueroa', codigoSis: '124331610',
        motivo: 'NO_CLARA', detalle: null, reportadoPor: 'Diego Pardo', reportadoEn: '2026-11-06T15:53:07', estado: 'PENDIENTE', resueltoEn: null },
      { idReporte: 1, idExamen: 6, examen: 'Base de Datos I', idEstudiante: 4, estudiante: 'Ana Rojas', codigoSis: '202100001',
        motivo: 'NO_SE_PARECE', detalle: 'Tiene barba', reportadoPor: 'Luis Paz', reportadoEn: '2026-11-05T09:10:00', estado: 'DESCARTADO', resueltoEn: '2026-11-05T10:00:00' },
    ])
    render(<MemoryRouter><FotosReportadasReporte idExamen={null} /></MemoryRouter>)

    const seccion = await screen.findByRole('region', { name: 'Fotos reportadas' })
    expect(await within(seccion).findByText('1 pendiente')).toBeInTheDocument()
    const filas = within(within(seccion).getByRole('table')).getAllByRole('row').slice(1)
    expect(filas[0]).toHaveTextContent('Fernando Figueroa')
    expect(filas[0]).toHaveTextContent('Pendiente')
    expect(filas[1]).toHaveTextContent('La foto estaba bien')
    expect(within(filas[1]).queryByRole('button')).not.toBeInTheDocument()

    // Revisar abre la misma pantalla del ADMIN, con ese estudiante elegido.
    expect(within(filas[0]).getByRole('link', { name: 'Revisar la foto de Fernando Figueroa' }))
      .toHaveAttribute('href', '/dashboard/estudiantes/fotos?estudiante=3')
  })
})
