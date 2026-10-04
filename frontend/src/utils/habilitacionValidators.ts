export const RAZON_MIN = 10
export const RAZON_MAX = 40
export const BUSQUEDA_MAX = 40

/** Letras (con tildes y ñ), números y espacios. */
const RAZON_CARACTERES = /^[A-Za-z0-9áéíóúÁÉÍÓÚüÜñÑ ]+$/

/**
 * Razón de inhabilitación: obligatoria, 10 a 40 caracteres, sin espacios al inicio, al final
 * ni consecutivos. Se rechaza en vez de corregirse, igual que en el backend.
 */
export function validateRazonInhabilitacion(raw: string): string | null {
  if (!raw.trim()) return 'Indica la razón por la que no está habilitado.'
  if (raw !== raw.trimStart()) return 'La razón no puede empezar con espacios.'
  if (raw !== raw.trimEnd()) return 'La razón no puede terminar con espacios.'
  if (/\s{2,}/.test(raw)) return 'La razón no puede tener espacios consecutivos.'
  if (!RAZON_CARACTERES.test(raw)) return 'Solo se permiten letras, números, espacios, tildes y ñ.'
  if (raw.length < RAZON_MIN) return `La razón debe tener al menos ${RAZON_MIN} caracteres.`
  if (raw.length > RAZON_MAX) return `La razón no puede superar ${RAZON_MAX} caracteres.`
  return null
}

/** Al pegar, saltos de línea y tabulaciones pasan a espacios; el resto lo informa la validación. */
export function sanearPegado(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ')
}

/** Buscador de estudiantes: sin espacio inicial ni repetidos (también al pegar) y hasta 40 caracteres. */
export function sanearBusqueda(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^ /, '').slice(0, BUSQUEDA_MAX)
}
