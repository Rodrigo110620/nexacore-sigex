import { primerGarabato } from './palabras'

/**
 * Textos de la revisión de fotos (HU#6, BUG-E01 a E10 de QA). Misma regla que
 * backend/.../utils/ValidacionTextoFoto.java.
 * - Detalle del reporte (control): opcional; solo letras y espacios, de 10 a 65 caracteres.
 * - Motivo del rechazo (admin): obligatorio; letras, espacios, coma y punto, sin números, de 5 a 200.
 * Ninguno puede ser una letra repetida ni un garabato, y se guardan en formato oración.
 */
export const DETALLE_REPORTE_MIN = 10
export const DETALLE_REPORTE_MAX = 65
export const MOTIVO_RECHAZO_MIN = 5
export const MOTIVO_RECHAZO_MAX = 200

const normalizar = (texto: string) => texto.trim().replace(/\s+/g, ' ')

function comun(limpio: string, campo: string, min: number, max: number): string | null {
  if (limpio.length < min) return `${campo} debe tener al menos ${min} caracteres`
  if (limpio.length > max) return `${campo} no puede superar ${max} caracteres`
  if (/^(.)\1+$/iu.test(limpio.replace(/[\s.,]/g, ''))) return `${campo} no puede ser una misma letra repetida`
  const garabato = primerGarabato(limpio)
  if (garabato) return `${campo} tiene una palabra que no es válida: ${garabato}`
  return null
}

/** Motivo por el que el detalle no es válido, o null si es válido o está vacío (es opcional). */
export function validarDetalleReporte(texto: string): string | null {
  const limpio = normalizar(texto)
  if (!limpio) return null
  if (!/^[\p{L} ]+$/u.test(limpio)) return 'El detalle solo admite letras y espacios'
  return comun(limpio, 'El detalle', DETALLE_REPORTE_MIN, DETALLE_REPORTE_MAX)
}

/** Motivo por el que el motivo del rechazo no es válido, o null si es válido. */
export function validarMotivoRechazo(texto: string): string | null {
  const campo = 'El motivo del rechazo'
  const limpio = normalizar(texto)
  if (!limpio) return 'Indica el motivo del rechazo'
  if (/\d/.test(limpio)) return `${campo} no puede contener números`
  if (!/^[\p{L} .,]+$/u.test(limpio)) return `${campo} solo admite letras, espacios, coma y punto`
  if (!/\p{L}/u.test(limpio)) return `${campo} debe tener letras, no solo signos`
  return comun(limpio, campo, MOTIVO_RECHAZO_MIN, MOTIVO_RECHAZO_MAX)
}

/** Formato oración: la primera letra en mayúscula y el resto en minúscula. */
export function aOracion(texto: string): string {
  const minusculas = normalizar(texto).toLocaleLowerCase('es-BO')
  return minusculas.replace(/\p{L}/u, (letra) => letra.toLocaleUpperCase('es-BO'))
}
