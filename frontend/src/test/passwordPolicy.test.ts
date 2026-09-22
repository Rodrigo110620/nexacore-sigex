import { describe, expect, it } from 'vitest'
import { validateNewPassword } from '../utils/passwordPolicy'

describe('política de contraseñas nuevas', () => {
  it('acepta una contraseña con todos los requisitos', () => {
    expect(validateNewPassword('Segura1!')).toBe('')
    expect(validateNewPassword('Frase larga 2026!')).toBe('')
  })

  it.each([
    ['', 'obligatoria'],
    ['Aa1!', 'Mínimo 8'],
    ['segura12!', 'mayúscula'],
    ['SEGURA12!', 'minúscula'],
    ['Seguraxx!', 'número'],
    ['Segura12', 'símbolo'],
    ['Segura1 ', 'símbolo'],
    ['Áa1!' + 'é'.repeat(35), 'demasiado larga'],
  ])('rechaza una contraseña que incumple un requisito', (value, message) => {
    expect(validateNewPassword(value)).toContain(message)
  })
})
