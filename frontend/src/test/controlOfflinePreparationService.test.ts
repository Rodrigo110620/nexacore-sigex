import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../services/api'
import { prepararExamenSinConexion } from '../services/controlOfflinePreparationService'
import { contextoControlGuardado, estudianteControlGuardado, tiposIncidenciaGuardados } from '../services/controlOfflineService'

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }))

describe('prepararExamenSinConexion', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('guarda todos los estudiantes, sus contextos y las incidencias del examen', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/examenes/20/estudiantes') return { data: { contenido: [{
        idEstudiante: 10, nombre: 'Ana', apellidos: 'Paz', codigoSis: '2026001', ci: '123', carrera: 'Sistemas',
        estado: 'HABILITADO', motivoInhabilitacion: null, ingresado: false,
      }], pagina: 0, totalPaginas: 1, totalRegistros: 1, tamano: 100 } }
      if (url === '/control-ingresos/tipos-incidencia') return { data: [{ id: 1, nombre: 'Documento', descripcion: null }] }
      if (url === '/control-ingresos/10/20/contexto') return { data: {
        idEstudiante: 10, estudiante: 'Ana Paz', codigoSis: '2026001', documento: '123', idExamen: 20,
        asignatura: 'Física', fecha: '2026-11-24', horaInicio: '10:00', duracionMinutos: 90, ambiente: 'A1',
        normasGenerales: [], normasParticulares: [], habilitado: true, motivoInhabilitacion: null,
        ingresoRegistrado: false, fechaHoraIngreso: null,
      } }
      throw new Error(`Ruta inesperada: ${url}`)
    })

    await expect(prepararExamenSinConexion(20)).resolves.toEqual({ estudiantes: 1, contextos: 1 })
    expect(estudianteControlGuardado(20, 'codigo', '2026001')?.nombre).toBe('Ana')
    expect(contextoControlGuardado(10, 20)?.ambiente).toBe('A1')
    expect(tiposIncidenciaGuardados()).toHaveLength(1)
  })
})
