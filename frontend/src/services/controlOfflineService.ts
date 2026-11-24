import api from './api'
import type { AutorizarIngresoPayload, ContextoControlIngreso, TipoIncidencia } from '../types/controlIngreso'
import type { EstudianteIdentificado, TipoIdentificacion } from './identificacionService'
import type { ExamenDto } from './examenService'
import { isNetworkError } from '../utils/examFormUtils'

const VERSION = 1
const EVENTO = 'sigex-control-offline-change'
const prefijo = 'sigex:control-offline'

export type TipoOperacionControl = 'AUTORIZAR' | 'DENEGAR'
export interface OperacionControlPendiente {
  id: string
  tipo: TipoOperacionControl
  payload: AutorizarIngresoPayload
  creadaEn: string
  intentos: number
  error?: string
  statusError?: number
}

interface AlmacenControl {
  version: number
  operaciones: OperacionControlPendiente[]
  contextos: Record<string, ContextoControlIngreso>
  estudiantes: Record<string, EstudianteIdentificado>
  tiposIncidencia: TipoIncidencia[]
  examenes: ExamenDto[]
}

const vacio = (): AlmacenControl => ({ version: VERSION, operaciones: [], contextos: {}, estudiantes: {}, tiposIncidencia: [], examenes: [] })

function cuentaActual(): string {
  const token = localStorage.getItem('token')
  if (!token) return 'anonimo'
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string; email?: string }
    return encodeURIComponent(payload.sub ?? payload.email ?? 'usuario')
  } catch { return 'usuario' }
}

function clave() { return `${prefijo}:${cuentaActual()}` }
function leer(): AlmacenControl {
  try {
    const dato = JSON.parse(localStorage.getItem(clave()) ?? 'null') as AlmacenControl | null
    return dato?.version === VERSION ? dato : vacio()
  } catch { return vacio() }
}
function guardar(dato: AlmacenControl) {
  localStorage.setItem(clave(), JSON.stringify(dato))
  window.dispatchEvent(new CustomEvent(EVENTO))
}
const llaveContexto = (idEstudiante: number, idExamen: number) => `${idExamen}:${idEstudiante}`
const llaveEstudiante = (idExamen: number, tipo: TipoIdentificacion, valor: string) => `${idExamen}:${tipo}:${valor.trim().toLocaleLowerCase('es')}`

export function guardarContextoControl(contexto: ContextoControlIngreso) {
  const dato = leer(); dato.contextos[llaveContexto(contexto.idEstudiante, contexto.idExamen)] = contexto; guardar(dato)
}
export function contextoControlGuardado(idEstudiante: number, idExamen: number) {
  return leer().contextos[llaveContexto(idEstudiante, idExamen)] ?? null
}
export function guardarTiposIncidencia(tipos: TipoIncidencia[]) { const dato = leer(); dato.tiposIncidencia = tipos; guardar(dato) }
export function tiposIncidenciaGuardados() { return leer().tiposIncidencia }

export function guardarEstudianteControl(idExamen: number, estudiante: EstudianteIdentificado) {
  const dato = leer()
  dato.estudiantes[llaveEstudiante(idExamen, 'codigo', estudiante.codigoSis)] = estudiante
  if (estudiante.ci) dato.estudiantes[llaveEstudiante(idExamen, 'ci', estudiante.ci)] = estudiante
  guardar(dato)
}
export function estudianteControlGuardado(idExamen: number, tipo: TipoIdentificacion, valor: string) {
  return leer().estudiantes[llaveEstudiante(idExamen, tipo, valor)] ?? null
}
export function guardarExamenesControl(examenes: ExamenDto[]) { const dato = leer(); dato.examenes = examenes; guardar(dato) }
export function examenesControlGuardados() { return leer().examenes }

export function encolarOperacionControl(tipo: TipoOperacionControl, payload: AutorizarIngresoPayload) {
  const dato = leer()
  const repetida = dato.operaciones.find((o) => !o.error && o.tipo === tipo && o.payload.idExamen === payload.idExamen && o.payload.idEstudiante === payload.idEstudiante)
  if (repetida) return repetida
  const operacion: OperacionControlPendiente = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tipo, payload, creadaEn: new Date().toISOString(), intentos: 0,
  }
  dato.operaciones.push(operacion); guardar(dato); return operacion
}
export function operacionesControlPendientes() { return leer().operaciones }
export const eventoControlOffline = EVENTO

let sincronizando: Promise<void> | null = null
export function sincronizarOperacionesControl(): Promise<void> {
  if (sincronizando) return sincronizando
  if (typeof navigator !== 'undefined' && !navigator.onLine) return Promise.resolve()
  sincronizando = (async () => {
    const dato = leer()
    for (const operacion of [...dato.operaciones]) {
      // Los rechazos 4xx requieren revisión humana. Los errores antiguos sin estado se vuelven a
      // intentar una vez para recuperar marcaciones que Vite etiquetó como 500 al perder el backend.
      if (operacion.error && operacion.statusError != null && operacion.statusError < 500) continue
      try {
        await api.post(operacion.tipo === 'AUTORIZAR' ? '/control-ingresos/autorizar' : '/control-ingresos/denegar', operacion.payload)
        const actual = leer(); actual.operaciones = actual.operaciones.filter((o) => o.id !== operacion.id); guardar(actual)
      } catch (e) {
        const error = e as { response?: { status?: number; data?: { resultado?: string; mensaje?: string } } }
        // Si la autorización llegó pero se perdió la respuesta, el reintento devuelve duplicado: ya quedó sincronizada.
        if (operacion.tipo === 'AUTORIZAR' && error.response?.status === 409 && error.response.data?.resultado === 'DENEGADO_DUPLICADO') {
          const actual = leer(); actual.operaciones = actual.operaciones.filter((o) => o.id !== operacion.id); guardar(actual); continue
        }
        const status = error.response?.status
        if (isNetworkError(e) || (status != null && status >= 500)) {
          // Sigue sin red o el servidor está temporalmente indisponible: no necesita revisión.
          const actual = leer()
          const pendiente = actual.operaciones.find((o) => o.id === operacion.id)
          if (pendiente?.error) {
            pendiente.error = undefined
            pendiente.statusError = undefined
            guardar(actual)
          }
          break
        }
        const actual = leer()
        const pendiente = actual.operaciones.find((o) => o.id === operacion.id)
        if (pendiente) {
          pendiente.intentos += 1
          pendiente.error = error.response?.data?.mensaje ?? 'El servidor rechazó esta marcación.'
          pendiente.statusError = status
          guardar(actual)
        }
      }
    }
  })().finally(() => { sincronizando = null })
  return sincronizando
}
