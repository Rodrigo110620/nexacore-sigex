import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import RespaldoBase from '../components/configuracion/RespaldoBase'
import { descargarRespaldo } from '../services/respaldoService'

vi.mock('../services/respaldoService', () => ({ descargarRespaldo: vi.fn() }))

afterEach(() => vi.mocked(descargarRespaldo).mockClear())

it('IMP-10: el ADMIN descarga el respaldo y ve el nombre del archivo', async () => {
  vi.mocked(descargarRespaldo).mockResolvedValue('sigex-respaldo-20261031-1500.sql')
  render(<RespaldoBase />)

  fireEvent.click(screen.getByRole('button', { name: 'Descargar respaldo' }))

  expect(await screen.findByText('Respaldo descargado: sigex-respaldo-20261031-1500.sql')).toBeInTheDocument()
  expect(descargarRespaldo).toHaveBeenCalledTimes(1)
})

it('IMP-10: si el servidor no puede generar el respaldo, muestra el motivo', async () => {
  vi.mocked(descargarRespaldo).mockImplementation(() => Promise.reject(new Error('No se pudo generar el respaldo. No se pudo ejecutar pg_dump.')))
  render(<RespaldoBase />)

  fireEvent.click(screen.getByRole('button', { name: 'Descargar respaldo' }))

  expect(await screen.findByText('No se pudo generar el respaldo. No se pudo ejecutar pg_dump.')).toBeInTheDocument()
})
