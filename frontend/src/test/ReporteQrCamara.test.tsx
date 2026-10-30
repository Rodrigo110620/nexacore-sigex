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
