import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../services/api'
import { descargarActaPDF, mensajeDescarga } from '../services/asistenciaService'

vi.mock('../services/api')
const mockedApi = vi.mocked(api)

describe('asistenciaService - descargar acta PDF (HU#4)', () => {
  const mockCreateObjectURL = vi.fn()
  const mockRevokeObjectURL = vi.fn()
  const mockClick = vi.fn()
  const mockRemove = vi.fn()
  const mockAppendChild = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis.URL as any).createObjectURL = mockCreateObjectURL.mockReturnValue('blob:fake-url')
    ;(globalThis.URL as any).revokeObjectURL = mockRevokeObjectURL

    const enlaceMock = {
      href: '',
      download: '',
      click: mockClick,
      remove: mockRemove,
    } as unknown as HTMLAnchorElement
    vi.spyOn(document, 'createElement').mockImplementation(() => enlaceMock)
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('llama al endpoint del acta con responseType blob y devuelve el nombre del servidor', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    mockedApi.get = vi.fn().mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': 'filename="acta_examen_20.pdf"' },
    })

    const nombre = await descargarActaPDF(20)

    expect(mockedApi.get).toHaveBeenCalledWith('/reportes/examenes/20/acta.pdf', {
      responseType: 'blob',
    })
    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
    expect(mockAppendChild).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRemove).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
    expect(nombre).toBe('acta_examen_20.pdf')
  })

  it('usa un nombre por defecto cuando el servidor no envía content-disposition', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    mockedApi.get = vi.fn().mockResolvedValue({ data: blob, headers: {} })

    const nombre = await descargarActaPDF(30)

    expect(nombre).toBe('acta_examen_30.pdf')
  })

  it('propaga errores de red sin crear enlace de descarga', async () => {
    const error = new Error('Network Error')
    mockedApi.get = vi.fn().mockRejectedValue(error)

    await expect(descargarActaPDF(20)).rejects.toBe(error)
    expect(mockCreateObjectURL).not.toHaveBeenCalled()
    expect(mockAppendChild).not.toHaveBeenCalled()
  })

  it('propaga errores HTTP 403 (sin permiso) y 409 (examen no iniciado)', async () => {
    const error403 = { response: { status: 403 } }
    const error409 = { response: { status: 409 } }
    mockedApi.get = vi.fn().mockRejectedValueOnce(error403).mockRejectedValueOnce(error409)

    await expect(descargarActaPDF(20)).rejects.toBe(error403)
    await expect(descargarActaPDF(20)).rejects.toBe(error409)
  })
})

describe('asistenciaService - mensajeDescarga', () => {
  it('devuelve mensaje específico para 403', async () => {
    const mensaje = await mensajeDescarga({ response: { status: 403 } })
    expect(mensaje).toBe('No tienes permiso para descargar la asistencia de este examen.')
  })

  it('devuelve mensaje genérico cuando no hay respuesta', async () => {
    const mensaje = await mensajeDescarga({} as any)
    expect(mensaje).toBe('No se pudo conectar con el servidor. Revisa tu conexión.')
  })
})
