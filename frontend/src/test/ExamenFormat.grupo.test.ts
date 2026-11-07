import { describe, expect, it } from 'vitest'
import { materiaYGrupo } from '../utils/examenFormat'

describe('materiaYGrupo', () => {
  it('distingue los exámenes de la misma materia por su grupo', () => {
    expect(materiaYGrupo({ asignatura: 'Base de Datos I', grupo: 'G2' })).toBe('Base de Datos I · G2')
    expect(materiaYGrupo({ asignatura: 'Base de Datos I', grupo: null })).toBe('Base de Datos I')
  })
})
