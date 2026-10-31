import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import ReportarFotoModal from '../components/control/ReportarFotoModal'

vi.mock('../services/fotoRevisionService', async (original) => ({
  ...(await original<typeof import('../services/fotoRevisionService')>()),
  reportarFoto: vi.fn(),
}))

const abrir = (onClose = vi.fn()) => {
  render(<ReportarFotoModal idEstudiante={7} idExamen={3} estudiante="Mateo Choque" codigoSis="202106789" onClose={onClose} onReportada={vi.fn()} />)
  return onClose
}

it('BUG-E01 (2.º test run): el error del Detalle se muestra debajo del campo', () => {
  abrir()
  const detalle = screen.getByLabelText('Detalle (opcional)')
  fireEvent.change(detalle, { target: { value: 'fotos desactualizadassssss' } })
  fireEvent.click(screen.getByRole('button', { name: 'Reportar foto' }))

  const error = screen.getByRole('alert')
  expect(detalle).toHaveAttribute('aria-describedby', 'reportar-foto-detalle-error')
  expect(error).toHaveAttribute('id', 'reportar-foto-detalle-error')
  // Va justo después del contador del campo, antes del aviso informativo.
  expect(detalle.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(error.compareDocumentPosition(screen.getByText(/Se le pedirá al estudiante/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it('BUG-E02 (2.º test run): con datos, la X y Cancelar piden confirmar antes de descartar', () => {
  const onClose = abrir()
  fireEvent.change(screen.getByLabelText('Detalle (opcional)'), { target: { value: 'Foto muy borrosa' } })

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.getByText('¿Descartar los datos?')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
  expect(onClose).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
  expect(onClose).toHaveBeenCalled()
})

it('sin datos ingresados, cerrar no pide confirmación', () => {
  const onClose = abrir()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(onClose).toHaveBeenCalled()
  expect(screen.queryByText('¿Descartar los datos?')).not.toBeInTheDocument()
})
