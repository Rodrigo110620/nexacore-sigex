import { primerGarabato } from './palabras'

/** Reglas de INCI-02, BUG-B01 a B06. */
export const contarLetrasJustificacion = (texto: string) => (texto.match(/\p{L}/gu) ?? []).length

export function normalizarJustificacion(texto: string): string {
  return texto.trimEnd().toLocaleLowerCase('es').replace(/\p{L}/u, letra => letra.toLocaleUpperCase('es'))
}

export function validarJustificacion(texto: string): string | null {
  texto = texto.trimEnd()
  if (!texto || !texto.trim()) return 'La justificación del ingreso manual es obligatoria.'
  if (texto.length > 65) return 'La justificación no puede superar los 65 caracteres.'
  if (/[^\p{L} ]/u.test(texto)) return 'La justificación solo permite letras y un espacio entre palabras.'
  if (texto.startsWith(' ') || texto.endsWith(' ') || texto.includes('  ')) return 'Solo se permite un espacio entre palabras en la justificación del ingreso manual, sin espacios iniciales ni finales.'
  if (texto.length < 10) return 'La justificación debe tener al menos 10 caracteres.'
  const garabato = primerGarabato(texto.replace(/\b(?:qr|ci|sis)\b/gi, 'documento'))
  if (garabato) return `La justificación contiene contenido no válido: ${garabato}.`
  return null
}
