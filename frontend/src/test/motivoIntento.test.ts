import { describe, it, expect } from 'vitest'
import { validarMotivoIntento, normalizarMotivoIntento } from '../utils/motivoIntento'

describe('BUG 9: motivo del intento', () => {
  it.each(['', 'Corto', '1234567890', '..........', 'RRRRRRRRRR', 'Aulaaaaaaaaaa', 'Motivo  inválido', 'Motivo inválido!', 'Motivo\ninválido', 'a'.repeat(66)])('rechaza %s', texto => {
    expect(validarMotivoIntento(texto)).not.toBeNull()
  })
  it.each(['Intentó ingresar; examen equivocado.', 'No corresponde, presenta CI 74839201', 'No tiene celular y solicita ingreso manual por documento de papel'])('acepta %s', texto => {
    expect(validarMotivoIntento(texto)).toBeNull()
  })
  it('guarda formato oración', () => expect(normalizarMotivoIntento('INTENTÓ INGRESAR; EXAMEN EQUIVOCADO.')).toBe('Intentó ingresar; examen equivocado.'))
})
