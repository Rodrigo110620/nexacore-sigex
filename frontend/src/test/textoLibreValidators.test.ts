import { describe, expect, it } from 'vitest'
import { DETALLE_DENEGACION, validarTextoLibre } from '../utils/textoLibreValidators'

const validar = (texto: string) => validarTextoLibre(texto, DETALLE_DENEGACION)

describe('validarTextoLibre: detalle de la denegación (BUG-D02)', () => {
  it('es opcional y acepta letras con tilde, ñ, números, espacios y los signos permitidos', () => {
    expect(validar('')).toBeNull()
    expect(validar('x')).toBeNull()
    expect(validar('Llegó tarde: 10 min (sin credencial); ¿avisó? ¡No! - Ñandú.')).toBeNull()
    expect(validar('a'.repeat(499) + 'b')).toBeNull()
    expect(validar('\nPrimera línea\nsegunda.\n')).toBeNull()
    expect(validar('Güemes vio un pingüino. ÜBER')).toBeNull()
  })

  it.each([
    ['   ', 'no puede tener solo espacios'],
    [' \n \n ', 'no puede tener solo espacios'],
    ['Llegó ’tarde’', 'tiene caracteres no permitidos: ’'],
    ['Dijo "no" & salió', 'tiene caracteres no permitidos: " &'],
    ['Llegó\ttarde', 'tiene caracteres no permitidos: tabulación'],
    ['a\na\n a', 'no puede ser un mismo carácter repetido'],
    ['üÜ üÜ', 'no puede ser un mismo carácter repetido'],
    ['???????', 'debe tener letras o números, no solo signos'],
    ['... --- !!!', 'debe tener letras o números, no solo signos'],
    ['tttttttttt', 'no puede ser un mismo carácter repetido'],
    ['a'.repeat(501), 'no puede superar 500 caracteres'],
  ])('"%s" → %s', (texto, motivo) => {
    expect(validar(texto)).toBe(`El detalle adicional ${motivo}`)
  })
})
