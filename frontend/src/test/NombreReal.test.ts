import { describe, expect, it } from 'vitest'
import { nombreSinSentido, validateApellidos, validateNombre } from '../utils/validators'

describe('Nombres reales al registrar y editar', () => {
  it.each(['Juan Carlos', 'María José', 'Kjarkas', "Q'uispe", 'Schmidt', 'Llanque Mamani', 'Ly', 'Ñuflo', 'Pérez-Rojas'])(
    'acepta «%s»', (n) => expect(nombreSinSentido(n)).toBe(''))

  it.each([['Aaaa', 'misma letra'], ['Bbbb Cccc', 'misma letra'], ['Xkcd', 'vocal'], ['Qwerty', 'teclado'],
    ['Asdfgh', 'consonantes'], ['Asdfeo', 'teclado'], ['Jajaja', 'nombre real'], ['Mnbvcxz', 'vocal'], ['Strzk', 'vocal']])('rechaza «%s»', (n, motivo) => {
    expect(nombreSinSentido(n)).toContain(motivo)
  })

  it('el mensaje dice el campo', () => {
    expect(validateNombre('Qwerty')).toMatch(/^El nombre:/)
    expect(validateApellidos('Qwerty')).toMatch(/^Los apellidos:/)
  })
})
