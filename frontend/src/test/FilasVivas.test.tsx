import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFilasVivas } from '../hooks/useFilasNuevas'

describe('useFilasVivas', () => {
  it('marca «nuevo» lo que llega y «actualizado» lo que cambia, aunque lleguen seguidos', () => {
    vi.useFakeTimers()
    type F = { id: number; firma: string }[] | undefined
    const { result, rerender } = renderHook(({ filas }: { filas: F }) => useFilasVivas(filas, 'x'), { initialProps: { filas: undefined as F } })
    rerender({ filas: [{ id: 1, firma: 'a' }] })
    act(() => { vi.advanceTimersByTime(10) })
    expect(result.current.size).toBe(0)
    rerender({ filas: [{ id: 1, firma: 'a' }, { id: 2, firma: 'b' }] })
    act(() => { vi.advanceTimersByTime(10) })
    expect(result.current.get(2)).toBe('nuevo')
    rerender({ filas: [{ id: 1, firma: 'a2' }, { id: 2, firma: 'b' }] })
    act(() => { vi.advanceTimersByTime(10) })
    expect(result.current.get(1)).toBe('actualizado')
    expect(result.current.get(2)).toBe('nuevo')
    act(() => { vi.advanceTimersByTime(8000) })
    expect(result.current.size).toBe(0)
    vi.useRealTimers()
  })
})
