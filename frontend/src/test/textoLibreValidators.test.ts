import { describe, expect, it } from 'vitest'
import { DETALLE_DENEGACION, validarTextoLibre } from '../utils/textoLibreValidators'

describe('Detalle de denegación', () => {
  const validar = (texto: string) => validarTextoLibre(texto, DETALLE_DENEGACION)
  it('acepta contenido válido y opcional de 10 a 100 caracteres', () => {
    expect(validar('')).toBeNull()
    expect(validar('CI vencido')).toBeNull()
    expect(validar('a'.repeat(99) + 'b')).toBeNull()
    expect(validar('a'.repeat(101))).toContain('100 caracteres')
    expect(validar('CI viejo')).toContain('10 caracteres')
  })
  it('rechaza signos y espacios repetidos', () => {
    expect(validar('Documento inválido!')).toContain('solo permite letras')
    expect(validar('Documento  inválido')).toContain('un espacio')
  })
})
