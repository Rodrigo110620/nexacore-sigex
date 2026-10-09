import { describe, expect, it } from 'vitest'
import {
  sanearBusqueda,
  sanearPegado,
  pareceUnaPalabra,
  sanearRazon,
  validateRazonInhabilitacion,
} from '../utils/habilitacionValidators'

describe('habilitacionValidators', () => {
  it('acepta razones de 10 a 40 caracteres con palabras, tildes y ñ', () => {
    expect(validateRazonInhabilitacion('Deuda en biblioteca')).toBeNull()
    expect(validateRazonInhabilitacion('Daño de credencial')).toBeNull()
    expect(validateRazonInhabilitacion('Inscripción pendiente')).toBeNull()
    expect(validateRazonInhabilitacion('Matrícula pendiente de pago en la caja')).toBeNull()
  })

  it.each([
    ['', /Indica la razón/],
    ['   ', /Indica la razón/],
    ['Deuda', /al menos 10/],
    ['Matrícula pendiente de pago en caja de la UMSS', /superar 40/],
    [' Deuda en biblioteca', /empezar con espacios/],
    ['Deuda en biblioteca ', /terminar con espacios/],
    ['Deuda  en biblioteca', /consecutivos/],
    ['Deuda en biblioteca!', /Solo se permiten/],
    ['Deuda_en_biblioteca', /Solo se permiten/],
    ['Daño de credencial 2026', /Solo se permiten/],
    ['deuda en biblioteca', /empezar con mayúscula/],
    ['Fsfasfsaf en caja', /"Fsfasfsaf" no parece una palabra/],
    ['Deuda en qwerty', /"qwerty" no parece una palabra/],
    ['Jajajajaja ja', /no parece una palabra/],
  ])('rechaza "%s"', (razon, mensaje) => {
    expect(validateRazonInhabilitacion(razon)).toMatch(mensaje)
  })

  it('al pegar convierte saltos de línea en espacios', () => {
    expect(sanearPegado('Deuda\nen\tbiblioteca')).toBe('Deuda en biblioteca')
  })

  it('distingue palabras reales de letras al azar', () => {
    const reales = ['Deuda', 'biblioteca', 'Psicología', 'obstrucción', 'extranjero', 'Inscripción',
      'y', 'muy', 'hay', 'guía', 'Ingeniería', 'certificado', 'Ñandú', 'construcción']
    const basura = ['fsfasfsaf', 'qwerty', 'asdfgh', 'jajaja', 'xkcd', 'sdfsdf', 'aaaaaa', 'asdasdasd', 'mnbv']
    expect(reales.filter((p) => !pareceUnaPalabra(p))).toEqual([])
    expect(basura.filter(pareceUnaPalabra)).toEqual([])
  })

  it('al escribir deja solo palabras y pone mayúscula inicial', () => {
    expect(sanearRazon('  deuda #1 en  biblioteca!')).toBe('Deuda en biblioteca')
    expect(sanearRazon('ñandú')).toBe('Ñandú')
    expect(sanearRazon('x'.repeat(50))).toHaveLength(40)
  })

  it('la búsqueda no admite espacio inicial ni repetidos y corta en 40', () => {
    expect(sanearBusqueda('   Juan    Pérez')).toBe('Juan Pérez')
    expect(sanearBusqueda('x'.repeat(50))).toHaveLength(40)
  })
})
