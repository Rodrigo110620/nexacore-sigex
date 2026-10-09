import { describe, expect, it } from 'vitest'
import { validarIdentificador } from '../utils/identificacionValidators'

describe('validarIdentificador (BUG-A01)', () => {
  it('acepta códigos universitarios de 9 dígitos y C.I. de 8 dígitos', () => {
    expect(validarIdentificador('codigo', '201904725')).toBeNull()
    expect(validarIdentificador('codigo', '202104010')).toBeNull()
    expect(validarIdentificador('ci', '78451236')).toBeNull()
  })

  it.each([
    ['', 'es obligatorio'],
    ['2019O4725', 'no puede contener letras'],
    ['2019 04725', 'no puede contener espacios'],
    ['201.904.725', 'no puede contener puntos, comas ni caracteres especiales'],
    ['2019,04725', 'no puede contener puntos, comas ni caracteres especiales'],
    ['20190472', 'debe tener exactamente 9 dígitos'],
    ['000000000', 'no puede ser solo ceros'],
    ['777777777', 'no puede ser un mismo dígito repetido'],
    ['123456789', 'no puede ser una secuencia ascendente o descendente'],
    ['987654321', 'no puede ser una secuencia ascendente o descendente'],
    ['121212121', 'no puede ser un patrón repetido'],
    ['123123123', 'no puede ser un patrón repetido'],
  ])('código universitario "%s" → %s', (valor, motivo) => {
    expect(validarIdentificador('codigo', valor)).toBe(`El código universitario ${motivo}`)
  })

  it.each([
    ['', 'es obligatorio'],
    ['7845123A', 'no puede contener letras'],
    ['7845 1236', 'no puede contener espacios'],
    ['7845-1236', 'no puede contener puntos, comas ni caracteres especiales'],
    ['7845123', 'debe tener exactamente 8 dígitos'],
    ['00000000', 'no puede ser solo ceros'],
  ])('C.I. "%s" → %s', (valor, motivo) => {
    expect(validarIdentificador('ci', valor)).toBe(`El C.I. ${motivo}`)
  })
})
