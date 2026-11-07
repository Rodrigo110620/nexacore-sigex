import { normalizarMotivoExpulsion } from '../services/expulsionService'

export const MOTIVO_ANULACION = { min: 10, max: 100 }
// Reutiliza la convención de IMP-14 sin modificar el registro inicial.
export const normalizarMotivoAnulacion = (texto: string) => normalizarMotivoExpulsion(texto)

/** Reglas exclusivas de anulación; las guardas de tokens largos no comprueban significado. */
export function validarMotivoAnulacion(motivo: string): string | null {
  if (!motivo.trim()) return 'Indica por qué se anula la expulsión'
  if (motivo.length > MOTIVO_ANULACION.max) return 'El motivo de la anulación no puede superar 100 caracteres'
  if (/[^A-Za-záéíóúÁÉÍÓÚüÜñÑ0-9 .,;:]/.test(motivo)) return 'El motivo de la anulación solo permite letras españolas, números, espacios y los signos , . ; :'
  if (/[.,;:]{2}/.test(motivo)) return 'El motivo de la anulación no permite signos de puntuación consecutivos'
  const texto = normalizarMotivoAnulacion(motivo)
  if (texto.length < MOTIVO_ANULACION.min) return 'El motivo de la anulación debe tener al menos 10 caracteres'
  if (!/[a-záéíóúüñ]/i.test(texto)) return 'El motivo de la anulación debe incluir palabras, no solo números o signos'
  if (/^(.)\1+$/i.test(texto.replace(/ /g, ''))) return 'El motivo de la anulación no puede ser un mismo carácter repetido'
  for (const palabra of texto.split(/[ .,;:]+/)) {
    // Conservadora: no aplica a códigos con cifras ni a palabras/siglas cortas.
    if (palabra.length >= 8 && !/[0-9]/.test(palabra)
      && (/^(.{1,3})\1{2,}$/i.test(palabra) || /[bcdfghjklmnñpqrstvwxyz]{10}/i.test(palabra))) {
      return 'El motivo de la anulación contiene texto inconsistente o secuencias repetitivas; describe la razón de la anulación'
    }
  }
  return null
}
