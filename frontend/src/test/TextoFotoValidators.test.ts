import { describe, expect, it } from 'vitest'
import { aOracion, validarDetalleReporte, validarMotivoRechazo } from '../utils/textoFotoValidators'

describe('textos de la revisión de fotos (HU#6, BUG-E01 a E10)', () => {
  it('el detalle del reporte solo admite letras y espacios, de 10 a 65 caracteres', () => {
    expect(validarDetalleReporte('Wwwwwwwwwwwwwww')).toBe('El detalle no puede ser una misma letra repetida')
    expect(validarDetalleReporte('11111111111111111111111')).toBe('El detalle solo admite letras y espacios')
    expect(validarDetalleReporte('?????????????????????????????')).toBe('El detalle solo admite letras y espacios')
    expect(validarDetalleReporte('la persona no se parece '.repeat(3))).toBe('El detalle no puede superar 65 caracteres')
    expect(validarDetalleReporte('ff')).toBe('El detalle debe tener al menos 10 caracteres')
    expect(validarDetalleReporte('')).toBeNull()
    expect(validarDetalleReporte('No se parece a la foto registrada')).toBeNull()
  })

  it('el motivo del rechazo no admite números ni solo signos, ni una letra repetida', () => {
    expect(validarMotivoRechazo('??????????????????????????????')).toBe('El motivo del rechazo solo admite letras, espacios, coma y punto')
    expect(validarMotivoRechazo('111111111111111111111111111111111')).toBe('El motivo del rechazo no puede contener números')
    expect(validarMotivoRechazo('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')).toBe('El motivo del rechazo no puede ser una misma letra repetida')
    expect(validarMotivoRechazo('')).toBe('Indica el motivo del rechazo')
    expect(validarMotivoRechazo('La foto está borrosa, toma otra con más luz.')).toBeNull()
  })

  it('se guardan en formato oración', () => {
    expect(aOracion('LA PERSONA NO SE PARECE AL DE LA FOTO')).toBe('La persona no se parece al de la foto')
    expect(aOracion('  la foto   está borrosa ')).toBe('La foto está borrosa')
  })
})
