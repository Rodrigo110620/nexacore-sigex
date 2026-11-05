import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterUserModal from '../components/admin/RegisterUserModal'
import api from '../services/api'
import { buscarMaterias } from '../services/materiaService'
import { ROLES_OPTIONS } from '../types/usuario.types'

vi.mock('../services/api', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
vi.mock('../services/materiaService', async (original) => ({
  ...(await original<typeof import('../services/materiaService')>()),
  buscarMaterias: vi.fn(),
}))
vi.mock('../hooks/useRoles', () => ({ useRoles: () => ({ roles: ROLES_OPTIONS, cargando: false }) }))

const montar = (onSuccess = vi.fn()) => render(<MemoryRouter><RegisterUserModal isOpen onClose={vi.fn()} onSuccess={onSuccess} /></MemoryRouter>)
const siguiente = () => fireEvent.click(screen.getByRole('button', { name: /Siguiente paso/ }))
const escribir = (placeholder: string, valor: string) => fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: valor } })

function llenarDatos() {
  escribir('Ej. Roberto Carlos', 'Juan')
  escribir('Ej. Méndez Quispe', 'Pérez Quispe')
  escribir('8 dígitos', '5544332')
  escribir('usuario@est.umss.edu', 'juan.perez@umss.edu')
}

describe('Registrar usuario en 4 pasos (IMP-12)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} })
    vi.mocked(buscarMaterias).mockReset().mockResolvedValue([
      { id: 11, sigla: 'SIS-301', nombre: 'Programación Web' },
      { id: 12, sigla: 'SIS-205', nombre: 'Taller de Programación' },
    ])
  })

  it('el DOCENTE no avanza sin materias y se registra con las que eligió', async () => {
    const onSuccess = vi.fn()
    montar(onSuccess)
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Docente/i }))
    siguiente()

    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument()
    llenarDatos()
    siguiente()

    expect(screen.getByText('Paso 3 de 4')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Materias del docente' })).toBeInTheDocument()
    siguiente()
    expect(screen.getAllByText('Elige al menos una materia para el docente.').length).toBeGreaterThan(0)
    expect(screen.getByText('Paso 3 de 4')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/Busca por nombre o sigla/), { target: { value: 'prog' } })
    await act(() => vi.advanceTimersByTimeAsync(300))
    const encontradas = await screen.findByRole('list', { name: 'Materias encontradas' })
    fireEvent.click(within(encontradas).getByRole('button', { name: /Programación Web/ }))
    expect(within(screen.getByRole('list', { name: 'Materias elegidas' })).getByText('Programación Web')).toBeInTheDocument()
    siguiente()

    expect(screen.getByText('Paso 4 de 4')).toBeInTheDocument()
    expect(screen.getByText('Programación Web (SIS-301)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Registrar docente/ }))

    await waitFor(() => expect(api.post).toHaveBeenCalled())
    const [ruta, cuerpo] = vi.mocked(api.post).mock.calls[0]
    expect(ruta).toBe('/usuarios')
    expect(cuerpo).toMatchObject({ nombre: 'Juan', apellidos: 'Pérez Quispe', ci: '5544332', email: 'juan.perez@umss.edu', rol: 'DOCENTE', idMaterias: [11] })
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('el ADMIN confirma el acceso total y no se envían materias', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /Administrador/i }))
    siguiente()
    llenarDatos()
    siguiente()

    expect(screen.getByRole('heading', { name: 'Acceso de administrador' })).toBeInTheDocument()
    siguiente()
    expect(screen.getAllByText('Confirma que esta persona debe tener acceso total al sistema.').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo que esta persona/ }))
    siguiente()

    // Desde el resumen se puede volver a corregir un dato.
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar correo' }))
    expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument()
    siguiente()
    siguiente()
    fireEvent.click(screen.getByRole('button', { name: /Registrar administrador/ }))
    await waitFor(() => expect(api.post).toHaveBeenCalled())
    expect(vi.mocked(api.post).mock.calls[0][1]).not.toHaveProperty('idMaterias')
  })

  it('un correo repetido que avisa el servidor vuelve al paso de los datos', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({ response: { status: 400, data: { campos: { email: 'Ya existe un usuario con este correo.' } } } })
    montar()
    fireEvent.click(screen.getByRole('button', { name: /Control/i }))
    siguiente()
    llenarDatos()
    siguiente()
    expect(screen.getByRole('heading', { name: 'Control de ingreso' })).toBeInTheDocument()
    siguiente()
    fireEvent.click(screen.getByRole('button', { name: /Registrar control/ }))
    await waitFor(() => expect(screen.getByText('Paso 2 de 4')).toBeInTheDocument())
  })
})
