import api from './api'
import type { PageResponse } from '../types/userApi'
import type { ContextoControlIngreso, TipoIncidencia } from '../types/controlIngreso'
import type { EstudianteAsignado } from './controlExamenService'
import {
  guardarContextoControl,
  guardarEstudianteControl,
  guardarTiposIncidencia,
} from './controlOfflineService'
import { guardarFotoOffline, limpiarFotosOffline } from './fotosOffline'

const TAMANO_PAGINA = 100
const CONCURRENCIA_CONTEXTOS = 8

export interface PreparacionOfflineResultado {
  estudiantes: number
  contextos: number
  /** Fotos guardadas en el dispositivo (IndexedDB) para reconocer al estudiante sin servidor. */
  fotos: number
}

/** Descarga la información operativa del examen antes de una posible pérdida de conexión. */
export async function prepararExamenSinConexion(idExamen: number): Promise<PreparacionOfflineResultado> {
  const estudiantes: EstudianteAsignado[] = []
  let pagina = 0
  while (true) {
    const { data } = await api.get<PageResponse<EstudianteAsignado>>(`/examenes/${idExamen}/estudiantes`, {
      params: { estado: 'TODOS', page: pagina, size: TAMANO_PAGINA },
    })
    estudiantes.push(...data.contenido)
    pagina += 1
    if (pagina >= data.totalPaginas) break
  }

  estudiantes.forEach((estudiante) => guardarEstudianteControl(idExamen, {
    idEstudiante: estudiante.idEstudiante,
    nombre: estudiante.nombre,
    apellidos: estudiante.apellidos,
    codigoSis: estudiante.codigoSis,
    ci: estudiante.ci,
    carrera: estudiante.carrera,
    fotoUrl: estudiante.fotoUrl ?? null,
    estado: estudiante.estado,
    motivoInhabilitacion: estudiante.motivoInhabilitacion,
  }))

  const { data: tipos } = await api.get<TipoIncidencia[]>('/control-ingresos/tipos-incidencia')
  guardarTiposIncidencia(tipos)

  let contextos = 0
  for (let inicio = 0; inicio < estudiantes.length; inicio += CONCURRENCIA_CONTEXTOS) {
    const lote = estudiantes.slice(inicio, inicio + CONCURRENCIA_CONTEXTOS)
    const resultados = await Promise.all(lote.map(async (estudiante) => {
      const { data } = await api.get<ContextoControlIngreso>(`/control-ingresos/${estudiante.idEstudiante}/${idExamen}/contexto`)
      guardarContextoControl(data)
      return data
    }))
    contextos += resultados.length
  }

  // Las fotos: si alguna falla, el resto se guarda igual (no detiene la preparación).
  let fotos = 0
  const conFoto = estudiantes.filter((e) => e.fotoUrl)
  for (let inicio = 0; inicio < conFoto.length; inicio += CONCURRENCIA_CONTEXTOS) {
    const lote = conFoto.slice(inicio, inicio + CONCURRENCIA_CONTEXTOS)
    const guardadas = await Promise.all(lote.map(async (estudiante) => {
      try {
        const { data } = await api.get<Blob>(estudiante.fotoUrl as string, { responseType: 'blob' })
        await guardarFotoOffline(estudiante.fotoUrl as string, data)
        return 1
      } catch {
        return 0
      }
    }))
    fotos += guardadas.reduce<number>((a, b) => a + b, 0)
  }
  void limpiarFotosOffline()

  return { estudiantes: estudiantes.length, contextos, fotos }
}

const CLAVE_PREPARADOS = 'sigex-control-preparados'
/** Se vuelve a descargar como mucho cada 10 minutos (las habilitaciones pueden cambiar durante el día). */
export const VIGENCIA_PREPARACION_MS = 10 * 60 * 1000
let preparandoDelDia: Promise<number> | null = null

function leerPreparados(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(CLAVE_PREPARADOS) ?? '{}') as Record<string, number> } catch { return {} }
}

function fechaLocal(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Momento de la última preparación del examen en este dispositivo (null si nunca). */
export function preparadoEn(idExamen: number): number | null {
  return leerPreparados()[String(idExamen)] ?? null
}

export function marcarPreparado(idExamen: number, ms = Date.now()) {
  const preparados = leerPreparados()
  preparados[String(idExamen)] = ms
  // Solo se guardan los de los últimos dos días.
  for (const [id, cuando] of Object.entries(preparados)) if (ms - cuando > 2 * 24 * 60 * 60 * 1000) delete preparados[id]
  try { localStorage.setItem(CLAVE_PREPARADOS, JSON.stringify(preparados)) } catch { /* sin espacio: se reintenta la próxima vez */ }
}

/**
 * Prepara solos, en segundo plano, los exámenes de hoy que no terminaron: así el control tiene la lista y las fichas
 * aunque luego se caiga el servidor o el internet, sin depender de tocar «Preparar sin conexión». Uno a la vez y sin
 * repetir los preparados hace menos de 10 minutos; si falla uno, sigue con los demás. Devuelve cuántos preparó.
 */
export function prepararExamenesDelDia(examenes: { idExamen: number; fecha: string; estado?: string }[], ahoraMs = Date.now()): Promise<number> {
  if (preparandoDelDia) return preparandoDelDia
  if (typeof navigator !== 'undefined' && !navigator.onLine) return Promise.resolve(0)
  const hoy = fechaLocal(ahoraMs)
  const pendientes = examenes.filter((e) => {
    const estado = e.estado?.toLowerCase()
    if (e.fecha?.slice(0, 10) !== hoy || estado === 'cancelado' || estado === 'finalizado') return false
    const ultima = preparadoEn(e.idExamen)
    return ultima === null || ahoraMs - ultima > VIGENCIA_PREPARACION_MS
  })
  if (pendientes.length === 0) return Promise.resolve(0)
  preparandoDelDia = (async () => {
    let preparados = 0
    for (const examen of pendientes) {
      try {
        await prepararExamenSinConexion(examen.idExamen)
        marcarPreparado(examen.idExamen, ahoraMs)
        preparados += 1
      } catch {
        // Sin acceso o sin conexión: se vuelve a intentar en la próxima carga del panel.
      }
    }
    return preparados
  })().finally(() => { preparandoDelDia = null })
  return preparandoDelDia
}
