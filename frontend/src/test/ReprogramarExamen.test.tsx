import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReprogramarExamenModal from '../components/examenes/ReprogramarExamenModal'
import HistorialSesiones from '../components/examenes/HistorialSesiones'
import * as service from '../services/examenService'
import type { ExamenDto } from '../services/examenService'

vi.mock('../services/examenService', async (original) => ({
  ...(await original<typeof import('../services/examenService')>()),
  reprogramarExamen: vi.fn(),
  listarSesionesExamen: vi.fn(),
}))

const examen = {
  idExamen: 4, idParalelo: 9, asignatura: 'Física General', fecha: '2026-10-20', horaInicio: '08:00:00',
  duracionMinutos: 90, ambienteNombre: '691A', estado: 'finalizado',
} as unknown as ExamenDto

describe('Reprogramar examen', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('pide el motivo y envía la nueva fecha, hora y duración', async () => {
    vi.mocked(service.reprogramarExamen).mockResolvedValue({ ...examen, fecha: '2099-01-10' } as ExamenDto)
    const onReprogramado = vi.fn()
    render(<ReprogramarExamenModal examen={examen} onClose={vi.fn()} onReprogramado={onReprogramado} />)

    fireEvent.change(screen.getByLabelText('Nueva fecha'), { target: { value: '10012099' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reprogramar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Indica el motivo')
    expect(service.reprogramarExamen).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Se repite por un corte de luz' } })
    // Mismo formato que crear y editar: hora de fin con el selector (inicia en 08:00 + 90 min = 09:30) y la
    // duración se calcula sola.
    expect(screen.getByText('90 minutos')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Hora de fin: hora'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Hora de fin: minutos'), { target: { value: '00' } })
    expect(screen.getByText('120 minutos')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reprogramar' }))

    await vi.waitFor(() => expect(onReprogramado).toHaveBeenCalled())
    expect(service.reprogramarExamen).toHaveBeenCalledWith(4, 9, {
      fecha: '2099-01-10', horaInicio: '08:00', duracionMinutos: 120, motivo: 'Se repite por un corte de luz',
    })
  })

  it('la fecha se escribe y se muestra como dd/mm/aaaa, y no acepta fechas pasadas ni inexistentes', () => {
    render(<ReprogramarExamenModal examen={examen} onClose={vi.fn()} onReprogramado={vi.fn()} />)
    const fecha = screen.getByLabelText('Nueva fecha')
    expect(fecha).toHaveAttribute('placeholder', 'dd/mm/aaaa')
    fireEvent.change(fecha, { target: { value: '31022099' } })
    expect(fecha).toHaveValue('31/02/2099')
    expect(screen.getByText('La fecha no existe.')).toBeInTheDocument()
    fireEvent.change(fecha, { target: { value: '01/01/2020' } })
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Se repite el examen' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reprogramar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('no puede ser anterior a hoy')
    expect(service.reprogramarExamen).not.toHaveBeenCalled()
  })

  it('no deja una hora de fin anterior a la de inicio', () => {
    render(<ReprogramarExamenModal examen={examen} onClose={vi.fn()} onReprogramado={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nueva fecha'), { target: { value: '10012099' } })
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Se repite el examen' } })
    fireEvent.change(screen.getByLabelText('Hora de fin: hora'), { target: { value: '07' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reprogramar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('La hora de fin debe ser posterior a la hora de inicio')
    expect(service.reprogramarExamen).not.toHaveBeenCalled()
  })

  it('muestra el mensaje del servidor si no se puede reprogramar', async () => {
    vi.mocked(service.reprogramarExamen).mockRejectedValue(Object.assign(new Error('409'), {
      isAxiosError: true, response: { data: { mensaje: 'El aula ya está ocupada en ese horario' } },
    }))
    render(<ReprogramarExamenModal examen={examen} onClose={vi.fn()} onReprogramado={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nueva fecha'), { target: { value: '10012099' } })
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Se repite el examen' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reprogramar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El aula ya está ocupada en ese horario')
  })

  it('el historial muestra cada sesión anterior con quién ingresó y quién no', async () => {
    vi.mocked(service.listarSesionesExamen).mockResolvedValue([{
      numero: 1, fecha: '2026-10-20', horaInicio: '08:00:00', duracionMinutos: 90, ambiente: '691A',
      asociados: 2, ingresaron: 1, motivoReprogramacion: 'Corte de luz', reprogramadoPor: 'Luis Paz',
      cerradaEn: '2026-10-21T09:00:00',
      estudiantes: [
        { idEstudiante: 1, codigoSis: '202000041', nombre: 'Ana Prueba', habilitado: true, motivoInhabilitacion: null, fechaHoraIngreso: '2026-10-20T07:55:00', aulaIngreso: '691A' },
        { idEstudiante: 2, codigoSis: '202000042', nombre: 'Beto Prueba', habilitado: true, motivoInhabilitacion: null, fechaHoraIngreso: null, aulaIngreso: null },
      ],
    }])
    render(<HistorialSesiones idExamen={4} idParalelo={9} />)

    const sesion = await screen.findByRole('button', { name: /Sesión 1/ })
    expect(sesion).toHaveTextContent('Ingresaron 1 de 2')
    expect(sesion).toHaveTextContent('por Luis Paz')
    expect(sesion).toHaveTextContent('Motivo: Corte de luz')
    fireEvent.click(sesion)
    expect(screen.getByText(/Ingresó .* · 691A/)).toBeInTheDocument()
    expect(screen.getByText('No se presentó')).toBeInTheDocument()
  })
})
