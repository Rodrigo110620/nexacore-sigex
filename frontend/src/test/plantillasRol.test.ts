import { describe, expect, it } from 'vitest'
import { PLANTILLAS_ROL, permisosFaltantes, sugerirPlantillas } from '../utils/plantillasRol'
import { TODOS_LOS_PERMISOS } from '../utils/permisos'

const todos = new Set<string>(TODOS_LOS_PERMISOS)
const titulos = (lista: { titulo: string }[]) => lista.map((x) => x.titulo)

describe('Plantillas de roles', () => {
  it('cada plantilla usa permisos que existen, no incluye los del ADMIN y no deja permisos sin lo que necesitan', () => {
    for (const p of PLANTILLAS_ROL) {
      expect(p.permisos.every((c) => todos.has(c)), p.titulo).toBe(true)
      expect(p.permisos, p.titulo).not.toContain('USUARIOS_GESTIONAR')
      expect(p.permisos, p.titulo).not.toContain('ROLES_GESTIONAR')
      expect(permisosFaltantes(new Set(p.permisos), todos), p.titulo).toEqual([])
      expect(p.nombre, p.titulo).toMatch(/^[A-Z][A-Z_]{2,29}$/)
    }
    expect(new Set(PLANTILLAS_ROL.map((p) => p.id)).size).toBe(PLANTILLAS_ROL.length)
  })

  it('sugiere recién al escribir y según lo escrito, sin tildes ni mayúsculas', () => {
    expect(sugerirPlantillas('', '')).toEqual([])
    expect(sugerirPlantillas('A', '')).toEqual([])
    expect(titulos(sugerirPlantillas('AUX', ''))).toContain('Auxiliar de control')
    expect(titulos(sugerirPlantillas('SECRE', ''))).toEqual(['Secretaría de reportes'])
    expect(titulos(sugerirPlantillas('', 'Revisa las fotos'))).toContain('Revisión de fotos')
    expect(titulos(sugerirPlantillas('AYUDANTE', ''))).toEqual(['Ayudante de cátedra'])
    expect(titulos(sugerirPlantillas('', 'Dirección de la carrera'))).toContain('Dirección de carrera')
    expect(titulos(sugerirPlantillas('COO', ''))).toEqual(['Coordinación de exámenes'])
    expect(sugerirPlantillas('ZZZZ', '')).toEqual([])
  })

  it('avisa el permiso que falta y propone uno del catálogo', () => {
    expect(permisosFaltantes(new Set(['EXPULSAR_TODOS']), todos)).toEqual([
      { permiso: 'EXPULSAR_TODOS', sugerido: 'CONTROL_INGRESO_TODOS', para: 'llegar a la pantalla del control, donde se expulsa' },
    ])
    expect(permisosFaltantes(new Set(['EXPULSAR_TODOS', 'CONTROL_INGRESO_TODOS', 'EXAMENES_VER_TODOS']), todos)).toEqual([])
  })
})
