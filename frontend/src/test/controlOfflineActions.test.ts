import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../services/api'
import { reasignarAmbiente } from '../services/controlExamenService'
import { expulsarEstudiante, registrarSalida } from '../services/controlIngresoService'
import { operacionesControlPendientes } from '../services/controlOfflineService'

vi.mock('../services/api', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}))

describe('acciones adicionales del control sin conexión', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    vi.mocked(api.post).mockRejectedValue(new Error('Network Error'))
  })

  it('guarda una expulsión pendiente con su motivo', async () => {
    await expect(expulsarEstudiante({ idEstudiante: 10, idExamen: 20, motivo: 'Uso de celular durante el examen' }))
      .resolves.toMatchObject({ pendienteSincronizacion: true })

    expect(operacionesControlPendientes()).toEqual([
      expect.objectContaining({ tipo: 'EXPULSAR', payload: expect.objectContaining({ motivo: 'Uso de celular durante el examen' }) }),
    ])
  })

  it('guarda un traslado pendiente con aula, motivo y observación', async () => {
    await expect(reasignarAmbiente(20, 10, {
      idAmbienteDestino: 7, motivo: 'Contingencia en el aula actual', observacion: 'Sin energía',
    })).resolves.toEqual({ pendienteSincronizacion: true })

    expect(operacionesControlPendientes()).toEqual([
      expect.objectContaining({ tipo: 'REASIGNAR', payload: expect.objectContaining({ idAmbienteDestino: 7, observacion: 'Sin energía' }) }),
    ])
  })

  it('guarda una salida pendiente para el estudiante y examen correctos', async () => {
    await expect(registrarSalida(10, 20)).resolves.toMatchObject({ pendienteSincronizacion: true })

    expect(operacionesControlPendientes()).toEqual([
      expect.objectContaining({ tipo: 'SALIDA', payload: { idEstudiante: 10, idExamen: 20 } }),
    ])
  })
})
