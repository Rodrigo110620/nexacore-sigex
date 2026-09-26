import { fireEvent, render, screen, within } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
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

function buscar() {
  fireEvent.change(screen.getByLabelText('Ingresa el Código Universitario:'), { target: { value: '202104010' } })
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
}

async function buscarEstudiante() {
  buscar()
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

  it('no_vinculado abre el modal con el estudiante, el foco en Cerrar y Continuar deshabilitado', async () => {
    mockedIdentificar.mockResolvedValue(estudiante('NO_VINCULADO'))
    renderPage()
    await buscarEstudiante()

    const modal = screen.getByRole('dialog', { name: 'Estudiante no vinculado' })
    expect(within(modal).getByText('María José González Flores')).toBeInTheDocument()
    expect(within(modal).getByText('202104010')).toBeInTheDocument()
    expect(within(modal).getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    expect(continuar()).toBeDisabled()
  })

  it.each([
    ['Cerrar', () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))],
    ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
  ])('%s cierra el modal y deja el input vacío', async (_accion, cerrar) => {
    mockedIdentificar.mockResolvedValue(estudiante('NO_VINCULADO'))
    renderPage()
    await buscarEstudiante()

    cerrar()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Ingresa el Código Universitario:')).toHaveValue('')
  })

  it('no_encontrado (404) muestra el mensaje, no abre el modal y Continuar sigue deshabilitado', async () => {
    const mensaje = 'No se encontró ningún estudiante con código universitario 202104010'
    const respuesta404 = { status: 404, data: { mensaje } } as AxiosResponse
    mockedIdentificar.mockRejectedValue(new AxiosError('Not Found', 'ERR_BAD_REQUEST', undefined, undefined, respuesta404))
    renderPage()
    buscar()

    expect(await screen.findByText(mensaje)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(continuar()).toBeDisabled()
  })
})
