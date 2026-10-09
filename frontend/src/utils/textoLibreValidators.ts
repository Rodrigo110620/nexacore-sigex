/**
 * Textos libres opcionales del control de ingreso (detalle de la denegación, BUG-D02).
 * Permitidos: letras, vocales con tilde, ü/Ü, ñ/Ñ, números, espacios, saltos de línea y . , : ; - ( ) ¿ ? ¡ !
 * Para las reglas, un salto de línea cuenta como un espacio.
 * Misma regla que backend/.../utils/ValidacionTextoLibre.java.
 */
const NO_PERMITIDO = /[^A-Za-záéíóúÁÉÍÓÚüÜñÑ0-9 \r\n.,:;()¿?¡!-]/g
const LETRA_O_NUMERO = /[A-Za-záéíóúÁÉÍÓÚüÜñÑ0-9]/

export interface ReglaTextoLibre {
  /** Sujeto del mensaje, p. ej. "El detalle adicional". */
  campo: string
  min: number
  max: number
}

export const DETALLE_DENEGACION: ReglaTextoLibre = { campo: 'El detalle adicional', min: 1, max: 500 }

/** Motivo por el que el texto no es válido, o null si es válido o está vacío (es opcional). */
export function validarTextoLibre(texto: string, { campo, min, max }: ReglaTextoLibre): string | null {
  if (!texto) return null
  if (!texto.trim()) return `${campo} no puede tener solo espacios`
  if (texto.length > max) return `${campo} no puede superar ${max} caracteres`
  const limpio = texto.trim()
  const noPermitidos = [...new Set(limpio.match(NO_PERMITIDO) ?? [])].map((c) => (c === '\t' ? 'tabulación' : c))
  if (noPermitidos.length > 0) return `${campo} tiene caracteres no permitidos: ${noPermitidos.join(' ')}`
  if (!LETRA_O_NUMERO.test(limpio)) return `${campo} debe tener letras o números, no solo signos`
  if (/^(.)\1+$/i.test(limpio.replace(/\s/g, ''))) return `${campo} no puede ser un mismo carácter repetido`
  if (limpio.length < min) return `${campo} debe tener al menos ${min} caracteres`
  return null
}
