import { describe, expect, it } from 'vitest'
import {
  formatAmPm,
  formatFechaDisplay,
  sanitizeCatalogQuery,
  validateExamenForm,
  validateNormaTexto,
} from '../utils/examFormUtils'

const baseForm = {
  asignatura: 'BASE DE DATOS',
  docente: 'Ana Pérez',
  fecha: '2099-12-01',
  horaInicio: '08:00',
  horaFin: '10:00',
  idAmbiente: '1',
}

describe('examFormUtils', () => {
  it('formatea fecha a dd/mm/aaaa y hora a AM/PM', () => {
    expect(formatFechaDisplay('2026-09-27')).toBe('27/09/2026')
    expect(formatAmPm('08:00')).toBe('8:00 AM')
    expect(formatAmPm('13:30')).toBe('1:30 PM')
  })

  it('limpia la búsqueda de catálogo y limita a 100 caracteres', () => {
    expect(sanitizeCatalogQuery('  Base# de $Datos')).toBe('Base de Datos')
    expect(sanitizeCatalogQuery('a'.repeat(120)).length).toBe(100)
  })

  it('exige elegir asignatura y docente del catálogo', () => {
    const errors = validateExamenForm(baseForm, {
      asignaturaSeleccionada: false,
      docenteSeleccionado: false,
    })
    expect(errors.asignatura).toMatch(/catálogo/)
    expect(errors.docente).toMatch(/sugerencias/)
  })

  it('valida el contenido de las normas', () => {
    expect(validateNormaTexto('Traer carnet universitario vigente')).toBeNull()
    expect(validateNormaTexto('          ')).toMatch(/vacía/)
    expect(validateNormaTexto(' Traer carnet vigente')).toMatch(/inicio ni al final/)
    expect(validateNormaTexto('Traer  carnet vigente')).toMatch(/dobles/)
    expect(validateNormaTexto('Corto')).toMatch(/al menos 10/)
    expect(validateNormaTexto('1234567890')).toMatch(/solo números/)
    expect(validateNormaTexto('#$%&/()=?¡!')).toMatch(/texto descriptivo/)
    expect(validateNormaTexto('aaaaaaaaaaaa')).toMatch(/repetido/)
    expect(validateNormaTexto('Traer carnet vigente', ['traer carnet vigente'])).toMatch(/ya fue registrada/)
  })

  it('rechaza fechas anteriores a hoy', () => {
    const errors = validateExamenForm(
      { ...baseForm, fecha: '2000-01-01' },
      { asignaturaSeleccionada: true, docenteSeleccionado: true },
    )
    expect(errors.fecha).toMatch(/hoy/)
  })
})
