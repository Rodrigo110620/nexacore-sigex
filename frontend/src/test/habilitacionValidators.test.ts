import { describe, expect, it } from 'vitest'
import {
  sanearBusqueda,
  sanearPegado,
  validateRazonInhabilitacion,
} from '../utils/habilitacionValidators'

describe('habilitacionValidators', () => {
  it('acepta razones de 10 a 40 caracteres con tildes, ñ y números', () => {
    expect(validateRazonInhabilitacion('Deuda en biblioteca')).toBeNull()
    expect(validateRazonInhabilitacion('Daño de credencial 2026')).toBeNull()
    expect(validateRazonInhabilitacion('a'.repeat(9) + 'b')).toBeNull()
    expect(validateRazonInhabilitacion('Matrícula pendiente de pago en caja UMSS')).toBeNull()
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
  ])('rechaza "%s"', (razon, mensaje) => {
    expect(validateRazonInhabilitacion(razon)).toMatch(mensaje)
  })

  it('al pegar convierte saltos de línea en espacios', () => {
    expect(sanearPegado('Deuda\nen\tbiblioteca')).toBe('Deuda en biblioteca')
  })

  it('la búsqueda no admite espacio inicial ni repetidos y corta en 40', () => {
    expect(sanearBusqueda('   Juan    Pérez')).toBe('Juan Pérez')
    expect(sanearBusqueda('x'.repeat(50))).toHaveLength(40)
  })
})
