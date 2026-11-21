import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ResumenReportes from '../components/reportes/ResumenReportes'
import useFilasNuevas from '../hooks/useFilasNuevas'
import GraficoPorHora from '../components/reportes/GraficoPorHora'
import type { ResumenReportes as ResumenReportesData } from '../hooks/useResumenReportes'

const H = Array<number>(24).fill(0)
const C = { porHora: H, porHoraAyer: H, ultimoHoy: null, porMotivo: [] }

const RESUMEN: ResumenReportesData = {
  intentos: { total: 12, hoy: 3, ayer: 5, ...C },
  expulsiones: { total: 2, hoy: 0, ayer: 1, ...C },
  excepciones: null,
  fotos: { total: 4, hoy: 1, ayer: 0, ...C },
  modificaciones: { total: 0, hoy: 0, ayer: 0, ...C },
  'ingresos-qr': null,      
  'ingresos-manual': null,
}

describe('Resumen de Reportes', () => {
  it('muestra total, hoy y ayer de cada tipo y al tocar una tarjeta abre su pestaña', () => {
    const onElegir = vi.fn()
    render(<ResumenReportes resumen={RESUMEN} activa="intentos" onElegir={onElegir} />)
    expect(screen.getByRole('button', { name: 'Intentos incorrectos: 12, 3 hoy' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('+3 hoy')).toBeInTheDocument()
    expect(screen.getByText('ayer 5')).toBeInTheDocument()
    expect(screen.getAllByText('Nada hoy')).toHaveLength(1)
    // Sin datos todavía (excepciones): la tarjeta queda cargando, sin número.
    expect(screen.getByRole('button', { name: 'Excepciones' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Fotos reportadas:/ }))
    expect(onElegir).toHaveBeenCalledWith('fotos')
  })
})

describe('useFilasNuevas', () => {
  it('marca solo lo que llega en vivo y lo desmarca después; la primera carga y otro examen no marcan', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ ids, contexto }) => useFilasNuevas(ids, contexto), {
      initialProps: { ids: [1, 2] as number[] | undefined, contexto: 'todos' },
    })
    act(() => { vi.advanceTimersByTime(10) })
    expect(result.current.size).toBe(0)

    rerender({ ids: [3, 1, 2], contexto: 'todos' })
    act(() => { vi.advanceTimersByTime(10) })
    expect([...result.current]).toEqual([3])

    act(() => { vi.advanceTimersByTime(8000) })
    expect(result.current.size).toBe(0)

    rerender({ ids: [9], contexto: 'examen 5' })
    act(() => { vi.advanceTimersByTime(10) })
    expect(result.current.size).toBe(0)
    vi.useRealTimers()
  })
})

describe('GraficoPorHora', () => {
  it('compara hoy con ayer, da la hora pico y el último registro, y muestra las cifras de cada hora', () => {
    const porHora = Array<number>(24).fill(0)
    porHora[8] = 2
    porHora[10] = 5
    const porHoraAyer = Array<number>(24).fill(0)
    porHoraAyer[9] = 3
    const { container } = render(<GraficoPorHora porHora={porHora} porHoraAyer={porHoraAyer} ultimoHoy="2026-11-18T10:42:00"
      horaActual={11} titulo="Intentos" unidad={['intento', 'intentos']} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText(/4 más que ayer/)).toBeInTheDocument()
    expect(screen.getAllByText('10:00').length).toBeGreaterThan(0)
    expect(screen.getByText('10:42')).toBeInTheDocument()
    expect(screen.getByText('Ahora')).toBeInTheDocument()
    // Tabla accesible con hoy y ayer.
    expect(screen.getByRole('row', { name: '09:00 0 3' })).toBeInTheDocument()
    const columnas = [...container.querySelectorAll('button')]
    const desde = Number(screen.getAllByRole('row')[1].querySelector('th')!.textContent!.slice(0, 2))
    fireEvent.mouseEnter(columnas[10 - desde])
    expect(screen.getByRole('status')).toHaveTextContent('Hoy: 5 intentos')
    expect(screen.getByRole('status')).toHaveTextContent('Ayer: 0 intentos')
  })
})
