import { describe, expect, it } from 'vitest'
import { validateSisDistintoDeCi } from '../utils/validators'

describe('el código SIS y el C.I. no pueden ser iguales', () => {
  it('rechaza un C.I. igual al SIS o contenido en él', () => {
    expect(validateSisDistintoDeCi('202104010', '20210401')).toBe('El C.I. no puede ser igual al código SIS ni estar contenido en él')
    expect(validateSisDistintoDeCi('202104010', '2104010')).not.toBeNull()
  })
  it('acepta datos distintos y no opina si falta alguno', () => {
    expect(validateSisDistintoDeCi('202104010', '7489210')).toBeNull()
    expect(validateSisDistintoDeCi('', '7489210')).toBeNull()
  })
})
