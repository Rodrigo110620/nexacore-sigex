import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement, useState } from 'react'
import HoraSelector from '../components/examenes/HoraSelector'
import {
  detalleAmbiente,
  filtrarAmbientes,
  formatAmPm,
  formatFechaDisplay,
  formatHora24,
  sanitizeHoraInput,
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

describe('helpers compartidos de los modales de examen', () => {
  it('sanitizeHoraInput deja solo dígitos y pone los dos puntos', () => {
    expect(sanitizeHoraInput('8')).toBe('8')
    expect(sanitizeHoraInput('0830')).toBe('08:30')
    expect(sanitizeHoraInput('08:3a0x9')).toBe('08:30')
  })

  it('formatHora24 rellena con ceros', () => {
    expect(formatHora24(8, 5)).toBe('08:05')
  })

  it('filtrarAmbientes busca por nombre o ubicación sin distinguir mayúsculas', () => {
    const ambientes = [
      { id: 1, nombre: '691A', ubicacion: 'Edificio nuevo' },
      { id: 2, nombre: 'Auditorio', ubicacion: null },
    ]
    expect(filtrarAmbientes(ambientes, '  ')).toHaveLength(2)
    expect(filtrarAmbientes(ambientes, 'audi').map((a) => a.id)).toEqual([2])
    expect(filtrarAmbientes(ambientes, 'NUEVO').map((a) => a.id)).toEqual([1])
  })

  it('rechaza normas con caracteres no permitidos o patrones repetitivos y admite números dentro del texto', () => {
    expect(validateNormaTexto('CI: original y vigente')).toBeNull()
    expect(validateNormaTexto('Tolerancia de 30 minutos')).toBeNull()
    expect(validateNormaTexto('¿Dudas? Consultar al docente.')).toBeNull()
    expect(validateNormaTexto('Prohibido <script> aquí')).toMatch(/caracteres no permitidos/)
    expect(validateNormaTexto('##########')).toMatch(/no permitidos|texto descriptivo/)
    expect(validateNormaTexto('ababababababab')).toMatch(/patrón repetitivo/)
    expect(validateNormaTexto('jaja jaja jaja')).toMatch(/patrón repetitivo/)
    expect(validateNormaTexto('aaaaaaaaaaaa')).toMatch(/mismo carácter/)
  })

  it('el catálogo solo admite letras, tildes, ñ y espacios simples', () => {
    expect(sanitizeCatalogQuery("O'Brien-Pérez")).toBe('OBrienPérez')
    expect(sanitizeCatalogQuery('Cálculo   II ')).toBe('Cálculo II ')
    expect(sanitizeCatalogQuery('Ñandú 123')).toBe('Ñandú ')
  })

  it('marca el ambiente ocupado como error y pide hora y minutos completos', () => {
    const catalogo = { asignaturaSeleccionada: true, docenteSeleccionado: true }
    expect(validateExamenForm(baseForm, { ...catalogo, ambienteOcupado: true }).idAmbiente).toMatch(/ocupado/)
    expect(validateExamenForm(baseForm, catalogo).idAmbiente).toBeUndefined()
    expect(validateExamenForm({ ...baseForm, horaInicio: '08:' }, catalogo).horaInicio).toMatch(/hora y los minutos/)
    expect(validateExamenForm({ ...baseForm, horaFin: ':' }, catalogo).horaFin).toMatch(/obligatoria/)
  })

  it('describe pabellón, ubicación y aforo del ambiente', () => {
    expect(detalleAmbiente({ ubicacion: 'FCyT UMSS', pabellon: 'B', capacidad: 40 })).toBe('Pabellón B · FCyT UMSS · Aforo 40')
    expect(detalleAmbiente({ ubicacion: 'FCyT UMSS' })).toBe('FCyT UMSS · Aforo sin registrar')
  })

  it('HoraSelector arma HH:MM con selectores y muestra AM/PM', () => {
    function Envoltorio() {
      const [valor, setValor] = useState('')
      return createElement(HoraSelector, { id: 'h', label: 'Hora de inicio', value: valor, onChange: setValor })
    }
    render(createElement(Envoltorio))
    fireEvent.change(screen.getByLabelText('Hora de inicio: hora'), { target: { value: '14' } })
    fireEvent.change(screen.getByLabelText('Hora de inicio: minutos'), { target: { value: '30' } })
    expect(screen.getByText('2:30 PM')).toBeInTheDocument()
  })
})
