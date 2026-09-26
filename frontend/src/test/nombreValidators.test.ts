import { describe, expect, it } from 'vitest'
import {
  esMismaLetraRepetida,
  sanitizeNombreInput,
  validateApellidos,
  validateNombre,
} from '../utils/validators'

describe('sanitizeNombreInput', () => {
  it('formatea a Título: primera mayúscula, resto minúsculas', () => {
    expect(sanitizeNombreInput('  roberto  carlos')).toBe('Roberto Carlos')
    expect(sanitizeNombreInput('MARÍA JOSÉ')).toBe('María José')
    expect(sanitizeNombreInput('rodrigo figueroa camacho')).toBe('Rodrigo Figueroa Camacho')
  })

  it('elimina números y caracteres especiales', () => {
    expect(sanitizeNombreInput('Ana123@#')).toBe('Ana')
  })

  it('con trimEnds quita el espacio final', () => {
    expect(sanitizeNombreInput('Ana ', { trimEnds: true })).toBe('Ana')
  })

  it('respeta guion y apóstrofe', () => {
    expect(sanitizeNombreInput("maría-josé")).toBe('María-José')
    expect(sanitizeNombreInput("o'connor")).toBe("O'Connor")
  })
})

describe('validateNombre / validateApellidos', () => {
  it('acepta nombres compuestos válidos en formato Título', () => {
    expect(validateNombre('Roberto Carlos')).toBe('')
    expect(validateApellidos('De La Cruz')).toBe('')
    expect(validateNombre('María-José')).toBe('')
  })

  it('rechaza palabra de una sola letra', () => {
    expect(validateNombre('A B')).toContain('mínimo 2')
    expect(validateApellidos('J')).toContain('Mínimo')
  })

  it('rechaza la misma letra repetida', () => {
    expect(esMismaLetraRepetida('JJJJJJJJJ')).toBe(true)
    expect(validateApellidos('Jjjjjjjjj')).toContain('misma letra')
    expect(validateNombre('Aaaa')).toContain('misma letra')
  })

  it('rechaza números y caracteres inválidos', () => {
    expect(validateNombre('Ana2')).toContain('números')
    expect(validateNombre('Ana@')).toContain('válido')
  })
})
