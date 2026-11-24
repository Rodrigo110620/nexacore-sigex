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
})
