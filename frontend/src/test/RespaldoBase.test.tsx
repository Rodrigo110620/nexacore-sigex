import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import RespaldoBase from '../components/configuracion/RespaldoBase'
import { descargarRespaldo, obtenerEstadoRespaldo } from '../services/respaldoService'

vi.mock('../services/respaldoService', () => ({ descargarRespaldo: vi.fn(), obtenerEstadoRespaldo: vi.fn() }))

const ESTADO = {
  baseDatos: 'PostgreSQL 18.6',
  tamanoBytes: 4_400_000,
  automatico: false,
  historial: [
    { fecha: '2026-11-03T21:40:00', usuario: 'Carla Méndez', archivo: 'sigex-respaldo-20261103-2140.sql', bytes: 4_200_000 },
    { fecha: '2026-10-31T18:05:00', usuario: 'Rodrigo Figueroa', archivo: 'sigex-respaldo-20261031-1805.sql', bytes: 4_000_000 },
  ],
}

beforeEach(() => {
  vi.mocked(descargarRespaldo).mockReset()
  vi.mocked(obtenerEstadoRespaldo).mockReset().mockResolvedValue(ESTADO)
})

it('IMP-10: muestra la base, el último respaldo, el tamaño y el historial', async () => {
  render(<RespaldoBase />)
  expect(await screen.findByText('PostgreSQL 18.6')).toBeInTheDocument()
  expect(screen.getAllByText('03/11/2026 21:40').length).toBeGreaterThan(0)
  expect(screen.getByText('4,2 MB')).toBeInTheDocument()
  expect(screen.getByText(/El respaldo automático nocturno está apagado/)).toBeInTheDocument()
  const historial = screen.getByRole('region', { name: 'Respaldos descargados' })
  expect(within(historial).getAllByRole('listitem')).toHaveLength(2)
  expect(within(historial).getByText('Rodrigo Figueroa')).toBeInTheDocument()
})

it('IMP-10: el ADMIN descarga el respaldo, ve el nombre del archivo y se actualiza el historial', async () => {
  vi.mocked(descargarRespaldo).mockResolvedValue('sigex-respaldo-20261031-1500.sql')
  render(<RespaldoBase />)
  await screen.findByText('PostgreSQL 18.6')

  fireEvent.click(screen.getByRole('button', { name: 'Descargar respaldo' }))

  expect(await screen.findByText('Respaldo descargado: sigex-respaldo-20261031-1500.sql')).toBeInTheDocument()
  expect(descargarRespaldo).toHaveBeenCalledTimes(1)
  expect(obtenerEstadoRespaldo).toHaveBeenCalledTimes(2)
})

it('IMP-10: si el servidor no puede generar el respaldo, muestra el motivo y permite reintentar', async () => {
  vi.mocked(descargarRespaldo).mockImplementation(() => Promise.reject(new Error('No se pudo generar el respaldo. No se pudo ejecutar pg_dump.')))
  render(<RespaldoBase />)

  fireEvent.click(screen.getByRole('button', { name: 'Descargar respaldo' }))

  expect(await screen.findByText('No se pudo generar el respaldo. No se pudo ejecutar pg_dump.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
})
