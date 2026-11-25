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
    expect(asignarPersonal).toHaveBeenCalledWith(7, [30, 31], undefined)
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
    // Solo los disponibles se pueden marcar; los ocupados quedan aparte, con el examen con el que chocan.
    expect(within(opciones).queryByRole('checkbox', { name: /Carla Rojas/ })).not.toBeInTheDocument()
    expect(within(opciones).getByRole('checkbox', { name: /René Paz/ })).toBeEnabled()
    expect(screen.getByText('1 ocupado a esa hora')).toBeInTheDocument()
    expect(screen.getByText(/Carla Rojas · Ocupado 20:00–21:00/)).toBeInTheDocument()
  })

  it('con varias aulas muestra el aula de cada control y avisa del aula sin control (V66)', async () => {
    vi.mocked(personalDelExamen).mockResolvedValue([{ ...carla, idAmbiente: 1, ambiente: '607' }])
    render(<PersonalControlSeccion idExamen={7} puedeAsignar aulas={[{ idAmbiente: 1, nombre: '607' }, { idAmbiente: 2, nombre: '608' }]} />)
    expect(await screen.findByText('Aula 607')).toBeInTheDocument()
    expect(screen.getByText(/El aula 608 no tiene personal de control/)).toBeInTheDocument()

    vi.mocked(asignarPersonal).mockResolvedValue([{ ...carla, idAmbiente: 2, ambiente: '608' }])
    fireEvent.click(screen.getByRole('button', { name: /Cambiar/ }))
    fireEvent.change(await screen.findByRole('combobox', { name: 'Aula de Carla Rojas' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    const asignados = await screen.findByRole('list', { name: 'Personal de control asignado' })
    expect(within(asignados).getByText('Aula 608')).toBeInTheDocument()
    expect(asignarPersonal).toHaveBeenCalledWith(7, [30], { 30: 2 })
  })
})
