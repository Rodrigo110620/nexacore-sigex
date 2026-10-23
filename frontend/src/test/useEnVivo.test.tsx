import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useEnVivo from '../hooks/useEnVivo'
import { emitirCambioLocal } from '../services/notificacionService'

describe('useEnVivo', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('recarga una sola vez por varios cambios seguidos que le afectan e ignora los ajenos', () => {
    const recargar = vi.fn()
    renderHook(() => useEnVivo((c) => c.idExamen === 7, recargar))

    act(() => {
      emitirCambioLocal({ tipo: 'INGRESO', idExamen: 8, idEstudiante: 1 })
      vi.advanceTimersByTime(1000)
    })
    expect(recargar).not.toHaveBeenCalled()

    act(() => {
      emitirCambioLocal({ tipo: 'INGRESO', idExamen: 7, idEstudiante: 1 })
      emitirCambioLocal({ tipo: 'HABILITACION', idExamen: 7, idEstudiante: null })
      vi.advanceTimersByTime(1000)
    })
    expect(recargar).toHaveBeenCalledTimes(1)
  })

  it('al reconectar siempre recarga, por si se perdió algún cambio', () => {
    const recargar = vi.fn()
    renderHook(() => useEnVivo(() => false, recargar))

    act(() => {
      emitirCambioLocal({ tipo: 'RECONECTADO', idExamen: null, idEstudiante: null })
      vi.advanceTimersByTime(1000)
    })
    expect(recargar).toHaveBeenCalledTimes(1)
  })
})
