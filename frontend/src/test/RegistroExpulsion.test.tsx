import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import RegistroExpulsion from '../components/control/RegistroExpulsion'
import type { ExpulsionResponse } from '../services/expulsionService'

it('presenta la auditoría y anulación sin segundos ni cambios en el registro original', () => {
  const registro: ExpulsionResponse = Object.freeze({
    idExpulsion: 1, idEstudiante: 2, idExamen: 3, idResponsable: 4,
    motivo: 'MOTIVO HISTÓRICO', responsable: 'Ana Rojas', fechaHora: '2026-10-29T09:05:53.123456',
    anuladaEn: '2026-10-29T09:07:59.987654', anuladaPor: 'Luis Paz', motivoAnulacion: 'Error de identificación',
  })
  const { container } = render(<RegistroExpulsion registro={registro} />)
  fireEvent.click(screen.getByText('Ver registro de expulsión'))
  expect(screen.getByText('29/10/2026 09:05')).toBeVisible()
  expect(screen.getByText('29/10/2026 09:07 · Luis Paz')).toBeVisible()
  expect(screen.getByText('MOTIVO HISTÓRICO')).toBeVisible()
  expect(screen.getByText('Error de identificación')).toBeVisible()
  for (const etiqueta of container.querySelectorAll('dt')) expect(etiqueta).toHaveClass('font-semibold')
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(registro.fechaHora).toBe('2026-10-29T09:05:53.123456')
  expect(registro.anuladaEn).toBe('2026-10-29T09:07:59.987654')
})
