/** Reglas de INCI-02, BUG-B01 a B06. */
export const contarLetrasJustificacion = (texto: string) => (texto.match(/\p{L}/gu) ?? []).length

export function normalizarJustificacion(texto: string): string {
  return texto.toLocaleLowerCase('es').replace(/\p{L}/u, letra => letra.toLocaleUpperCase('es'))
}

export function validarJustificacion(texto: string): string | null {
  if (!texto || !texto.trim()) return 'La justificación del ingreso manual es obligatoria.'
  if (contarLetrasJustificacion(texto) > 65) return 'La justificación no puede superar las 65 letras.'
  if (/[^\p{L} ]/u.test(texto)) return 'La justificación solo permite letras y un espacio entre palabras.'
  if (texto.startsWith(' ') || texto.endsWith(' ') || texto.includes('  ')) return 'Solo se permite un espacio entre palabras en la justificación del ingreso manual, sin espacios iniciales ni finales.'
  if (texto.length < 10) return 'La justificación debe tener al menos 10 caracteres.'
  return null
}
