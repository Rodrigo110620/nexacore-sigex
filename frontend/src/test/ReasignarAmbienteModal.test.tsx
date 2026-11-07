import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import ReasignarAmbienteModal from '../components/control/ReasignarAmbienteModal'
import { reasignarAmbiente } from '../services/controlExamenService'

vi.mock('../services/ambienteService', () => ({ listarAmbientes: vi.fn().mockResolvedValue([]) }))
vi.mock('../services/controlExamenService', () => ({ reasignarAmbiente: vi.fn().mockResolvedValue(undefined) }))

const estudiante = {
  idEstudiante: 10, nombre: 'Lucía', apellidos: 'Aguilar', codigoSis: '202600123', ci: '9000101', carrera: 'Sistemas',
  estado: 'HABILITADO' as const, motivoInhabilitacion: null, ingresado: true, idAmbienteIngreso: 1,
}
const aulas = [
  { id: 1, nombre: '690A', ubicacion: null },
  { id: 2, nombre: '690B', ubicacion: null },
]

function abrir() {
  render(<ReasignarAmbienteModal idExamen={20} estudiante={estudiante} aulas={aulas} aulaActualId={1} onClose={vi.fn()} onSuccess={vi.fn()} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } })
}

beforeEach(() => vi.mocked(reasignarAmbiente).mockClear())

it('INCI-03: envía el motivo con sus espacios, tildes y ñ; el servidor le da el formato oración', async () => {
  abrir()
  const [motivo, observacion] = screen.getAllByRole('textbox')
  fireEvent.change(motivo, { target: { value: 'Computadora dañada en el aula 690A' } })
  fireEvent.change(observacion, { target: { value: 'Pantalla sin señal' } })
  fireEvent.click(screen.getByRole('button', { name: /reasignar/i }))

  await waitFor(() => expect(reasignarAmbiente).toHaveBeenCalledWith(20, 10, {
    idAmbienteDestino: 2,
    motivo: 'Computadora dañada en el aula 690A',
    observacion: 'Pantalla sin señal',
  }))
})

it('INCI-03: el motivo de menos de 10 caracteres no se envía', () => {
  abrir()
  fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Red caída' } })
  fireEvent.click(screen.getByRole('button', { name: /reasignar/i }))

  expect(screen.getByText(/al menos 10 caracteres/)).toBeInTheDocument()
  expect(reasignarAmbiente).not.toHaveBeenCalled()
})

it('INCI-03: la observación tiene el mismo límite de 65 caracteres que el servidor; el motivo, 200 (IMP-14)', () => {
  abrir()
  expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('maxLength', '200')
  expect(screen.getAllByRole('textbox')[1]).toHaveAttribute('maxLength', '65')
  expect(screen.getByText('0/200')).toBeInTheDocument()
  expect(screen.getByText('0/65')).toBeInTheDocument()
})

it('IMP-14 y sección 24: el motivo del traslado sigue la regla de la expulsión y ofrece motivos frecuentes', () => {
  abrir()
  const motivo = screen.getAllByRole('textbox')[0]
  // Misma normalización que la expulsión: espacios simples, formato oración, siglas y aula con cifras.
  fireEvent.change(motivo, { target: { value: '  AULA   690A LLENA, PASA CON SU CI  ' } })
  fireEvent.blur(motivo)
  expect(motivo).toHaveValue('Aula 690A llena, pasa con su CI')
  // La ü se acepta.
  fireEvent.change(motivo, { target: { value: 'Necesidad lingüística del estudiante' } })
  fireEvent.blur(motivo)
  expect(screen.queryByText(/contenido no válido|al menos 10/)).not.toBeInTheDocument()
  const frecuentes = screen.getByRole('group', { name: 'Motivos frecuentes' })
  expect(within(frecuentes).getAllByRole('button').map((b) => b.textContent)).toEqual(['Aula llena', 'Aula incorrecta', 'Problema en el aula', 'Necesidad especial'])
  fireEvent.click(within(frecuentes).getByRole('button', { name: 'Aula llena' }))
  expect(motivo).toHaveValue('Aula llena')
})
