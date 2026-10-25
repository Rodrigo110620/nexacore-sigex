import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AvisoIngresoExamen from '../components/estudiantes/AvisoIngresoExamen'
import type { MiExamen } from '../services/panelEstudianteService'

// Hora del servidor fija en las pruebas: 2026-10-24 07:50 en Bolivia (11:50 UTC).
vi.mock('../services/tiempoService', () => ({
  sincronizarReloj: () => Promise.resolve(),
  ahoraServidorMs: () => Date.UTC(2026, 9, 24, 11, 50),
  offsetServidorMinutos: () => -240,
}))

const examen = (extra: Partial<MiExamen> = {}): MiExamen => ({
  idExamen: 1, materia: 'Física General', fecha: '2026-10-24', horaInicio: '08:00:00', duracionMinutos: 90,
  aula: '691A', habilitado: true, motivoInhabilitacion: null, resultadoIngreso: null, motivoDenegacion: null,
  fechaHoraIngreso: null, expulsado: false, normasGenerales: [], normasParticulares: [], ...extra,
} as MiExamen)

const mostrar = (e: MiExamen) => render(<MemoryRouter><AvisoIngresoExamen examen={e} /></MemoryRouter>)

describe('AvisoIngresoExamen', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }) })
  afterEach(() => { vi.useRealTimers() })

  it('avisa que el examen empieza pronto, con el aula y el acceso a Mi QR', () => {
    mostrar(examen())
    expect(screen.getByRole('status')).toHaveTextContent('Tu examen de Física General empieza en 10 min')
    expect(screen.getByRole('status')).toHaveTextContent('Preséntate en el aula 691A con tu QR y tu carnet.')
    expect(screen.getByRole('link', { name: /Mostrar mi QR/ })).toHaveAttribute('href', '/estudiante/qr')
  })

  it('si el examen ya empezó y no ingresó, lo avisa', () => {
    mostrar(examen({ horaInicio: '07:30:00' }))
    expect(screen.getByRole('status')).toHaveTextContent('ya empezó y aún no registraste tu ingreso')
  })

  it('no avisa si falta mucho, si ya ingresó o si no está habilitado', () => {
    const { container } = mostrar(examen({ horaInicio: '10:00:00' }))
    expect(container).toBeEmptyDOMElement()
    expect(mostrar(examen({ horaInicio: '07:30:00', fechaHoraIngreso: '2026-10-24T07:28:00', resultadoIngreso: 'AUTORIZADO' })).container).toBeEmptyDOMElement()
    expect(mostrar(examen({ horaInicio: '07:30:00', habilitado: false })).container).toBeEmptyDOMElement()
  })
})
