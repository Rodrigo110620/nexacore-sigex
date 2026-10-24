import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../services/api'
import { autorizarIngreso, expulsarEstudiante, obtenerContextoControl, obtenerHistorialControl, obtenerTiposIncidencia } from '../services/controlIngresoService'

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
    const payload = { idEstudiante: 10, idExamen: 20, observaciones: '', identidadVerificada: false, verificacionesAdicionales: [], incidencias: [] }

    await expect(autorizarIngreso(payload)).resolves.toBe(denegacion)
  })
})

describe('INCI-01: cliente provisional de expulsión', () => {
  const payload = { idEstudiante: 10, idExamen: 20, motivo: 'Uso de celular durante el examen' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envía únicamente estudiante, examen y motivo al endpoint autenticado', async () => {
    mockedApi.post = vi.fn().mockResolvedValue({ data: null })
    await expulsarEstudiante({
      ...payload,
      motivo: `  ${payload.motivo}  `,
      ...{ fechaHoraDispositivo: '2000-01-01T00:00:00', idResponsable: 99, responsable: 'ADMIN' },
    })
    expect(mockedApi.post).toHaveBeenCalledTimes(1)
    expect(mockedApi.post).toHaveBeenCalledWith('/control-ingresos/expulsar', payload)
  })

  it.each(['', '   ', '\n\t'])('rechaza el motivo vacío %j sin enviar HTTP', async (motivo) => {
    await expect(expulsarEstudiante({ ...payload, motivo })).rejects.toThrow('obligatorio')
    expect(mockedApi.post).not.toHaveBeenCalled()
  })

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rechaza identificadores inválidos %s sin enviar HTTP', async (id) => {
      await expect(expulsarEstudiante({ ...payload, idEstudiante: id })).rejects.toThrow('identificadores')
      await expect(expulsarEstudiante({ ...payload, idExamen: id })).rejects.toThrow('identificadores')
      expect(mockedApi.post).not.toHaveBeenCalled()
    },
  )

  it.each([400, 401, 403, 404, 409, 422, 500])('propaga HTTP %s aunque su cuerpo diga éxito', async (status) => {
    const error = { response: { status, data: { resultado: 'EXPULSADO', autorizado: true } } }
    mockedApi.post = vi.fn().mockRejectedValue(error)
    await expect(expulsarEstudiante(payload)).rejects.toBe(error)
  })

  it('propaga errores de red sin fabricar un registro', async () => {
    const error = new Error('Network Error')
    mockedApi.post = vi.fn().mockRejectedValue(error)
    await expect(expulsarEstudiante(payload)).rejects.toBe(error)
  })

  it.each([undefined, null, {}, { resultado: 'PENDIENTE' }])(
    'no transforma una respuesta %j en éxito ni agrega datos de auditoría', async (data) => {
      mockedApi.post = vi.fn().mockResolvedValue({ data })
      await expect(expulsarEstudiante(payload)).resolves.toBe(data)
    },
  )
})
