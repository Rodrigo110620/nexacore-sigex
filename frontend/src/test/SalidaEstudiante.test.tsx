import { fireEvent, render, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import EstudiantesExamenLista from '../components/control/EstudiantesExamenLista'
import api from '../services/api'
import type { EstudianteAsignado } from '../services/controlExamenService'

vi.mock('../services/api')
const base: EstudianteAsignado = {
  idEstudiante: 10, nombre: 'Lucía', apellidos: 'Aguilar', codigoSis: '202600101', ci: '9000101', carrera: 'Sistemas',
  estado: 'HABILITADO', motivoInhabilitacion: null, ingresado: true, expulsado: false,
}
function montar(rol: string, estudiante: Partial<EstudianteAsignado>, onExito = vi.fn()) {
  localStorage.setItem('token', 'test')
  localStorage.setItem('roles', JSON.stringify([rol]))
  const r = render(<AuthProvider><MemoryRouter><EstudiantesExamenLista idExamen={20} estudiantes={[{ ...base, ...estudiante }]} onExito={onExito} /></MemoryRouter></AuthProvider>)
  return { ...r, tabla: within(r.container.querySelector('table')!) }
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.get).mockResolvedValue({ data: [] })
})

it('V56: el CONTROL registra la salida en dos toques y la lista se actualiza', async () => {
  vi.mocked(api.post).mockResolvedValue({ data: { fechaHoraSalida: '2026-11-09T10:15:00' } })
  const onExito = vi.fn()
  const { tabla } = montar('CONTROL', {}, onExito)
  fireEvent.click(tabla.getByRole('button', { name: 'Registrar salida de Lucía Aguilar' }))
  expect(api.post).not.toHaveBeenCalled() // el primer toque solo pide confirmar
  fireEvent.click(tabla.getByRole('button', { name: 'Confirmar la salida de Lucía Aguilar' }))
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/control-ingresos/salida', { idEstudiante: 10, idExamen: 20 }))
  await waitFor(() => expect(onExito).toHaveBeenCalled())
})

it('si el servidor la rechaza, muestra su mensaje', async () => {
  vi.mocked(api.post).mockRejectedValue({ response: { data: { mensaje: 'La salida ya está registrada a las 10:15:00' } } })
  const { tabla } = montar('CONTROL', {})
  fireEvent.click(tabla.getByRole('button', { name: 'Registrar salida de Lucía Aguilar' }))
  fireEvent.click(tabla.getByRole('button', { name: 'Confirmar la salida de Lucía Aguilar' }))
  expect(await tabla.findByRole('alert')).toHaveTextContent('La salida ya está registrada a las 10:15:00')
})

it.each([
  ['sin ingreso', 'CONTROL', { ingresado: false }],
  ['expulsado', 'CONTROL', { expulsado: true }],
  ['que ya salió', 'CONTROL', { fechaHoraSalida: '2026-11-09T10:15:00' }],
  ['visto por el ADMIN (supervisa, no registra)', 'ADMIN', {}],
])('no ofrece la salida para un estudiante %s', (_caso, rol, estudiante) => {
  const { tabla } = montar(rol, estudiante)
  expect(tabla.queryByRole('button', { name: /salida de Lucía Aguilar/ })).not.toBeInTheDocument()
})

it('muestra «SALIÓ» con la hora en el estado', () => {
  const { tabla } = montar('CONTROL', { fechaHoraSalida: '2026-11-09T10:15:00' })
  expect(tabla.getByText('SALIÓ 10:15')).toBeInTheDocument()
})
