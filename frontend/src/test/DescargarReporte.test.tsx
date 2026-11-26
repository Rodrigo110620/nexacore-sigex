import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DescargarReporte from '../components/reportes/DescargarReporte'
import { descargarReporte } from '../services/exportarReporteService'

vi.mock('../services/exportarReporteService', () => ({ descargarReporte: vi.fn() }))

const filtros = { idExamen: 9, examen: 'Cálculo II · G1', periodo: 'Este mes', buscar: 'Ana', nombresExamen: new Map<number, string>() }

describe('Descargar reporte', () => {
  it('descarga la pestaña en Excel o en PDF con los filtros de la pantalla', async () => {
    vi.mocked(descargarReporte).mockResolvedValue(3)
    render(<DescargarReporte pestana="expulsiones" filtros={filtros} onError={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Descargar/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Excel/ }))
    await waitFor(() => expect(descargarReporte).toHaveBeenCalledWith('expulsiones', 'xlsx', filtros))
    fireEvent.click(await screen.findByRole('button', { name: /Descargar/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: /PDF/ }))
    await waitFor(() => expect(descargarReporte).toHaveBeenCalledWith('expulsiones', 'pdf', filtros))
  })

  it('si falla, avisa sin perder la pantalla', async () => {
    vi.mocked(descargarReporte).mockRejectedValue(new Error('sin red'))
    const onError = vi.fn()
    render(<DescargarReporte pestana="intentos" filtros={filtros} onError={onError} />)
    fireEvent.click(screen.getByRole('button', { name: /Descargar/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: /PDF/ }))
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringContaining('No se pudo descargar')))
  })
})
