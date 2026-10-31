import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterUserModal from '../components/admin/RegisterUserModal'
import EditUserModal from '../components/users/EditUserModal'
import RegistrarEstudianteModal from '../components/estudiantes/RegistrarEstudianteModal'
import EditarEstudianteModal from '../components/estudiantes/EditarEstudianteModal'
import { AuthProvider } from '../context/AuthContext'
import * as estudiantes from '../services/estudianteService'

vi.mock('../services/estudianteService', async (original) => ({
  ...(await original<typeof import('../services/estudianteService')>()),
  getEstudianteById: vi.fn(),
  getFacultades: vi.fn(),
  getCarreras: vi.fn(),
}))

/** Con datos: la acción de cerrar pide confirmar; "Seguir editando" no cierra y "Descartar" sí. */
function confirmaAntesDeCerrar(cerrar: () => void, onClose: () => void) {
  cerrar()
  expect(screen.getByText('¿Descartar los datos?')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
  expect(screen.queryByText('¿Descartar los datos?')).not.toBeInTheDocument()
  expect(onClose).not.toHaveBeenCalled()
  cerrar()
  fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
  expect(onClose).toHaveBeenCalled()
}

describe('BUG 11 (2.º test run): la X y Cancelar piden confirmar antes de descartar', () => {
  beforeEach(() => {
    vi.mocked(estudiantes.getFacultades).mockResolvedValue([])
    vi.mocked(estudiantes.getCarreras).mockResolvedValue([])
    vi.mocked(estudiantes.getEstudianteById).mockResolvedValue({
      id: 7, codigoSis: '202101234', nombre: 'Ana', apellidos: 'Rojas', ci: '7489210', email: '202101234@est.umss.edu',
      carreras: [], condicion: 'REGULAR', estadoMatricula: 'MATRICULADO', fotoUrl: null,
    } as never)
  })

  it('registrar usuario: con datos pide confirmar; vacío cierra directo', () => {
    const vacio = vi.fn()
    const { unmount } = render(<RegisterUserModal isOpen onClose={vacio} onSuccess={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(vacio).toHaveBeenCalled()
    unmount()

    const onClose = vi.fn()
    render(<RegisterUserModal isOpen onClose={onClose} onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Ej. Roberto Carlos'), { target: { value: 'Juan Manuel' } })
    confirmaAntesDeCerrar(() => fireEvent.click(screen.getByRole('button', { name: 'Cerrar' })), onClose)
  })

  it('editar usuario: solo pide confirmar si cambió algo', () => {
    const usuario = { id: 3, nombre: 'Carla', apellidos: 'Méndez', ci: '7489210', email: 'carla@umss.edu', rol: 'DOCENTE', estado: 'activo' }
    const sinCambios = vi.fn()
    const { unmount } = render(<EditUserModal isOpen onClose={sinCambios} user={usuario} onSaveSuccess={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(sinCambios).toHaveBeenCalled()
    unmount()

    const onClose = vi.fn()
    render(<EditUserModal isOpen onClose={onClose} user={usuario} onSaveSuccess={vi.fn()} />)
    fireEvent.change(screen.getByDisplayValue('Carla'), { target: { value: 'Carla María' } })
    confirmaAntesDeCerrar(() => fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })), onClose)
  })

  it('registrar estudiante: con datos pide confirmar', () => {
    const onClose = vi.fn()
    render(<RegistrarEstudianteModal open onClose={onClose} onRegistered={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('Ej: María José'), { target: { value: 'Juan Manuel' } })
    confirmaAntesDeCerrar(() => fireEvent.click(screen.getByRole('button', { name: 'Cerrar' })), onClose)
  })

  it('editar estudiante: solo pide confirmar si cambió algo', async () => {
    localStorage.setItem('token', 'test')
    localStorage.setItem('roles', JSON.stringify(['ADMIN']))
    const onClose = vi.fn()
    render(<AuthProvider><MemoryRouter><EditarEstudianteModal open estudianteId={7} onClose={onClose} onSaved={vi.fn()} /></MemoryRouter></AuthProvider>)
    const nombre = await screen.findByDisplayValue('Ana')
    fireEvent.change(nombre, { target: { value: 'Ana María' } })
    confirmaAntesDeCerrar(() => fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })), onClose)
  })
})
