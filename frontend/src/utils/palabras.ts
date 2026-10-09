/**
 * Detección de garabatos en textos libres (razón de inhabilitación, normas, ambientes).
 * Sin diccionario no se puede saber si una palabra existe, pero sí si tiene forma de palabra
 * en español: sílabas pronunciables, sin amontonar consonantes ni repetir sin sentido.
 * Misma regla que ValidacionPalabras en el backend.
 */

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

/** Rechaza "fsfasfsaf", "qwerty", "asdfgh" o "jajaja". Recorrido lineal, sin regex anidadas. */
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

/** Número con abreviatura corta: "2do", "1ra", "30min". */
const NUMERO_ABREVIADO = /^\d+[a-záéíóúñ]{1,3}$/i

/**
 * Primera palabra con forma de garabato dentro de un texto libre, o null si todas pasan.
 * Ignora la puntuación y acepta números ("30 minutos") y ordinales ("2do parcial").
 */
export function primerGarabato(texto: string): string | null {
  for (const fragmento of texto.split(/[\s.,;:()¿?¡!"'/%-]+/)) {
    if (!fragmento || /^\d+$/.test(fragmento) || NUMERO_ABREVIADO.test(fragmento)) continue
    if (/\d/.test(fragmento) || !pareceUnaPalabra(fragmento)) return fragmento
  }
  return null
}
