import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ResumenReportes from '../components/reportes/ResumenReportes'
import useFilasNuevas from '../hooks/useFilasNuevas'
import GraficoPorHora from '../components/reportes/GraficoPorHora'

const H = Array<number>(24).fill(0)
const RESUMEN = {
  intentos: { total: 12, hoy: 3, ayer: 5, porHora: H },
  expulsiones: { total: 2, hoy: 0, ayer: 1, porHora: H },
  excepciones: null,
  fotos: { total: 4, hoy: 1, ayer: 0, porHora: H },
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
  it('resume el día, marca la hora con más y muestra la cifra de cada hora al pasar el mouse', () => {
    const porHora = Array<number>(24).fill(0)
    porHora[8] = 2
    porHora[10] = 5
    const { container } = render(<GraficoPorHora porHora={porHora} titulo="Intentos de hoy" unidad={['intento', 'intentos']} />)
    expect(screen.getByText('7 intentos')).toBeInTheDocument()
    expect(screen.getByText(/más a las 10:00/)).toBeInTheDocument()
    // Tabla accesible con cada hora.
    expect(screen.getByRole('row', { name: '10:00 5' })).toBeInTheDocument()
    const barras = container.querySelectorAll('button')
    fireEvent.mouseEnter(barras[10 - 7])
    expect(screen.getByRole('status')).toHaveTextContent('10:00 · 5 intentos')
  })
})
