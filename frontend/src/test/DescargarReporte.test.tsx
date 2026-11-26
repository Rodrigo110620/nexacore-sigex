import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DescargarReporte from '../components/reportes/DescargarReporte'
import { descargarGrupo, descargarReporte } from '../services/exportarReporteService'

vi.mock('../services/exportarReporteService', () => ({ descargarReporte: vi.fn(), descargarGrupo: vi.fn() }))

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

  it('con varios tipos en el grupo, descarga todo el grupo junto', async () => {
    vi.mocked(descargarGrupo).mockResolvedValue(9)
    const grupo = { texto: 'Incidencias', pestanas: ['intentos', 'expulsiones'] as ('intentos' | 'expulsiones')[] }
    render(<DescargarReporte pestana="intentos" filtros={filtros} onError={vi.fn()} grupo={grupo} />)
    fireEvent.click(screen.getByRole('button', { name: /Descargar/ }))
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
    fireEvent.click(screen.getByRole('checkbox', { name: /Incluir todo «Incidencias»/ }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Excel/ }))
    await waitFor(() => expect(descargarGrupo).toHaveBeenCalledWith('Incidencias', ['intentos', 'expulsiones'], 'xlsx', filtros))
  })
})
