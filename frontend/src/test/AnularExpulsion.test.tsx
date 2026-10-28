import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExpulsionesReporte from '../components/control/ExpulsionesReporte'
import { anularExpulsion, listarExpulsionesExamen, type ExpulsionResponse } from '../services/expulsionService'

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ roles: ['ADMIN'] }) }))
vi.mock('../hooks/useEnVivo', () => ({ default: () => undefined }))
vi.mock('../services/expulsionService', () => ({ listarExpulsionesExamen: vi.fn(), anularExpulsion: vi.fn() }))

const vigente: ExpulsionResponse = {
  idExpulsion: 5, idEstudiante: 10, idExamen: 20, motivo: 'Uso de celular', idResponsable: 7, responsable: 'Ana Rojas',
  fechaHora: '2026-10-28T09:00:00', estudiante: 'Luis Flores', codigoSis: '202104010',
}

describe('anular una expulsión registrada por error', () => {
  beforeEach(() => { vi.mocked(anularExpulsion).mockReset() })

  it('pide un motivo de al menos 10 caracteres, anula y muestra la expulsión como anulada', async () => {
    vi.mocked(listarExpulsionesExamen)
      .mockResolvedValueOnce([vigente])
      .mockResolvedValue([{ ...vigente, anuladaEn: '2026-10-28T09:10:00', anuladaPor: 'Ana Rojas', motivoAnulacion: 'Error del control, era otro estudiante' }])
    vi.mocked(anularExpulsion).mockResolvedValue(vigente)
    render(<ExpulsionesReporte idExamen={20} examen="Física I" controles={[]} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Anular expulsión' }))
    expect(screen.getByText(/No se borra/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Motivo de la anulación'), { target: { value: 'Error' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }))
    expect(screen.getByRole('alert')).toHaveTextContent('al menos 10 caracteres')
    expect(anularExpulsion).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Motivo de la anulación'), { target: { value: 'Error del control, era otro estudiante' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }))
    await waitFor(() => expect(anularExpulsion).toHaveBeenCalledWith(20, 5, 'Error del control, era otro estudiante'))
    expect(await screen.findByText('Anulada · sigue con su examen')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Anular expulsión' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Ver registro de expulsión'))
    expect(screen.getByText('Error del control, era otro estudiante')).toBeVisible()
  })

  it('muestra el mensaje del servidor si no se puede anular', async () => {
    vi.mocked(listarExpulsionesExamen).mockResolvedValue([vigente])
    vi.mocked(anularExpulsion).mockRejectedValue(Object.assign(new Error('409'), {
      isAxiosError: true, response: { data: { mensaje: 'La expulsión ya fue anulada' } },
    }))
    render(<ExpulsionesReporte idExamen={20} controles={[]} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Anular expulsión' }))
    fireEvent.change(screen.getByLabelText('Motivo de la anulación'), { target: { value: 'Error del control, era otro estudiante' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La expulsión ya fue anulada')
  })
})
