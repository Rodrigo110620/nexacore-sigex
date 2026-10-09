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
  sanitizeNormaInput,
  sanitizeAmbienteInput,
  validateAmbienteNombre,
  mensajeErrorCrearAmbiente,
  NORMA_MAX,
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
    // Con una sola aula se muestra solo el aula; el aforo aparece al repartir en varias.
    expect(detalleAmbiente({ ubicacion: 'FCyT UMSS', pabellon: 'B', capacidad: 40 })).toBe('Pabellón B · FCyT UMSS')
    expect(detalleAmbiente({ ubicacion: 'FCyT UMSS', pabellon: 'B', capacidad: 40 }, { conAforo: true }))
      .toBe('Pabellón B · FCyT UMSS · Aforo 40')
    expect(detalleAmbiente({ ubicacion: 'FCyT UMSS' }, { conAforo: true })).toBe('FCyT UMSS · Aforo sin registrar')
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

describe('normas: longitud 10–150 y espacios', () => {
  it('acepta hasta 150 caracteres y rechaza 151', () => {
    const base = 'Traer carnet universitario vigente '
    const texto150 = base.repeat(5).slice(0, 149) + 'x'
    expect(texto150).toHaveLength(150)
    expect(validateNormaTexto(texto150)).toBeNull()
    expect(validateNormaTexto(texto150 + 'x')).toMatch(/no puede superar 150/)
    expect(validateNormaTexto('Corto ok.')).toMatch(/al menos 10/)
  })

  it('no deja empezar con espacios, colapsa dobles y respeta el máximo', () => {
    expect(sanitizeNormaInput('   traer carnet')).toBe('Traer carnet')
    expect(sanitizeNormaInput('Traer  carnet')).toBe('Traer carnet')
    expect(sanitizeNormaInput('a'.repeat(200))).toHaveLength(NORMA_MAX)
  })
})

describe('normas: solo palabras reales', () => {
  it('acepta números, ordinales y puntuación', () => {
    expect(validateNormaTexto('Tolerancia de 30 minutos')).toBeNull()
    expect(validateNormaTexto('Traer CI del 2do semestre')).toBeNull()
    expect(validateNormaTexto('¿Dudas? Consultar al docente.')).toBeNull()
  })

  it('rechaza garabatos señalando la palabra', () => {
    expect(validateNormaTexto('Traer fsfasfsaf al examen')).toMatch(/"fsfasfsaf" no parece una palabra/)
    expect(validateNormaTexto('Asdfgh qwerty zxcvb')).toMatch(/no parece una palabra/)
    expect(validateNormaTexto('No usar celular abc123')).toMatch(/"abc123" no parece una palabra/)
  })
})

describe('nuevo ambiente', () => {
  const existentes = [{ nombre: '692F' }, { nombre: 'INFLAB' }]

  it('deja solo letras y números en mayúsculas', () => {
    expect(sanitizeAmbienteInput('692-f ')).toBe('692F')
    expect(sanitizeAmbienteInput('aula#1!')).toBe('AULA1')
    expect(sanitizeAmbienteInput('A'.repeat(30))).toHaveLength(20)
  })

  it('valida caracteres, longitud y duplicado real', () => {
    expect(validateAmbienteNombre('LABQUI', existentes)).toBeNull()
    expect(validateAmbienteNombre('682L0IN', existentes)).toBeNull()
    expect(validateAmbienteNombre('L813', existentes)).toBeNull()
    expect(validateAmbienteNombre('', existentes)).toMatch(/obligatorio/)
    expect(validateAmbienteNombre('LAB-3', existentes)).toMatch(/letras y números/)
    expect(validateAmbienteNombre('A', existentes)).toMatch(/al menos 2/)
    expect(validateAmbienteNombre('inflab', existentes)).toMatch(/Ya existe/)
  })

  it('rechaza garabatos y números sueltos como nombre de ambiente', () => {
    for (const nombre of ['ASDFGH', 'QWERTY', 'FSFASF', 'XKCD', '1234567', 'LAB3']) {
      expect(validateAmbienteNombre(nombre, existentes)).toMatch(/código de aula/)
    }
  })

  it('solo informa duplicado cuando el backend responde 409', () => {
    expect(mensajeErrorCrearAmbiente({ response: { status: 409, data: { mensaje: 'Ya existe LAB3' } } })).toBe('Ya existe LAB3')
    expect(mensajeErrorCrearAmbiente({ response: { status: 403 } })).toMatch(/administrador/)
    expect(mensajeErrorCrearAmbiente({ response: { status: 400, data: { errores: { nombre: 'Solo letras' } } } })).toBe('Solo letras')
    expect(mensajeErrorCrearAmbiente({ response: { status: 500 } })).not.toMatch(/duplicad|Ya existe/)
  })
})
