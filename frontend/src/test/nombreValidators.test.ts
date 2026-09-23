import { describe, expect, it } from 'vitest'
import {
  esMismaLetraRepetida,
  sanitizeNombreInput,
  validateApellidos,
  validateNombre,
} from '../utils/validators'

describe('sanitizeNombreInput', () => {
  it('permite compuestos, tildes y un espacio; colapsa dobles; quita iniciales', () => {
    expect(sanitizeNombreInput('  roberto  carlos')).toBe('ROBERTO CARLOS')
    expect(sanitizeNombreInput('maría josé')).toBe('MARÍA JOSÉ')
  })

  it('elimina números y caracteres especiales', () => {
    expect(sanitizeNombreInput('Ana123@#')).toBe('ANA')
  })

  it('con trimEnds quita el espacio final', () => {
    expect(sanitizeNombreInput('ANA ', { trimEnds: true })).toBe('ANA')
  })
})

describe('validateNombre / validateApellidos', () => {
  it('acepta nombres compuestos válidos', () => {
    expect(validateNombre('ROBERTO CARLOS')).toBe('')
    expect(validateApellidos('DE LA CRUZ')).toBe('')
    expect(validateNombre('MARÍA-JOSÉ')).toBe('')
  })

  it('rechaza palabra de una sola letra', () => {
    expect(validateNombre('A B')).toContain('mínimo 2')
    expect(validateApellidos('J')).toContain('Mínimo')
  })

  it('rechaza la misma letra repetida', () => {
    expect(esMismaLetraRepetida('JJJJJJJJJ')).toBe(true)
    expect(validateApellidos('JJJJJJJJJ')).toContain('misma letra')
    expect(validateNombre('AAAA')).toContain('misma letra')
  })

  it('rechaza números y caracteres inválidos', () => {
    expect(validateNombre('ANA2')).toContain('números')
    expect(validateNombre('ANA@')).toContain('válido')
  })
})
