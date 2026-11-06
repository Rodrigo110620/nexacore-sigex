import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MisRegistrosControl from '../components/inicio/MisRegistrosControl'
import { obtenerInicioControl, type InicioControl } from '../services/inicioService'
import { emitirCambioLocal } from '../services/notificacionService'

vi.mock('../services/inicioService', () => ({ obtenerInicioControl: vi.fn() }))

const porHora = (pares: Record<number, number>) => Array.from({ length: 24 }, (_, h) => pares[h] ?? 0)
const datos = (extra: Partial<InicioControl> = {}): InicioControl => ({
  ahora: '2026-11-06T14:40:00', ingresos: 3, ingresosManuales: 1, intentosIncorrectos: 2, fotosReportadas: 1, qrDuplicados: 0, expulsiones: 1,
  ingresosPorHora: porHora({ 13: 1, 14: 2 }),
  recientes: [
    { fecha: '2026-11-06T14:38:10', tipo: 'INTENTO', estudiante: null, codigo: '9999999', examen: 'Cálculo I' },
    { fecha: '2026-11-06T14:30:00', tipo: 'INGRESO_MANUAL', estudiante: 'Beto Rojas', codigo: '209600002', examen: 'Cálculo I' },
  ],
  ...extra,
})

describe('Inicio de CONTROL: mis registros de hoy', () => {
  beforeEach(() => vi.mocked(obtenerInicioControl).mockReset())

  it('muestra sus indicadores, sus ingresos por hora y sus últimos registros', async () => {
    vi.mocked(obtenerInicioControl).mockResolvedValue(datos())
    render(<MisRegistrosControl />)
    expect(await screen.findByText('Ingresos')).toBeInTheDocument()
    expect(screen.getByText('1 manual')).toBeInTheDocument()
    expect(screen.getByText('Intentos incorrectos').previousSibling).toHaveTextContent('2')
    expect(screen.getByText('QR duplicados y expulsiones').previousSibling).toHaveTextContent('1')
    expect(screen.getByRole('img', { name: /Mis ingresos por hora/ })).toBeInTheDocument()
    const lista = within(screen.getByRole('list', { name: 'Mis últimos registros' })).getAllByRole('listitem')
    expect(lista[0]).toHaveTextContent('14:389999999Cálculo IIntento incorrecto')
    expect(lista[1]).toHaveTextContent('14:30Beto Rojas209600002 · Cálculo IIngreso manual')
  })

  it('sin registros lo dice y se actualiza cuando registra un ingreso', async () => {
    vi.mocked(obtenerInicioControl).mockResolvedValue(datos({ ingresos: 0, ingresosManuales: 0, intentosIncorrectos: 0, fotosReportadas: 0,
      expulsiones: 0, ingresosPorHora: porHora({}), recientes: [] }))
    render(<MisRegistrosControl />)
    expect(await screen.findByText('Aún no registraste nada hoy.')).toBeInTheDocument()

    vi.mocked(obtenerInicioControl).mockResolvedValue(datos({ ingresos: 1, ingresosManuales: 0, intentosIncorrectos: 0, fotosReportadas: 0, expulsiones: 0,
      recientes: [{ fecha: '2026-11-06T14:41:00', tipo: 'INGRESO', estudiante: 'Ana Paz', codigo: '209600001', examen: 'Cálculo I' }] }))
    act(() => emitirCambioLocal({ tipo: 'INGRESO', idExamen: 1, idEstudiante: 1 }))
    expect(await screen.findByText('Ana Paz')).toBeInTheDocument()
    expect(screen.getByText('Sin incidencias en tus registros de hoy.')).toBeInTheDocument()
  })

  it('si falla, se puede reintentar', async () => {
    vi.mocked(obtenerInicioControl).mockRejectedValueOnce(new Error('caído')).mockResolvedValue(datos())
    render(<MisRegistrosControl />)
    const reintentar = await screen.findByRole('button', { name: 'Reintentar' })
    act(() => reintentar.click())
    expect(await screen.findByText('Ingresos')).toBeInTheDocument()
  })
})
