import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditarEstudianteModal from '../components/estudiantes/EditarEstudianteModal'
import { AuthProvider } from '../context/AuthContext'
import * as servicio from '../services/estudianteService'

vi.mock('../services/estudianteService', async (original) => ({
  ...(await original<typeof import('../services/estudianteService')>()),
  getEstudianteById: vi.fn(),
  getFacultades: vi.fn(),
  getCarreras: vi.fn(),
}))

const montar = (rol: string) => {
  localStorage.setItem('token', 'test')
  localStorage.setItem('roles', JSON.stringify([rol]))
  return render(
    <AuthProvider>
      <MemoryRouter>
        <EditarEstudianteModal open estudianteId={7} onClose={() => undefined} onSaved={() => undefined} />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('foto en Editar estudiante', () => {
  beforeEach(() => {
    vi.mocked(servicio.getEstudianteById).mockResolvedValue({
      id: 7, codigoSis: '202101234', nombre: 'Ana', apellidos: 'Rojas', ci: '7489210', email: '202101234@est.umss.edu',
      carreras: [], condicion: 'REGULAR', estadoMatricula: 'MATRICULADO', fotoUrl: '/estudiantes/7/foto',
    })
    vi.mocked(servicio.getFacultades).mockResolvedValue([])
    vi.mocked(servicio.getCarreras).mockResolvedValue([])
  })

  it('el docente no puede cambiar ni quitar la foto: la reporta desde el control', async () => {
    montar('DOCENTE')
    expect(await screen.findByText(/Solo la administración puede cambiar o quitar la foto/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Seleccionar fotografía del estudiante')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Quitar/ })).not.toBeInTheDocument()
  })

  it('el ADMIN sí puede cambiarla o quitarla', async () => {
    montar('ADMIN')
    expect(await screen.findByLabelText('Seleccionar fotografía del estudiante')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Quitar/ })).toBeInTheDocument()
    expect(screen.queryByText(/Solo la administración puede cambiar/)).not.toBeInTheDocument()
  })
})
