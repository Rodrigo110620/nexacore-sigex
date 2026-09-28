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
  idEstudiante: 23,
  nombre: 'María José',
  apellidos: 'González Flores',
  codigoSis: '202104010',
  ci: '7489210',
  carrera: 'Ingeniería de Sistemas',
  fotoUrl: null,
  estado,
})

function renderPage(roles: string[] = ['CONTROL'], ruta = '/dashboard/control/7/identificar') {
  localStorage.setItem('roles', JSON.stringify(roles))
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/dashboard/control/:idExamen/identificar" element={<IdentificacionPage />} />
          <Route path="/dashboard/control-ingresos/:idEstudiante/:idExamen" element={<p>Flujo ACCS-02</p>} />
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
const verificacion = () => screen.getByRole('dialog', { name: 'Verificación de Habilitación' })

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

  it('HABILITADO: Continuar abre la verificación y su Continuar lleva a ACCS-02', async () => {
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage()
    await buscarEstudiante()

    fireEvent.click(continuar())
    fireEvent.click(within(verificacion()).getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Flujo ACCS-02')).toBeInTheDocument()
  })

  it.each([
    ['con motivo', 'Deuda en biblioteca, multa pendiente o documentos incompletos',
      'Motivo: Deuda en biblioteca, multa pendiente o documentos incompletos'],
    ['sin motivo', null, 'Sin motivo registrado'],
  ])('DESHABILITADO %s: la verificación muestra el motivo real, sin Continuar, y CERRAR no navega', async (_caso, motivo, texto) => {
    mockedIdentificar.mockResolvedValue({ ...estudiante('DESHABILITADO'), motivoInhabilitacion: motivo })
    renderPage()
    await buscarEstudiante()

    fireEvent.click(continuar())
    expect(within(verificacion()).getByText('Estudiante No Habilitado')).toBeInTheDocument()
    expect(within(verificacion()).getByText(texto)).toBeInTheDocument()
    expect(within(verificacion()).queryByText(/Error de habilitación académica/)).not.toBeInTheDocument()
    expect(within(verificacion()).queryByRole('button', { name: /Continuar/ })).not.toBeInTheDocument()

    fireEvent.click(within(verificacion()).getByRole('button', { name: 'CERRAR' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Flujo ACCS-02')).not.toBeInTheDocument()
    expect(screen.getByText('María José González Flores')).toBeInTheDocument()
  })

  it('ADMIN sin CONTROL puede identificar pero no continuar a ACCS-02', async () => {
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage(['ADMIN'])
    await buscarEstudiante()

    expect(continuar()).toBeDisabled()
    expect(continuar()).toHaveAttribute('title', 'Se requiere el rol CONTROL para continuar')
  })

  it.each([
    ['ADMIN + CONTROL', ['ADMIN', 'CONTROL']],
    ['DOCENTE + CONTROL', ['DOCENTE', 'CONTROL']],
  ])('%s puede continuar porque contiene CONTROL', async (_nombre, roles) => {
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage(roles)
    await buscarEstudiante()

    expect(continuar()).toBeEnabled()
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

  it('con ?codigo= busca una sola vez por código universitario y deja el valor en el input', async () => {
    mockedIdentificar.mockClear()
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage(['CONTROL'], '/dashboard/control/7/identificar?codigo=202104010')

    await screen.findByText('María José González Flores')
    expect(mockedIdentificar).toHaveBeenCalledTimes(1)
    expect(mockedIdentificar).toHaveBeenCalledWith(7, 'codigo', '202104010')
    expect(screen.getByLabelText('Ingresa el Código Universitario:')).toHaveValue('202104010')
  })
})
