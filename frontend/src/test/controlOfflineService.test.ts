import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../services/api'
import {
  encolarOperacionControl,
  operacionesControlPendientes,
  sincronizarOperacionesControl,
} from '../services/controlOfflineService'
import type { AutorizarIngresoPayload } from '../types/controlIngreso'

vi.mock('../services/api', () => ({
  default: { post: vi.fn() },
}))

const payload: AutorizarIngresoPayload = {
  idEstudiante: 10,
  idExamen: 20,
  observaciones: 'Identidad verificada',
  identidadVerificada: true,
  verificacionesAdicionales: ['Carnet físico verificado'],
  incidencias: [],
  fechaHoraDispositivo: '2026-11-23T10:30:00-04:00',
}

describe('controlOfflineService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  it('persiste una marcación y evita duplicarla para el mismo estudiante y examen', () => {
    encolarOperacionControl('AUTORIZAR', payload)
    encolarOperacionControl('AUTORIZAR', payload)

    expect(operacionesControlPendientes()).toHaveLength(1)
    expect(JSON.stringify(localStorage)).toContain('AUTORIZAR')
  })

  it('sincroniza automáticamente la marcación guardada y la elimina solo después de confirmarla', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { resultado: 'AUTORIZADO' } })
    encolarOperacionControl('AUTORIZAR', payload)

    await sincronizarOperacionesControl()

    expect(api.post).toHaveBeenCalledWith('/control-ingresos/autorizar', payload)
    expect(operacionesControlPendientes()).toEqual([])
  })

  it('conserva la marcación si todavía no hay conexión', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    encolarOperacionControl('DENEGAR', payload)

    await sincronizarOperacionesControl()

    expect(api.post).not.toHaveBeenCalled()
    expect(operacionesControlPendientes()).toHaveLength(1)
  })

  it('mantiene pendiente un 500 vacío del proxy para reintentarlo al volver el backend', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { status: 500, data: '' } })
    encolarOperacionControl('AUTORIZAR', payload)

    await sincronizarOperacionesControl()

    expect(operacionesControlPendientes()).toHaveLength(1)
    expect(operacionesControlPendientes()[0].error).toBeUndefined()
  })

  it('marca para revisión un rechazo funcional 400', async () => {
    vi.mocked(api.post).mockRejectedValue({ response: { status: 400, data: { mensaje: 'Dato inválido' } } })
    encolarOperacionControl('AUTORIZAR', payload)

    await sincronizarOperacionesControl()

    expect(operacionesControlPendientes()[0]).toMatchObject({ error: 'Dato inválido', statusError: 400 })
  })

  it('sincroniza expulsiones, traslados y salidas por sus rutas correspondientes', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    encolarOperacionControl('EXPULSAR', { idEstudiante: 10, idExamen: 20, motivo: 'Uso de celular' })
    encolarOperacionControl('REASIGNAR', { idEstudiante: 11, idExamen: 20, idAmbienteDestino: 7, motivo: 'Contingencia' })
    encolarOperacionControl('SALIDA', { idEstudiante: 12, idExamen: 20 })

    await sincronizarOperacionesControl()

    expect(api.post).toHaveBeenCalledWith('/control-ingresos/expulsar', expect.objectContaining({ idEstudiante: 10 }))
    expect(api.post).toHaveBeenCalledWith('/control-ingresos/20/11/reasignar', expect.objectContaining({ idAmbienteDestino: 7 }))
    expect(api.post).toHaveBeenCalledWith('/control-ingresos/salida', { idEstudiante: 12, idExamen: 20 })
    expect(operacionesControlPendientes()).toEqual([])
  })
})
