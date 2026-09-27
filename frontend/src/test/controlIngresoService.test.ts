import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../services/api'
import { autorizarIngreso, obtenerContextoControl, obtenerHistorialControl, obtenerTiposIncidencia } from '../services/controlIngresoService'

vi.mock('../services/api')
const mockedApi = vi.mocked(api)

describe('controlIngresoService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('consulta el contexto por estudiante y examen', async () => {
    const contexto = { idEstudiante: 10, idExamen: 20 }
    mockedApi.get = vi.fn().mockResolvedValue({ data: contexto })

    await expect(obtenerContextoControl(10, 20)).resolves.toBe(contexto)
    expect(mockedApi.get).toHaveBeenCalledWith('/control-ingresos/10/20/contexto')
  })

  it('consulta el catálogo de incidencias', async () => {
    const tipos = [{ id: 1, nombre: 'NO_HABILITADO', descripcion: null }]
    mockedApi.get = vi.fn().mockResolvedValue({ data: tipos })

    await expect(obtenerTiposIncidencia()).resolves.toBe(tipos)
    expect(mockedApi.get).toHaveBeenCalledWith('/control-ingresos/tipos-incidencia')
  })

  it('consulta el historial del estudiante para el examen', async () => {
    const historial = [{ idRegistro: 1, resultado: 'AUTORIZADO' }]
    mockedApi.get = vi.fn().mockResolvedValue({ data: historial })

    await expect(obtenerHistorialControl(10, 20)).resolves.toBe(historial)
    expect(mockedApi.get).toHaveBeenCalledWith('/control-ingresos/10/20')
  })

  it('devuelve una denegación enviada por el backend aunque use HTTP de error', async () => {
    const denegacion = { autorizado: false, resultado: 'DENEGADO_DUPLICADO', causa: 'Ingreso duplicado' }
    mockedApi.post = vi.fn().mockRejectedValue({ response: { data: denegacion } })
    const payload = { idEstudiante: 10, idExamen: 20, observaciones: '', verificacionesAdicionales: [], incidencias: [] }

    await expect(autorizarIngreso(payload)).resolves.toBe(denegacion)
  })
})
