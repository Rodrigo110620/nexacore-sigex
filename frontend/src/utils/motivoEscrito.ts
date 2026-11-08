import { validarTextoLibre } from './textoLibreValidators'
import { primerGarabato } from './palabras'

/**
 * IMP-14: una sola regla para los motivos escritos (expulsión y traslado de aula), igual que en el servidor
 * (MotivoEscrito): espacios simples, de 10 a 200 caracteres, con palabras y sin garabatos, y formato de oración
 * que conserva siglas (CI, SIS, QR…) y códigos con cifras («690B»).
 */
export const MOTIVO_ESCRITO = { min: 10, max: 200 }
// Una frase en mayúsculas no distingue palabras de siglas: lista explícita ya reconocida por INCI-01.
const SIGLAS = new Set(['CI', 'SIS', 'QR', 'PDF', 'C'])

/** Los 10–200 caracteres se cuentan sobre el texto sin extremos, con espacios simples y formato oración. */
export function normalizarMotivo(motivo: string): string {
  const texto = motivo.trim().replace(/ +/g, ' ')
  const primeraLetra = texto.search(/\p{L}/u)
  return texto.replace(/[\p{L}\p{N}]+/gu, (palabra, inicio: number) => {
    const sigla = palabra.toLocaleUpperCase('es')
    if (SIGLAS.has(sigla)) return sigla
    // Conserva la escritura de códigos con cifras; no cambia qué entradas acepta el validador.
    if (/[0-9]/.test(palabra)) return palabra
    const minusculas = palabra.toLocaleLowerCase('es')
    return inicio === primeraLetra ? minusculas[0].toLocaleUpperCase('es') + minusculas.slice(1) : minusculas
  })
}

/** Error del motivo para mostrar junto al campo, o null. {@code campo}: «El motivo de expulsión». */
export function validarMotivoEscrito(motivo: string, campo: string, queExplica: string): string | null {
  motivo = normalizarMotivo(motivo)
  if (!motivo.trim()) return 'El motivo es obligatorio.'
  const error = validarTextoLibre(motivo, { campo, ...MOTIVO_ESCRITO })
  if (error) return error
  if (/[\r\n]/.test(motivo)) return 'El motivo solo permite un espacio entre palabras'
  if (!/\p{L}/u.test(motivo)) return `El motivo debe contener palabras que expliquen ${queExplica}`
  // Excepciones conocidas; esta heurística no garantiza que cualquier frase tenga significado.
  const garabato = primerGarabato(motivo.replace(/\b(?:qr|ci|sis|whatsapp|pdf|chatgpt|c|smartwatch)\b/gi, 'documento'))
  return garabato ? `El motivo contiene contenido no válido: ${garabato}` : null
}

/** Al escribir: sin espacios al inicio y uno solo entre palabras (el resto se normaliza al salir del campo). */
export const espaciosAlEscribir = (valor: string) => valor.replace(/^ +/, '').replace(/ +/g, ' ')
