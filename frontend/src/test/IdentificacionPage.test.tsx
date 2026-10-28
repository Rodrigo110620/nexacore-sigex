import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
          <Route path="/dashboard/control/:idExamen" element={<p>Detalle del examen</p>} />
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
const abrirVerificacion = async () => {
  fireEvent.click(continuar())
  return screen.findByRole('dialog', { name: 'Verificación de Habilitación' })
}
let onLine: { mockRestore: () => void } | null = null
const sinConexion = () => {
  const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  onLine = spy
  return spy
}

describe('IdentificacionPage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'token-control')
    localStorage.setItem('roles', JSON.stringify(['CONTROL']))
  })

  afterEach(() => {
    onLine?.mockRestore()
    onLine = null
  })

  it('permite volver al detalle del examen sin alterar la identificación', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Regresar' }))
    expect(screen.getByText('Detalle del examen')).toBeInTheDocument()
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

  it('CA-28: el resultado y la verificación muestran la condición del estudiante', async () => {
    mockedIdentificar.mockResolvedValue({ ...estudiante('HABILITADO'), condicion: 'POSTULANTE' })
    renderPage()
    await buscarEstudiante()
    expect(screen.getByText('Postulante')).toBeInTheDocument()

    const modal = await abrirVerificacion()
    expect(within(modal).getByText('Postulante')).toBeInTheDocument()
  })

  it('Regresar vuelve al detalle del examen después de una identificación', async () => {
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage()
    await buscarEstudiante()

    fireEvent.click(screen.getByRole('button', { name: 'Regresar' }))

    expect(screen.getByText('Detalle del examen')).toBeInTheDocument()
  })

  it('HABILITADO: Continuar abre la verificación y su Continuar lleva a ACCS-02', async () => {
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage()
    await buscarEstudiante()

    fireEvent.click(within(await abrirVerificacion()).getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Flujo ACCS-02')).toBeInTheDocument()
  })

  it.each([
    ['con motivo', 'Deuda en biblioteca, multa pendiente o documentos incompletos',
      'Deuda en biblioteca, multa pendiente o documentos incompletos'],
    ['sin motivo', null, 'Sin motivo registrado'],
  ])('DESHABILITADO %s: la verificación muestra el motivo real, sin Continuar, y CERRAR no navega', async (_caso, motivo, texto) => {
    mockedIdentificar.mockResolvedValue({ ...estudiante('DESHABILITADO'), motivoInhabilitacion: motivo })
    renderPage()
    await buscarEstudiante()

    await abrirVerificacion()
    expect(within(verificacion()).getByText('Estudiante No Habilitado')).toBeInTheDocument()
    expect(within(verificacion()).getByText(texto)).toBeInTheDocument()
    expect(within(verificacion()).queryByText(/Error de habilitación académica/)).not.toBeInTheDocument()
    expect(within(verificacion()).queryByRole('button', { name: /Continuar/ })).not.toBeInTheDocument()

    fireEvent.click(within(verificacion()).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Flujo ACCS-02')).not.toBeInTheDocument()
    expect(screen.getByText('María José González Flores')).toBeInTheDocument()
  })

  it('DOCENTE sin rol CONTROL identifica y continúa hasta el registro de ingreso', async () => {
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage(['DOCENTE'])
    await buscarEstudiante()
    expect(continuar()).toBeEnabled()
    fireEvent.click(within(await abrirVerificacion()).getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('Flujo ACCS-02')).toBeInTheDocument()
  })

  it('ESTUDIANTE no puede continuar al control de ingreso', async () => {
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage(['ESTUDIANTE'])
    await buscarEstudiante()
    expect(continuar()).toBeDisabled()
  })

  it('ADMIN puede identificar y continuar a ACCS-02', async () => {
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage(['ADMIN'])
    await buscarEstudiante()

    expect(continuar()).toBeEnabled()
  })

  it.each([
    ['ADMIN + CONTROL', ['ADMIN', 'CONTROL']],
    ['DOCENTE + CONTROL', ['DOCENTE', 'CONTROL']],
  ])('%s puede continuar por su acceso operativo', async (_nombre, roles) => {
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

  it('BUG-A01: con un valor inválido (escrito o pegado) muestra el motivo y no busca', () => {
    mockedIdentificar.mockClear()
    renderPage()
    const input = screen.getByLabelText('Ingresa el Código Universitario:')

    fireEvent.change(input, { target: { value: '20190A' } })
    expect(screen.getByText('El código universitario no puede contener letras')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeDisabled()

    fireEvent.change(input, { target: { value: '2019047' } })
    fireEvent.submit(input.closest('form')!)
    expect(screen.getByText('El código universitario debe tener exactamente 9 dígitos')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '121212121' } })
    expect(screen.getByText('El código universitario no puede ser un patrón repetido')).toBeInTheDocument()
    expect(mockedIdentificar).not.toHaveBeenCalled()
  })

  it('BUG-A01: al cambiar a C.I. limpia el campo y aplica la regla de 8 dígitos', async () => {
    mockedIdentificar.mockClear()
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage()
    fireEvent.change(screen.getByLabelText('Ingresa el Código Universitario:'), { target: { value: '2019A' } })

    fireEvent.click(screen.getByRole('button', { name: /Carnet \/ CI/ }))
    const ci = screen.getByLabelText('Ingresa el Carnet / CI:')
    expect(ci).toHaveValue('')
    expect(screen.queryByText(/no puede contener letras/)).not.toBeInTheDocument()

    fireEvent.change(ci, { target: { value: '7845123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByText('El C.I. debe tener exactamente 8 dígitos')).toBeInTheDocument()
    expect(mockedIdentificar).not.toHaveBeenCalled()

    fireEvent.change(ci, { target: { value: '78451236' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await screen.findByText('María José González Flores')
    expect(mockedIdentificar).toHaveBeenCalledWith(7, 'ci', '78451236')
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

  it('ACCS HU#01 CA-51 a 53: sin conexión no busca, avisa y conserva el dato para reintentar', async () => {
    mockedIdentificar.mockClear()
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage()
    const offline = sinConexion()
    buscar()

    expect(screen.getByText(/Sin conexión a Internet: no es posible identificar al estudiante/)).toBeInTheDocument()
    expect(mockedIdentificar).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Ingresa el Código Universitario:')).toHaveValue('202104010')

    offline.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByText('María José González Flores')).toBeInTheDocument()
    expect(mockedIdentificar).toHaveBeenCalledWith(7, 'codigo', '202104010')
  })

  it('CA-59/60: Continuar consulta de nuevo la habilitación y sin conexión no la da por confirmada', async () => {
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage()
    await buscarEstudiante()
    sinConexion()

    fireEvent.click(continuar())

    expect(screen.getByRole('alert')).toHaveTextContent('no se pudo verificar la habilitación')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('CA-49: la verificación muestra el estado actual del servidor, no el de la búsqueda', async () => {
    mockedIdentificar
      .mockResolvedValueOnce(estudiante('HABILITADO'))
      .mockResolvedValueOnce({ ...estudiante('DESHABILITADO'), motivoInhabilitacion: 'Deuda en biblioteca' })
    renderPage()
    await buscarEstudiante()

    const modal = await abrirVerificacion()
    expect(within(modal).getByText('Estudiante No Habilitado')).toBeInTheDocument()
    expect(within(modal).getByText('Deuda en biblioteca')).toBeInTheDocument()
  })

  it('CA-54 a 57: sin conexión el Continuar de la verificación no navega y conserva los datos', async () => {
    mockedIdentificar.mockResolvedValue(estudiante('HABILITADO'))
    renderPage()
    await buscarEstudiante()
    const modal = await abrirVerificacion()
    const offline = sinConexion()

    fireEvent.click(within(modal).getByRole('button', { name: 'Continuar' }))

    expect(within(modal).getByRole('alert')).toHaveTextContent('no es posible continuar con el control de ingreso')
    expect(screen.queryByText('Flujo ACCS-02')).not.toBeInTheDocument()
    expect(within(modal).getByText('202104010')).toBeInTheDocument()

    offline.mockReturnValue(true)
    fireEvent.click(within(modal).getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('Flujo ACCS-02')).toBeInTheDocument()
  })

  it('CA-42 a 45: con varias razones de inhabilitación las lista y ofrece "Ver todo"', async () => {
    mockedIdentificar.mockResolvedValue({
      ...estudiante('DESHABILITADO'),
      motivoInhabilitacion: 'Deuda en biblioteca\nDocumentos incompletos\nIngreso denegado por CONTROL: Suplantación',
    })
    renderPage()
    await buscarEstudiante()
    const modal = await abrirVerificacion()

    const lista = within(modal).getByRole('list', { name: 'Razones de inhabilitación' })
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2)
    fireEvent.click(within(modal).getByRole('button', { name: 'Ver todo (3)' }))
    await waitFor(() => expect(within(lista).getAllByRole('listitem')).toHaveLength(3))
    expect(within(lista).getByText('3. Ingreso denegado por CONTROL: Suplantación')).toBeInTheDocument()
  })
})
