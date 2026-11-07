import api from './api'
import { MOTIVO_ESCRITO, normalizarMotivo, validarMotivoEscrito } from '../utils/motivoEscrito'

// IMP-14: la misma regla que el motivo del traslado (utils/motivoEscrito); sección 24: de 10 a 200 caracteres.
export const MOTIVO_EXPULSION = { campo: 'El motivo de expulsión', ...MOTIVO_ESCRITO }

export function validarMotivoExpulsion(motivo: string): string | null {
  return validarMotivoEscrito(motivo, MOTIVO_EXPULSION.campo, 'la expulsión')
}

export const normalizarMotivoExpulsion = normalizarMotivo

export interface ExpulsionResponse {
  idExpulsion: number
  idEstudiante: number
  idExamen: number
  motivo: string
  idResponsable: number
  responsable: string
  fechaHora: string
  /** Nombre completo y código SIS del expulsado (los manda el servidor). */
  estudiante?: string | null
  codigoSis?: string | null
  /** Si se anuló por error: cuándo, quién y por qué (null si sigue vigente). */
  anuladaEn?: string | null
  anuladaPor?: string | null
  motivoAnulacion?: string | null
}

export function esExpulsionConfirmada(data: unknown): data is ExpulsionResponse {
  if (!data || typeof data !== 'object') return false
  const registro = data as Partial<ExpulsionResponse>
  if (![registro.idExpulsion, registro.idEstudiante, registro.idExamen, registro.idResponsable]
    .every((id) => Number.isSafeInteger(id) && Number(id) > 0)) return false
  if (![registro.motivo, registro.responsable].every((texto) => typeof texto === 'string' && texto.trim())) return false
  const fecha = registro.fechaHora
  return typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?$/.test(fecha)
    && Number.isFinite(Date.parse(`${fecha}Z`)) && new Date(`${fecha}Z`).toISOString().slice(0, 19) === fecha.slice(0, 19)
}

export async function listarExpulsionesExamen(idExamen: number): Promise<ExpulsionResponse[]> {
  const { data } = await api.get<unknown>(`/control-ingresos/examen/${idExamen}/expulsiones`)
  if (!Array.isArray(data) || !data.every((registro) => esExpulsionConfirmada(registro) && registro.idExamen === idExamen)) {
    throw new Error('No se pudo verificar el registro de expulsiones del examen.')
  }
  return data
}

/** Anula una expulsión registrada por error (ADMIN o docente del examen). No se borra: queda como anulada. */
export async function anularExpulsion(idExamen: number, idExpulsion: number, motivo: string): Promise<ExpulsionResponse> {
  const { data } = await api.post<ExpulsionResponse>(`/control-ingresos/examen/${idExamen}/expulsiones/${idExpulsion}/anular`, { motivo })
  return data
}

/** Sección 24: motivos frecuentes que el personal elige con un toque y luego puede completar. */
export const MOTIVOS_FRECUENTES_EXPULSION = ['Uso de celular', 'Copia o plagio', 'Suplantación de identidad', 'Conducta inapropiada']

