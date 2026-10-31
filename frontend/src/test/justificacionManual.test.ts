import { describe, it, expect } from 'vitest'
import { validarJustificacion, normalizarJustificacion, contarLetrasJustificacion } from '../utils/justificacionManual'

describe('INCI-02 BUG-B01 a B06', () => {
  it.each(['celular apagado', 'CELULAR APAGADO', 'cElUlAr aPaGaDo'])('normaliza %s', texto => {
    expect(normalizarJustificacion(texto)).toBe('Celular apagado')
  })
  it.each(['', ' ', 'QR roto', 'a'.repeat(66), '12345678901', 'Celular  apagado', ' Celular apagado', 'Celular\tapagado', 'Celular\napagado', 'Celular apagado!', 'Celular apagado 2'])('rechaza %s', texto => {
    expect(validarJustificacion(texto)).not.toBeNull()
  })
  it('BUG-B02: aplica el máximo de 65 caracteres incluyendo espacios', () => {
    const texto = 'No tiene celular y solicita ingreso manual por documento de papel'
    expect(texto).toHaveLength(65)
    expect(validarJustificacion(texto)).toBeNull()
    expect(validarJustificacion(texto + 'a')).not.toBeNull()
    expect(contarLetrasJustificacion(texto)).toBeLessThan(65)
  })
  it.each(['t'.repeat(40), 'Bhgghjhgggyjy'])('BUG-B03: rechaza %s', texto => {
    expect(validarJustificacion(texto)).toContain('contenido no válido')
  })
  it.each(['No tiene celular\n', 'No tiene celular  \r\n'])('BUG-B04: acepta y limpia el final', texto => {
    expect(validarJustificacion(texto)).toBeNull()
    expect(normalizarJustificacion(texto)).toBe('No tiene celular')
  })
})
