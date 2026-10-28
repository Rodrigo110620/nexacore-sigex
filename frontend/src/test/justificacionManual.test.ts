import { describe, it, expect } from 'vitest'
import { validarJustificacion, normalizarJustificacion, contarLetrasJustificacion } from '../utils/justificacionManual'

describe('INCI-02 BUG-B01 a B06', () => {
  it.each(['celular apagado', 'CELULAR APAGADO', 'cElUlAr aPaGaDo'])('normaliza %s', texto => {
    expect(normalizarJustificacion(texto)).toBe('Celular apagado')
  })
  it.each(['', ' ', 'QR roto', 'a'.repeat(66), '12345678901', 'Celular  apagado', ' Celular apagado', 'Celular apagado ', 'Celular\tapagado', 'Celular\napagado', 'Celular apagado!', 'Celular apagado 2'])('rechaza %s', texto => {
    expect(validarJustificacion(texto)).not.toBeNull()
  })
  it('cuenta letras sin espacios y acepta el limite con tildes', () => {
    const texto = 'á'.repeat(32) + ' ' + 'ñ'.repeat(33)
    expect(contarLetrasJustificacion(texto)).toBe(65)
    expect(validarJustificacion(texto)).toBeNull()
    expect(validarJustificacion(texto + 'ü')).not.toBeNull()
    expect(normalizarJustificacion('ÁRBOL CAÍDO')).toBe('Árbol caído')
  })
})
