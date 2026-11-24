import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ControlOfflineSync from '../components/control/ControlOfflineSync'
import {
  eventoControlOffline,
  operacionesControlPendientes,
  sincronizarOperacionesControl,
} from '../services/controlOfflineService'

vi.mock('../services/controlOfflineService', () => ({
  eventoControlOffline: 'sigex-control-offline-change',
  operacionesControlPendientes: vi.fn(),
  sincronizarOperacionesControl: vi.fn(),
}))

const pendiente = {
  id: 'operacion-1',
  tipo: 'AUTORIZAR' as const,
  payload: { idEstudiante: 10, idExamen: 20 },
  creadaEn: '2026-11-24T10:00:00-04:00',
  intentos: 0,
}

describe('ControlOfflineSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(operacionesControlPendientes).mockReturnValue([pendiente] as ReturnType<typeof operacionesControlPendientes>)
    vi.mocked(sincronizarOperacionesControl).mockResolvedValue()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('confirma temporalmente cuando todas las marcaciones terminan de sincronizarse', async () => {
    render(<ControlOfflineSync />)
    expect(screen.getByText('1 marcación pendiente de sincronizar')).toBeInTheDocument()

    vi.mocked(operacionesControlPendientes).mockReturnValue([])
    act(() => window.dispatchEvent(new CustomEvent(eventoControlOffline)))

    expect(screen.getByText('Todas las marcaciones fueron sincronizadas correctamente.')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(5_000))
    expect(screen.queryByText('Todas las marcaciones fueron sincronizadas correctamente.')).not.toBeInTheDocument()
  })

  it('no muestra una confirmación si la aplicación inicia sin marcaciones pendientes', async () => {
    vi.mocked(operacionesControlPendientes).mockReturnValue([])
    render(<ControlOfflineSync />)

    await act(async () => { await Promise.resolve() })
    expect(screen.queryByText('Todas las marcaciones fueron sincronizadas correctamente.')).not.toBeInTheDocument()
  })
})
