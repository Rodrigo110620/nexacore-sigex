import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import IdentificacionPage from '../pages/Control/IdentificacionPage'
import { identificarEstudiante, type EstudianteIdentificado } from '../services/identificacionService'

vi.mock('../services/identificacionService')
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn().mockResolvedValue([]) }))
const mockedIdentificar = vi.mocked(identificarEstudiante)

const estudiante = (estado: EstudianteIdentificado['estado']): EstudianteIdentificado => ({
  nombre: 'María José',
  apellidos: 'González Flores',
  codigoSis: '202104010',
  ci: '7489210',
  carrera: 'Ingeniería de Sistemas',
  fotoUrl: null,
  estado,
})

function renderPage() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard/control/7/identificar']}>
        <Routes>
          <Route path="/dashboard/control/:idExamen/identificar" element={<IdentificacionPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

async function buscarEstudiante() {
  fireEvent.change(screen.getByLabelText('Ingresa el Código Universitario:'), { target: { value: '202104010' } })
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  await screen.findByText('María José González Flores')
}

const continuar = () => screen.getByRole('button', { name: 'Continuar' })

describe('IdentificacionPage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'token-control')
    localStorage.setItem('roles', JSON.stringify(['CONTROL']))
  })

  it.each([
    ['HABILITADO', 'HABILITADO'],
    ['DESHABILITADO', 'NO HABILITADO'],
  ] as const)('%s muestra el badge "%s" y habilita Continuar', async (estado, badge) => {
    mockedIdentificar.mockResolvedValue(estudiante(estado))
    renderPage()
    await buscarEstudiante()

    expect(mockedIdentificar).toHaveBeenLastCalledWith(7, 'codigo', '202104010')
    expect(screen.getByText(badge)).toBeInTheDocument()
    expect(screen.getByText('Ingeniería de Sistemas')).toBeInTheDocument()
    expect(continuar()).toBeEnabled()
  })

  it('Cambiar estudiante limpia la búsqueda sin cambiar el mecanismo y desactiva Continuar', async () => {
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage()
    expect(continuar()).toBeDisabled()
    await buscarEstudiante()

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar estudiante' }))

    expect(screen.queryByText('María José González Flores')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Ingresa el Código Universitario:')).toHaveValue('')
    expect(continuar()).toBeDisabled()
  })
})
