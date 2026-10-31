import { primerGarabato } from './palabras'

export const MOTIVO_INTENTO_INICIAL = 'Intentó ingresar a un examen que no le corresponde.'
export const normalizarMotivoIntento = (texto: string) => texto.trim().toLocaleLowerCase('es').replace(/\p{L}/u, letra => letra.toLocaleUpperCase('es'))

export function validarMotivoIntento(texto: string): string | null {
  if (!texto.trim()) return 'El motivo del intento es obligatorio.'
  if (texto.length > 65) return 'El motivo no puede superar 65 caracteres.'
  if (/[^\p{L}0-9 .,;]/u.test(texto)) return 'El motivo solo admite letras, números, espacios, punto, coma y punto y coma.'
  if (/ {2}|^ | $/.test(texto)) return 'Usa un solo espacio entre palabras, sin espacios iniciales ni finales.'
  if (!/\p{L}/u.test(texto)) return 'El motivo debe incluir palabras, no solo números o signos.'
  if (texto.length < 10) return 'El motivo debe tener al menos 10 caracteres.'
  if (primerGarabato(texto.replace(/\b(?:qr|ci|sis)\b/gi, 'documento'))) return 'El motivo contiene texto inconsistente. Escribe palabras válidas.'
  return null
}
