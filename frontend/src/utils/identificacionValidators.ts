import { FIELD_LIMITS } from './validators'
import type { TipoIdentificacion } from '../services/identificacionService'

/**
 * Formato del código universitario y del C.I. al identificar al estudiante (BUG-A01).
 * Misma regla que backend/.../utils/ValidacionIdentificador.java.
 */
export const DIGITOS_IDENTIFICADOR: Record<TipoIdentificacion, number> = {
  codigo: FIELD_LIMITS.codigoSis.max,
  ci: 8,
}

const CAMPO: Record<TipoIdentificacion, string> = {
  codigo: 'El código universitario',
  ci: 'El C.I.',
}

/** Motivo por el que el valor no es solo dígitos 0-9, o null si lo es. */
function caracterNoPermitido(valor: string, campo: string): string | null {
  if (/\p{L}/u.test(valor)) return `${campo} no puede contener letras`
  if (/\s/.test(valor)) return `${campo} no puede contener espacios`
  if (/[^0-9]/.test(valor)) return `${campo} no puede contener puntos, comas ni caracteres especiales`
  return null
}

/** Cada dígito es el anterior +1 (123456789) o -1 (987654321). */
function esSecuencia(digitos: string): boolean {
  const paso = Number(digitos[1]) - Number(digitos[0])
  if (Math.abs(paso) !== 1) return false
  return [...digitos].every((d, i) => i === 0 || Number(d) - Number(digitos[i - 1]) === paso)
}

/** Un bloque de 2 a 4 dígitos que se repite: 121212121, 123123123, 123412341. */
function esPatronRepetido(digitos: string): boolean {
  return [2, 3, 4].some((largo) => [...digitos].every((d, i) => i < largo || d === digitos[i - largo]))
}

function motivoCodigoFicticio(digitos: string, campo: string): string | null {
  if (/^(\d)\1+$/.test(digitos)) return `${campo} no puede ser un mismo dígito repetido`
  if (esSecuencia(digitos)) return `${campo} no puede ser una secuencia ascendente o descendente`
  if (esPatronRepetido(digitos)) return `${campo} no puede ser un patrón repetido`
  return null
}

/** Motivo por el que no se puede buscar con ese valor, o null si es válido. */
export function validarIdentificador(tipo: TipoIdentificacion, valor: string): string | null {
  const campo = CAMPO[tipo]
  if (!valor.trim()) return `${campo} es obligatorio`
  const caracter = caracterNoPermitido(valor, campo)
  if (caracter) return caracter
  const digitos = DIGITOS_IDENTIFICADOR[tipo]
  if (valor.length !== digitos) return `${campo} debe tener exactamente ${digitos} dígitos`
  if (/^0+$/.test(valor)) return `${campo} no puede ser solo ceros`
  return tipo === 'codigo' ? motivoCodigoFicticio(valor, campo) : null
}
