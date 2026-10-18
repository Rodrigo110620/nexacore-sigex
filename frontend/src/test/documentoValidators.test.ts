import { describe, expect, it } from 'vitest'
import { validateDocumento } from '../utils/validators'

describe('validateDocumento', () => {
  it('acepta carnets válidos', () => {
    expect(validateDocumento('74839201')).toBe('')
    expect(validateDocumento('60481235')).toBe('')
    expect(validateDocumento('10234567')).toBe('')
  })

  it('rechaza campos vacíos y valores no numéricos', () => {
    expect(validateDocumento('')).toMatch(/obligatorio/)
    expect(validateDocumento('123456a7')).toMatch(/Solo números/)
  })

  it('rechaza longitudes fuera de 7 u 8 dígitos', () => {
    expect(validateDocumento('123456')).toMatch(/7 u 8 dígitos/)
    expect(validateDocumento('123456789')).toMatch(/7 u 8 dígitos/)
  })

  it('rechaza ceros y números completamente repetidos', () => {
    expect(validateDocumento('00000000')).toMatch(/solo ceros/)
    expect(validateDocumento('11111111')).toMatch(/número repetido/)
    expect(validateDocumento('9999999')).toMatch(/número repetido/)
  })

  it('rechaza exceso de un mismo dígito', () => {
    expect(validateDocumento('1111114')).toMatch(/demasiados dígitos repetidos/)
  })

  it('rechaza secuencias consecutivas', () => {
    expect(validateDocumento('12345678')).toMatch(/secuencia consecutiva/)
    expect(validateDocumento('87654321')).toMatch(/secuencia consecutiva/)
    expect(validateDocumento('2345678')).toMatch(/secuencia consecutiva/)
  })

  it('rechaza patrones de bloque repetido', () => {
    expect(validateDocumento('12121212')).toMatch(/patrón repetido/)
    expect(validateDocumento('12312312')).toMatch(/patrón repetido/)
    expect(validateDocumento('12341234')).toMatch(/patrón repetido/)
  })
})
