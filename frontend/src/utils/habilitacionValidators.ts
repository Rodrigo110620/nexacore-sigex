export const RAZON_MIN = 10
export const RAZON_MAX = 40
export const BUSQUEDA_MAX = 40

/** Solo palabras: letras (con tildes y ñ) y espacios. */
const RAZON_CARACTERES = /^[A-Za-záéíóúÁÉÍÓÚüÜñÑ ]+$/
const RAZON_NO_PERMITIDOS = /[^A-Za-záéíóúÁÉÍÓÚüÜñÑ ]/g

const VOCALES = 'aeiouáéíóúü'
/** Pares de consonantes con los que puede empezar una sílaba en español (tr, bl, ch...). */
const GRUPOS_CONSONANTES = new Set([
  'ch', 'll', 'rr', 'ps', 'bl', 'br', 'cl', 'cr', 'dl', 'dr', 'fl', 'fr',
  'gl', 'gr', 'kl', 'kr', 'pl', 'pr', 'tl', 'tr',
])

function esVocal(palabra: string, i: number): boolean {
  if (VOCALES.includes(palabra[i])) return true
  // "y" suena a vocal al final o antes de consonante: "muy", "y", "hay".
  const siguiente = palabra[i + 1]
  return palabra[i] === 'y' && (siguiente === undefined || !VOCALES.includes(siguiente))
}

/**
 * Sin diccionario no se puede saber si una palabra existe, pero sí si tiene forma de palabra
 * en español: sílabas pronunciables, sin amontonar consonantes ni repetir sin sentido.
 * Rechaza "fsfasfsaf", "qwerty", "asdfgh" o "jajaja". Recorrido lineal, sin regex anidadas.
 */
export function pareceUnaPalabra(palabra: string): boolean {
  const p = palabra.toLocaleLowerCase('es-BO')
  if (/(.)\1\1/.test(p) || /^(.{1,3})\1{2,}$/.test(p)) return false
  const tramos: { vocal: boolean; texto: string }[] = []
  for (let i = 0; i < p.length; i++) {
    const vocal = esVocal(p, i)
    const ultimo = tramos[tramos.length - 1]
    if (ultimo && ultimo.vocal === vocal) ultimo.texto += p[i]
    else tramos.push({ vocal, texto: p[i] })
  }
  if (!tramos.some((t) => t.vocal)) return false
  return tramos.every((t, i) => {
    const n = t.texto.length
    if (t.vocal) return n <= 3
    if (i === 0) return n === 1 || (n === 2 && GRUPOS_CONSONANTES.has(t.texto))
    if (i === tramos.length - 1) return n <= 2
    return n <= 3 || (n === 4 && GRUPOS_CONSONANTES.has(t.texto.slice(2)))
  })
}

/**
 * Razón de inhabilitación: obligatoria, 10 a 40 caracteres, solo palabras reconocibles,
 * empieza con mayúscula y sin espacios al inicio, al final ni consecutivos.
 * Mismas reglas que el backend.
 */
export function validateRazonInhabilitacion(raw: string): string | null {
  if (!raw.trim()) return 'Indica la razón por la que no está habilitado.'
  if (raw !== raw.trimStart()) return 'La razón no puede empezar con espacios.'
  if (raw !== raw.trimEnd()) return 'La razón no puede terminar con espacios.'
  if (/\s{2,}/.test(raw)) return 'La razón no puede tener espacios consecutivos.'
  if (!RAZON_CARACTERES.test(raw)) return 'Solo se permiten palabras: letras, espacios, tildes y ñ.'
  if (raw[0] !== raw[0].toLocaleUpperCase('es-BO')) return 'La razón debe empezar con mayúscula.'
  if (raw.length < RAZON_MIN) return `La razón debe tener al menos ${RAZON_MIN} caracteres.`
  if (raw.length > RAZON_MAX) return `La razón no puede superar ${RAZON_MAX} caracteres.`
  const invalida = raw.split(' ').find((palabra) => !pareceUnaPalabra(palabra))
  if (invalida) return `"${invalida}" no parece una palabra. Escribe la razón con palabras reales.`
  return null
}

/**
 * Mientras se escribe o pega: descarta números y símbolos, sin espacio inicial ni dobles,
 * hasta 40 caracteres y con la primera letra en mayúscula.
 */
export function sanearRazon(value: string): string {
  const limpio = sanearPegado(value)
    .replace(RAZON_NO_PERMITIDOS, '')
    .replace(/^ +/, '')
    .replace(/ {2,}/g, ' ')
    .slice(0, RAZON_MAX)
  return limpio.charAt(0).toLocaleUpperCase('es-BO') + limpio.slice(1)
}

/** Al pegar, saltos de línea y tabulaciones pasan a espacios; el resto lo informa la validación. */
export function sanearPegado(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ')
}

/** Buscador de estudiantes: sin espacio inicial ni repetidos (también al pegar) y hasta 40 caracteres. */
export function sanearBusqueda(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/^ /, '').slice(0, BUSQUEDA_MAX)
}
