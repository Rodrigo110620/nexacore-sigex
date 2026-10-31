import { esCodigoDeAmbiente } from './examFormUtils'
import { primerGarabato } from './palabras'

/**
 * Motivo de la reprogramación de un examen (BUG 8 del 2.º test run de QA). Misma regla que
 * backend/.../utils/MotivoReprogramacion.java: obligatorio, de 10 a 100 caracteres, solo letras,
 * números y un espacio entre palabras; no puede ser solo números, una letra repetida ni texto sin
 * sentido. El servidor lo guarda en formato oración.
 */
export const MOTIVO_REPROGRAMACION_MIN = 10
export const MOTIVO_REPROGRAMACION_MAX = 100

export function validarMotivoReprogramacion(texto: string): string | null {
  if (!texto.trim()) return 'Indica el motivo de la reprogramación'
  if (texto !== texto.trim() || texto.includes('  ')) return 'El motivo debe tener un solo espacio entre palabras, sin espacios al inicio ni al final'
  if (!/^[\p{L}0-9 ]+$/u.test(texto)) return 'El motivo solo admite letras, números y espacios'
  if (!/\p{L}/u.test(texto)) return 'El motivo debe tener palabras, no solo números'
  if (texto.length < MOTIVO_REPROGRAMACION_MIN) return `El motivo debe tener al menos ${MOTIVO_REPROGRAMACION_MIN} caracteres`
  if (texto.length > MOTIVO_REPROGRAMACION_MAX) return `El motivo no puede superar ${MOTIVO_REPROGRAMACION_MAX} caracteres`
  if (/^(.)\1+$/iu.test(texto.replace(/ /g, ''))) return 'El motivo no puede ser una misma letra repetida'
  // Los códigos de aula ("690B", "L813") son válidos aunque tengan números.
  const sinCodigos = texto.split(' ').map((p) => (/\d/.test(p) && esCodigoDeAmbiente(p) ? 'aula' : p)).join(' ')
  const garabato = primerGarabato(sinCodigos)
  if (garabato) return `El motivo tiene una palabra que no es válida: ${garabato}`
  return null
}
