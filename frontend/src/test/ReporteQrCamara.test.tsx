import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ReporteQrDuplicadoModal from '../components/control/ReporteQrDuplicadoModal'
const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
afterEach(() => {
  if (original) Object.defineProperty(navigator, 'mediaDevices', original)
  else Reflect.deleteProperty(navigator, 'mediaDevices')
})
it('detiene la cámara si la solicitud termina después de cerrar el formulario', async () => {
  let resolver!: (stream: MediaStream) => void
  const stop = vi.fn()
  const getUserMedia = vi.fn(() => new Promise<MediaStream>(r => { resolver = r }))
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  const vista = render(<ReporteQrDuplicadoModal idExamen={7} idEstudianteQr={10} onClose={vi.fn()} />)
  const boton = screen.getByRole('button', { name: /Tomar fotografía/ })
  fireEvent.click(boton)
  expect(boton).toBeDisabled()
  fireEvent.click(boton)
  expect(getUserMedia).toHaveBeenCalledTimes(1)
  vista.unmount()
  await act(async () => { resolver({ getTracks: () => [{ stop }] } as unknown as MediaStream); await Promise.resolve() })
  expect(stop).toHaveBeenCalledTimes(1)
})

it('BUG 10: limita nombres y muestra los errores junto a sus campos', () => {
  render(<ReporteQrDuplicadoModal idExamen={7} idEstudianteQr={10} onClose={vi.fn()} />)
  const campo = screen.getByLabelText('Nombres y apellidos')
  fireEvent.change(campo, { target: { value: 'Ana '.repeat(30) } })
  expect((campo as HTMLInputElement).value.length).toBe(75)
  expect(campo).toHaveAttribute('maxLength', '75')
  fireEvent.change(campo, { target: { value: 'A' } })
  fireEvent.click(screen.getByRole('button', { name: 'Registrar incidencia' }))
  expect(campo.nextElementSibling).toHaveTextContent('entre 3 y 75')
  expect(screen.getByLabelText('CI / N.º de carnet').nextElementSibling).toHaveAttribute('role', 'alert')
})
it.each(['Cerrar formulario', 'Cancelar'])('BUG 10: %s advierte antes de descartar', boton => {
  const cerrar = vi.fn()
  render(<ReporteQrDuplicadoModal idExamen={7} idEstudianteQr={10} onClose={cerrar} />)
  fireEvent.change(screen.getByLabelText('Nombres y apellidos'), { target: { value: 'Ana Pérez' } })
  fireEvent.click(screen.getByRole('button', { name: boton }))
  expect(cerrar).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
  expect(cerrar).toHaveBeenCalledOnce()
})
it('BUG 10: solo el botón revisado recibe el estilo verde', () => {
  render(<ReporteQrDuplicadoModal idExamen={7} idEstudianteQr={10} onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Marcar como revisado' }))
  const boton = screen.getByRole('button', { name: 'Carnet revisado ✓' })
  expect(boton).toHaveClass('reviewed-active')
  expect(boton.closest('section')).not.toHaveClass('done')
  expect(screen.getByRole('button', { name: 'No presentó carnet' })).not.toHaveClass('reviewed-active')
})

it('limpia el error de carnet al revisarlo y los errores de campos al corregirlos', () => {
  render(<ReporteQrDuplicadoModal idExamen={7} idEstudianteQr={10} onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Registrar incidencia' }))
  expect(screen.getByText('Indica si revisaste el carnet o no fue presentado.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Marcar como revisado' }))
  expect(screen.queryByText('Indica si revisaste el carnet o no fue presentado.')).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Nombres y apellidos'), { target: { value: 'Ana Pérez' } })
  expect(screen.queryByText('Los nombres y apellidos deben tener entre 3 y 75 caracteres.')).not.toBeInTheDocument()
})
