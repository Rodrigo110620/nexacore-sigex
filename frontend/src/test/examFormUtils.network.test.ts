import { afterEach, describe, expect, it, vi } from 'vitest'
import { isNetworkError } from '../utils/examFormUtils'

describe('isNetworkError', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reconoce el 500 vacío que devuelve Vite cuando el backend local está apagado', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    expect(isNetworkError({ response: { status: 500, data: '' } })).toBe(true)
  })

  it('no confunde un error interno con mensaje del servidor con una pérdida de red', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    expect(isNetworkError({ response: { status: 500, data: { mensaje: 'Error interno' } } })).toBe(false)
  })

  it.each([502, 503, 504])('reconoce el estado de proxy %s como pérdida de conexión', (status) => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    expect(isNetworkError({ response: { status } })).toBe(true)
  })
})
