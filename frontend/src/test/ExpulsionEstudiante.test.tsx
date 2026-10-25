import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import EstudiantesExamenLista from '../components/control/EstudiantesExamenLista'
import api from '../services/api'

vi.mock('../services/api')
const estudiante = {
  idEstudiante: 10, nombre: 'Lucía', apellidos: 'Aguilar', codigoSis: '2026001',
  ci: '9000101', carrera: 'Sistemas', estado: 'HABILITADO' as const,
  motivoInhabilitacion: null, ingresado: true, expulsado: false,
}
function montar(rol = 'ADMIN', ingresado = true, expulsado = false) {
  localStorage.setItem('token', 'test')
  localStorage.setItem('roles', JSON.stringify([rol]))
  return render(<AuthProvider><MemoryRouter><EstudiantesExamenLista idExamen={20} examen="Ingeniería · Aula 201" estudiantes={[{ ...estudiante, ingresado, expulsado }]} /></MemoryRouter></AuthProvider>)
}
beforeEach(() => {
  vi.resetAllMocks()
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
})

it.each([
  { rol: 'ADMIN', ingresado: true, expulsado: false, visible: true },
  { rol: 'CONTROL', ingresado: true, expulsado: false, visible: false },
  { rol: 'DOCENTE', ingresado: true, expulsado: false, visible: false },
  { rol: 'ADMIN', ingresado: false, expulsado: false, visible: false },
  { rol: 'ADMIN', ingresado: true, expulsado: true, visible: false },
])('comparte elegibilidad en tabla y tarjetas: $rol, ingresado=$ingresado, expulsado=$expulsado', ({ rol, ingresado, expulsado, visible }) => {
  const { container } = montar(rol, ingresado, expulsado)
  for (const selector of ['table', 'ul']) {
    const vista = within(container.querySelector(selector)!)
    expect(vista.queryAllByRole('button', { name: 'Expulsar' })).toHaveLength(visible ? 1 : 0)
    expect(vista.getByRole('link', { name: 'Identificar a Lucía Aguilar' })).toHaveAttribute('href', '/dashboard/control/20/identificar?codigo=2026001')
  }
})

it.each([0, 1])('abre y cancela desde la vista %s; un motivo vacío no envía', (indice) => {
  montar()
  fireEvent.click(screen.getAllByRole('button', { name: 'Expulsar' })[indice])
  const modal = screen.getByRole('dialog', { name: 'Confirmar expulsión' })
  expect(within(modal).getByText('Lucía Aguilar')).toBeInTheDocument()
  expect(within(modal).getByText(/Examen #20 · Ingeniería/)).toBeInTheDocument()
  fireEvent.change(within(modal).getByRole('textbox'), { target: { value: '   ' } })
  expect(within(modal).getByRole('button', { name: 'Confirmar expulsión' })).toBeDisabled()
  fireEvent.submit(modal.querySelector('form')!)
  expect(api.post).not.toHaveBeenCalled()
  fireEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it.each([0, 1])('vista %s: carga, doble envío, error HTTP y 2xx sin confirmar', async (indice) => {
  let rechazar!: (error: unknown) => void
  vi.mocked(api.post).mockImplementationOnce(() => new Promise((_, reject) => { rechazar = reject }))
  montar()
  fireEvent.click(screen.getAllByRole('button', { name: 'Expulsar' })[indice])
  const modal = screen.getByRole('dialog')
  const campo = within(modal).getByRole('textbox')
  fireEvent.change(campo, { target: { value: 'Uso de celular' } })
  fireEvent.submit(modal.querySelector('form')!)
  fireEvent.submit(modal.querySelector('form')!)
  expect(api.post).toHaveBeenCalledTimes(1)
  expect(within(modal).getByRole('button', { name: 'Enviando…' })).toBeDisabled()
  expect(within(modal).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  expect(campo).toBeDisabled()
  await act(async () => rechazar({ response: { status: 403, data: { resultado: 'EXPULSADO', mensaje: 'Sin permiso' } } }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin permiso')
  expect(campo).toHaveValue('Uso de celular')
  expect(screen.queryByText('EXPULSADO')).not.toBeInTheDocument()
  vi.mocked(api.post).mockResolvedValueOnce({ data: null })
  fireEvent.click(within(modal).getByRole('button', { name: 'Confirmar expulsión' }))
  expect(await screen.findByRole('status')).toHaveTextContent('sin registro verificable')
  expect(within(modal).getByRole('button', { name: 'Confirmar expulsión' })).toBeDisabled()
  fireEvent.submit(modal.querySelector('form')!)
  expect(api.post).toHaveBeenCalledTimes(2)
  expect(screen.getAllByText('INGRESÓ')).toHaveLength(2)
})
