import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PersonalControlSeccion from '../components/examenes/PersonalControlSeccion'
import { asignarPersonal, personalDelExamen, personalDisponibleParaExamen } from '../services/personalControlService'

vi.mock('../services/personalControlService', () => ({ personalDelExamen: vi.fn(), personalDisponibleParaExamen: vi.fn(), asignarPersonal: vi.fn() }))

const carla = { idUsuario: 30, nombre: 'Carla', apellidos: 'Rojas', email: 'carla@umss.edu' }
const rene = { idUsuario: 31, nombre: 'René', apellidos: 'Paz', email: 'rene@umss.edu' }

describe('Personal de control del examen (V53)', () => {
  beforeEach(() => {
    vi.mocked(personalDelExamen).mockReset().mockResolvedValue([carla])
    vi.mocked(personalDisponibleParaExamen).mockReset().mockResolvedValue([{ ...carla, disponible: true }, { ...rene, disponible: true }])
    vi.mocked(asignarPersonal).mockReset()
  })

  it('el docente ve quién controla su examen, sin poder cambiarlo si no gestiona', async () => {
    render(<PersonalControlSeccion idExamen={7} puedeAsignar={false} />)
    const lista = await screen.findByRole('list', { name: 'Personal de control asignado' })
    expect(within(lista).getByText('Carla Rojas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cambiar/ })).not.toBeInTheDocument()
  })

  it('quien gestiona el examen asigna el personal', async () => {
    vi.mocked(asignarPersonal).mockResolvedValue([carla, rene])
    render(<PersonalControlSeccion idExamen={7} puedeAsignar />)
    fireEvent.click(await screen.findByRole('button', { name: /Cambiar/ }))
    const disponibles = await screen.findByRole('list', { name: 'Personal de control disponible' })
    expect(within(disponibles).getByRole('checkbox', { name: /Carla Rojas/ })).toBeChecked()
    fireEvent.click(within(disponibles).getByRole('checkbox', { name: /René Paz/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    const asignados = await screen.findByRole('list', { name: 'Personal de control asignado' })
    expect(within(asignados).getByText('René Paz')).toBeInTheDocument()
    expect(asignarPersonal).toHaveBeenCalledWith(7, [30, 31])
  })

  it('sin personal asignado lo dice', async () => {
    vi.mocked(personalDelExamen).mockResolvedValue([])
    render(<PersonalControlSeccion idExamen={7} puedeAsignar />)
    expect(await screen.findByText(/Sin personal de control asignado/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Asignar/ })).toBeInTheDocument()
  })

  it('deshabilita al personal ocupado en un examen que se cruza y muestra su horario', async () => {
    vi.mocked(personalDelExamen).mockResolvedValue([])
    vi.mocked(personalDisponibleParaExamen).mockResolvedValue([
      { ...carla, disponible: false, conflictoHorario: 'Ocupado 20:00–21:00' },
      { ...rene, disponible: true, conflictoHorario: null },
    ])
    render(<PersonalControlSeccion idExamen={7} puedeAsignar />)
    fireEvent.click(await screen.findByRole('button', { name: /Asignar/ }))
    const opciones = await screen.findByRole('list', { name: 'Personal de control disponible' })
    expect(within(opciones).getByRole('checkbox', { name: /Carla Rojas/ })).toBeDisabled()
    expect(within(opciones).getByText(/Ocupado 20:00–21:00/)).toBeInTheDocument()
    expect(within(opciones).getByRole('checkbox', { name: /René Paz/ })).toBeEnabled()
  })
})
