import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ControlIngresoPage from '../pages/Control/ControlIngresoPage'
import * as service from '../services/controlIngresoService'
import type { ContextoControlIngreso } from '../types/controlIngreso'

vi.mock('../components/layout/PanelLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('../services/controlIngresoService')
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ nombre: 'Carla Control', roles: ['CONTROL'] }) }))

const contextoBase: ContextoControlIngreso = {
  idEstudiante: 10,
  estudiante: 'Laura Paredes',
  codigoSis: '20261234',
  documento: '74839201',
  idExamen: 20,
  asignatura: 'INF-101 - Programación',
  // Examen futuro: con uno ya terminado no se pueden registrar ingresos.
  fecha: '2099-10-15',
  horaInicio: '10:00:00',
  duracionMinutos: 120,
  ambiente: 'Aula 401',
  normasGenerales: ['Presentar CI'],
  normasParticulares: ['Tiempo adicional'],
  habilitado: true,
  motivoInhabilitacion: null,
  ingresoRegistrado: false,
  fechaHoraIngreso: null,
}

function renderPage(contexto: ContextoControlIngreso = contextoBase) {
  vi.mocked(service.obtenerContextoControl).mockResolvedValue(contexto)
  vi.mocked(service.obtenerTiposIncidencia).mockResolvedValue([
    { id: 3, nombre: 'DOCUMENTO_MAL_ESTADO', descripcion: null },
  ])
  return render(
    <MemoryRouter initialEntries={['/control/10/20']}>
      <Routes><Route path="/control/:idEstudiante/:idExamen" element={<ControlIngresoPage />} /><Route path="/dashboard/control/:idExamen/identificar" element={<p>Identificación del examen</p>} /></Routes>
    </MemoryRouter>,
  )
}

let onLine: { mockRestore: () => void } | null = null
const sinConexion = () => {
  const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  onLine = spy
  return spy
}
const errorDeRed = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' })

describe('ControlIngresoPage', () => {
  it('INCI-02 exige motivo y envía el ingreso manual con su justificación', async () => {
    renderPage()
    await screen.findByText('Laura Paredes')
    fireEvent.click(screen.getByLabelText('Identidad biométrica cotejada / Carnet físico verificado'))
    fireEvent.click(screen.getByLabelText('Ingreso manual por excepción'))
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar Ingreso' }))
    expect(service.autorizarIngreso).not.toHaveBeenCalled()
    expect(screen.getByText('La justificación del ingreso manual debe tener entre 10 y 1000 caracteres.')).toBeInTheDocument()
    vi.mocked(service.autorizarIngreso).mockResolvedValue({ autorizado: true, resultado: 'AUTORIZADO', causa: null, fechaHoraIngreso: '2026-10-24T12:00:00', autorizadoPor: 'Carla Control' })
    fireEvent.change(screen.getByLabelText('Justificación del ingreso manual (obligatoria)'), { target: { value: 'Celular apagado, no presenta QR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar Ingreso' }))
    await waitFor(() => expect(service.autorizarIngreso).toHaveBeenCalledWith(expect.objectContaining({ ingresoManual: true, justificacionManual: 'Celular apagado, no presenta QR' })))
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(service.obtenerHistorialControl).mockResolvedValue([])
  })

  afterEach(() => {
    onLine?.mockRestore()
    onLine = null
  })

  it('CA-53/54: la observación tiene de 10 a 100 caracteres y no deja autorizar fuera de ese rango', async () => {
    renderPage()
    await screen.findByText('Laura Paredes')
    const obs = screen.getByPlaceholderText('Estudiante ingresa con credencial oficial en regla')
    fireEvent.click(screen.getByLabelText('Identidad biométrica cotejada / Carnet físico verificado'))

    fireEvent.change(obs, { target: { value: 'Corta' } })
    expect(screen.getByText('La observación debe tener al menos 10 caracteres')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Autorizar Ingreso' })).toBeDisabled()

    expect(obs).toHaveAttribute('maxLength', '100')
    fireEvent.change(obs, { target: { value: 'Presentó su carnet vigente. '.repeat(5) } })
    expect((obs as HTMLTextAreaElement).value).toHaveLength(100)
    expect(screen.getByText('100/100')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Autorizar Ingreso' })).toBeEnabled()
  })

  it('con el examen ya terminado avisa y no deja autorizar ni denegar', async () => {
    renderPage({ ...contextoBase, fecha: '2020-01-10' })

    expect(await screen.findByText(/El examen ya terminó:/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Autorizar Ingreso/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Denegar/ })).toBeDisabled()
  })

  it('CA-68/70: "Ver todo" muestra la observación completa cuando no cabe en el campo', async () => {
    renderPage()
    await screen.findByText('Laura Paredes')
    const obs = screen.getByPlaceholderText('Estudiante ingresa con credencial oficial en regla')
    // jsdom no calcula alturas: el texto "no cabe" si scrollHeight supera a clientHeight.
    Object.defineProperty(obs, 'scrollHeight', { configurable: true, get: () => 120 })
    Object.defineProperty(obs, 'clientHeight', { configurable: true, get: () => 60 })
    const texto = 'El estudiante presentó su carnet y credencial universitaria vigente en la puerta del aula.'
    fireEvent.change(obs, { target: { value: texto } })

    fireEvent.click(screen.getByRole('button', { name: 'Ver todo' }))
    expect(obs).toHaveValue(texto)
    expect(obs).toHaveStyle({ height: '120px' })
    fireEvent.click(screen.getByRole('button', { name: 'Ver menos' }))
    expect(obs).toHaveValue(texto)
  })

  it('CA-88 a 92: sin conexión no autoriza, avisa y conserva lo ingresado', async () => {
    renderPage()
    await screen.findByText('Laura Paredes')
    const obs = screen.getByPlaceholderText('Estudiante ingresa con credencial oficial en regla')
    fireEvent.change(obs, { target: { value: 'Sin novedades en el control' } })
    fireEvent.click(screen.getByLabelText('Identidad biométrica cotejada / Carnet físico verificado'))
    sinConexion()
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar Ingreso' }))

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Sin conexión a Internet')
    expect(screen.getByRole('alertdialog')).toHaveTextContent('No se pudo autorizar ni registrar el ingreso')
    expect(service.autorizarIngreso).not.toHaveBeenCalled()
    expect(screen.queryByText('Ingreso autorizado')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(obs).toHaveValue('Sin novedades en el control')
    expect(screen.getByLabelText('Identidad biométrica cotejada / Carnet físico verificado')).toBeChecked()
  })

  it('CA-93/94: si la conexión se corta durante el envío avisa y permite reintentar', async () => {
    vi.mocked(service.autorizarIngreso)
      .mockRejectedValueOnce(errorDeRed())
      .mockResolvedValueOnce({
        autorizado: true, resultado: 'AUTORIZADO', causa: null,
        fechaHoraIngreso: '2026-09-26T18:00:00Z', autorizadoPor: 'Carla Control',
      })
    renderPage()
    await screen.findByText('Laura Paredes')
    fireEvent.click(screen.getByLabelText('Identidad biométrica cotejada / Carnet físico verificado'))
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar Ingreso' }))

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Sin conexión a Internet')
    expect(screen.queryByText('Ingreso autorizado')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar Ingreso' }))
    expect(await screen.findByText('Ingreso autorizado')).toBeInTheDocument()
    expect(service.autorizarIngreso).toHaveBeenCalledTimes(2)
  })

  it('CA-150 a 153: sin conexión no deniega y mantiene abierto el formulario con sus datos', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Denegar' }))
    fireEvent.change(screen.getByLabelText(/Razón de denegación/), { target: { value: 'Suplantación' } })
    fireEvent.change(screen.getByLabelText(/Detalle adicional/), { target: { value: 'No coincide la foto' } })
    sinConexion()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Denegación' }))

    expect(screen.getByRole('alertdialog')).toHaveTextContent('No se pudo registrar la denegación')
    expect(service.denegarIngreso).not.toHaveBeenCalled()
    expect(screen.queryByText('Ingreso denegado')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(screen.getByRole('dialog', { name: 'Denegar ingreso' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Detalle adicional/)).toHaveValue('No coincide la foto')
  })

  it('sin conexión al cargar avisa y permite reintentar', async () => {
    vi.mocked(service.obtenerTiposIncidencia).mockResolvedValue([])
    vi.mocked(service.obtenerContextoControl)
      .mockRejectedValueOnce(errorDeRed())
      .mockResolvedValueOnce(contextoBase)
    render(
      <MemoryRouter initialEntries={['/control/10/20']}>
        <Routes><Route path="/control/:idEstudiante/:idExamen" element={<ControlIngresoPage />} /></Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión a Internet')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Laura Paredes')).toBeInTheDocument()
  })

  it('HU#4 CA-04 a 06: muestra todas las razones de inhabilitación con "Ver todo"', async () => {
    renderPage({
      ...contextoBase,
      habilitado: false,
      motivoInhabilitacion: 'Deuda en biblioteca\nDocumentos incompletos\nIngreso denegado por CONTROL: Suplantación',
    })
    const razones = await screen.findByRole('list', { name: 'Razones de inhabilitación' })
    expect(within(razones).getAllByRole('listitem')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Ver todo (3)' }))
    expect(within(razones).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '1. Deuda en biblioteca',
      '2. Documentos incompletos',
      '3. Ingreso denegado por CONTROL: Suplantación',
    ])
  })

  it('ACCS HU#01 CA-28/32: muestra la condición del estudiante', async () => {
    renderPage({ ...contextoBase, condicion: 'POSTULANTE' })
    expect(await screen.findByText('Laura Paredes')).toBeInTheDocument()
    expect(screen.getByText('Postulante')).toBeInTheDocument()
    expect(screen.queryByText('Estudiante regular')).not.toBeInTheDocument()
  })

  it('carga el contexto y muestra datos y normas', async () => {
    renderPage()
    expect(await screen.findByText('Laura Paredes')).toBeInTheDocument()
    expect(screen.getByText('INF-101 - Programación')).toBeInTheDocument()
    expect(screen.getByText('Presentar CI')).toBeInTheDocument()
    expect(screen.getByText('Tiempo adicional')).toBeInTheDocument()
  })

  it('renderiza normas generales y particulares como listas separadas', async () => {
    renderPage({ ...contextoBase, normasGenerales: ['No usar celular', 'Mantener silencio'], normasParticulares: ['Calculadora permitida', 'Tiempo adicional'] })
    await screen.findByText('Laura Paredes')
    const listas = screen.getAllByRole('list').filter((list) => list.classList.contains('control-rules-list'))
    expect(listas).toHaveLength(2)
    expect(within(listas[0]).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['No usar celular', 'Mantener silencio'])
    expect(within(listas[1]).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Calculadora permitida', 'Tiempo adicional'])
    expect(screen.queryByText(/No usar celular;/)).not.toBeInTheDocument()
  })

  it('muestra la navegación de Inicio y Control detrás de los modales móviles', async () => {
    renderPage()
    await screen.findByText('Laura Paredes')
    expect(screen.queryByRole('navigation', { name: 'Navegación principal móvil' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Denegar' }))
    expect(screen.getByLabelText(/Detalle adicional/)).toHaveAttribute('maxLength', '500')
    const navigation = screen.getByRole('navigation', { name: 'Navegación principal móvil' })
    expect(within(navigation).getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: 'Control' })).toBeInTheDocument()
    expect(within(navigation).queryByRole('link', { name: 'Ajustes' })).not.toBeInTheDocument()
  })

  it('permite volver a identificar cuando el ingreso ya está registrado', async () => {
    renderPage({ ...contextoBase, ingresoRegistrado: true })
    await screen.findByText('El ingreso ya fue registrado para este examen.')
    fireEvent.click(screen.getByRole('button', { name: 'Volver a identificar estudiante' }))
    expect(await screen.findByText('Identificación del examen')).toBeInTheDocument()
  })

  it('autoriza enviando observaciones, verificaciones e incidencia', async () => {
    vi.mocked(service.autorizarIngreso).mockResolvedValue({
      autorizado: true, resultado: 'AUTORIZADO', causa: null,
      fechaHoraIngreso: '2026-09-26T18:00:00Z', autorizadoPor: 'Carla Control',
    })
    renderPage()
    await screen.findByText('Laura Paredes')
    fireEvent.change(screen.getByPlaceholderText('Estudiante ingresa con credencial oficial en regla'), { target: { value: 'Sin novedades' } })
    expect(screen.getByRole('button', { name: 'Autorizar Ingreso' })).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Identidad biométrica cotejada / Carnet físico verificado'))
    fireEvent.click(screen.getByLabelText('Documento en mal estado'))
    fireEvent.change(screen.getByPlaceholderText('Opcional: describe la incidencia...'), { target: { value: 'Documento deteriorado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar Ingreso' }))

    await waitFor(() => expect(service.autorizarIngreso).toHaveBeenCalledWith({
      idEstudiante: 10,
      idExamen: 20,
      observaciones: 'Sin novedades',
      identidadVerificada: true,
      verificacionesAdicionales: ['Identidad biométrica cotejada / Carnet físico verificado'],
      incidencias: [{ idTipoIncidencia: 3, descripcion: 'Documento deteriorado' }],
      fechaHoraDispositivo: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/),
    }))
    expect(await screen.findByText('Ingreso autorizado')).toBeInTheDocument()
    expect(screen.getByText('Autorizado por')).toBeInTheDocument()
    expect(screen.getByText('Carla Control')).toBeInTheDocument()
    expect(screen.getByText('Fecha y hora oficial')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Registrar siguiente estudiante/ })).toBeInTheDocument()
  })

  it('no registra observaciones con contenido repetitivo reportado por QA', async () => {
    renderPage()
    await screen.findByText('Laura Paredes')
    fireEvent.change(screen.getByPlaceholderText('Estudiante ingresa con credencial oficial en regla'), { target: { value: 'tttttttttttttttttttt' } })
    fireEvent.click(screen.getByLabelText('Identidad biométrica cotejada / Carnet físico verificado'))

    expect(screen.getByText('La observación no puede ser un mismo carácter repetido')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Autorizar Ingreso' })).toBeDisabled()
    expect(service.autorizarIngreso).not.toHaveBeenCalled()
  })

  it.each([
    'Se verificó el documento y el carnet está en buen estado.',
    'El estudiante presentó su CI y credencial oficial.',
  ] as const)('acepta una observación legítima: %s', async (observacion: string) => {
    vi.mocked(service.autorizarIngreso).mockResolvedValue({
      autorizado: true, resultado: 'AUTORIZADO', causa: null,
      fechaHoraIngreso: '2026-09-26T18:00:00Z', autorizadoPor: 'Carla Control',
    })
    renderPage()
    await screen.findByText('Laura Paredes')
    fireEvent.change(screen.getByPlaceholderText('Estudiante ingresa con credencial oficial en regla'), { target: { value: observacion } })
    fireEvent.click(screen.getByLabelText('Identidad biométrica cotejada / Carnet físico verificado'))
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar Ingreso' }))

    await waitFor(() => expect(service.autorizarIngreso).toHaveBeenCalledWith(expect.objectContaining({ observaciones: observacion })))
  })

  it('BUG-D02: el detalle adicional inválido muestra el motivo, no deja confirmar y se corta en 500', async () => {
    renderPage({ ...contextoBase, habilitado: false, motivoInhabilitacion: 'Deuda pendiente' })
    fireEvent.click(await screen.findByRole('button', { name: 'Denegar' }))
    fireEvent.change(screen.getByLabelText(/Razón de denegación/), { target: { value: 'Deuda pendiente' } })
    const detalle = screen.getByLabelText(/Detalle adicional/)

    fireEvent.change(detalle, { target: { value: '???????' } })
    expect(screen.getByText('El detalle adicional debe tener letras o números, no solo signos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar Denegación' })).toBeDisabled()

    fireEvent.change(detalle, { target: { value: 'Sin credencial ’oficial’' } })
    expect(screen.getByText('El detalle adicional tiene caracteres no permitidos: ’')).toBeInTheDocument()

    fireEvent.change(detalle, { target: { value: 'a'.repeat(520) } })
    expect(detalle).toHaveValue('a'.repeat(500))
    expect(screen.getByText('500/500')).toBeInTheDocument()
    expect(service.denegarIngreso).not.toHaveBeenCalled()
  })

  it('BUG-D02: envía el detalle adicional válido por separado', async () => {
    vi.mocked(service.denegarIngreso).mockResolvedValue({
      autorizado: false, resultado: 'DENEGADO_CONTROL', causa: 'Deuda pendiente — Debe 2 libros',
      fechaHoraIngreso: '2026-09-26T18:00:00Z', autorizadoPor: 'Carla Control',
    })
    renderPage({ ...contextoBase, habilitado: false, motivoInhabilitacion: 'Deuda pendiente' })
    fireEvent.click(await screen.findByRole('button', { name: 'Denegar' }))
    fireEvent.change(screen.getByLabelText(/Razón de denegación/), { target: { value: 'Deuda pendiente' } })
    fireEvent.change(screen.getByLabelText(/Detalle adicional/), { target: { value: '  Debe 2 libros\nde la biblioteca  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Denegación' }))

    await waitFor(() => expect(service.denegarIngreso).toHaveBeenCalledWith(expect.objectContaining({
      observaciones: 'Deuda pendiente',
      detalleDenegacion: 'Debe 2 libros\nde la biblioteca',
    })))
  })

  it('BUG-D01: con "Otra razón" y el detalle vacío pide la razón y no deja confirmar', async () => {
    renderPage({ ...contextoBase, habilitado: false, motivoInhabilitacion: 'Deuda pendiente' })
    fireEvent.click(await screen.findByRole('button', { name: 'Denegar' }))
    fireEvent.change(screen.getByLabelText(/Razón de denegación/), { target: { value: 'Otra razón' } })

    expect(screen.getByLabelText('Detalle adicional *')).toHaveAttribute('placeholder', 'Especifique la razón de la denegación...')
    expect(screen.getByText('Especifique la razón de la denegación')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Denegación' }))
    expect(screen.getByRole('button', { name: 'Confirmar Denegación' })).toBeDisabled()
    expect(service.denegarIngreso).not.toHaveBeenCalled()
  })

  it('BUG-D01: con "Otra razón" y un detalle válido envía la denegación', async () => {
    vi.mocked(service.denegarIngreso).mockResolvedValue({
      autorizado: false, resultado: 'DENEGADO_CONTROL', causa: 'Otra razón — Usó el celular en la fila',
      fechaHoraIngreso: '2026-09-26T18:00:00Z', autorizadoPor: 'Carla Control',
    })
    renderPage({ ...contextoBase, habilitado: false, motivoInhabilitacion: 'Deuda pendiente' })
    fireEvent.click(await screen.findByRole('button', { name: 'Denegar' }))
    fireEvent.change(screen.getByLabelText(/Razón de denegación/), { target: { value: 'Otra razón' } })
    fireEvent.change(screen.getByLabelText(/Detalle adicional/), { target: { value: 'Usó el celular en la fila' } })

    expect(screen.queryByText('Especifique la razón de la denegación')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Denegación' }))
    await waitFor(() => expect(service.denegarIngreso).toHaveBeenCalledWith(expect.objectContaining({
      observaciones: 'Otra razón',
      detalleDenegacion: 'Usó el celular en la fila',
    })))
  })

  it('permite registrar una denegación sin mostrar el botón de autorizar', async () => {
    vi.mocked(service.denegarIngreso).mockResolvedValue({
      autorizado: false, resultado: 'DENEGADO_CONTROL', causa: 'Deuda pendiente',
      fechaHoraIngreso: '2026-09-26T18:00:00Z', autorizadoPor: 'Carla Control',
    })
    renderPage({ ...contextoBase, habilitado: false, motivoInhabilitacion: 'Deuda pendiente' })

    expect(await screen.findByText('Deuda pendiente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Autorizar Ingreso' })).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Estudiante ingresa con credencial oficial en regla'), { target: { value: 'Se informó al estudiante' } })
    fireEvent.click(screen.getByRole('button', { name: 'Denegar' }))
    expect(screen.getByRole('button', { name: 'Confirmar Denegación' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Razón de denegación/), { target: { value: 'Deuda pendiente' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Denegación' }))

    await waitFor(() => expect(service.denegarIngreso).toHaveBeenCalledWith(expect.objectContaining({
      idEstudiante: 10,
      idExamen: 20,
      observaciones: 'Deuda pendiente — Se informó al estudiante',
      identidadVerificada: false,
    })))
    expect(await screen.findByText('Ingreso denegado')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar resultado' }))
    expect(screen.getByRole('button', { name: 'Autorizar Ingreso' })).toBeDisabled()
  })

  it('muestra la etiqueta HABILITADO y no duplica el acceso al historial', async () => {
    renderPage()
    expect(await screen.findByText('HABILITADO')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Historial del control/ })).not.toBeInTheDocument()
  })

  it('muestra errores de carga sin presentar datos incompletos', async () => {
    vi.mocked(service.obtenerContextoControl).mockRejectedValue(new Error('fallo'))
    vi.mocked(service.obtenerTiposIncidencia).mockResolvedValue([])
    render(
      <MemoryRouter initialEntries={['/control/10/20']}>
        <Routes><Route path="/control/:idEstudiante/:idExamen" element={<ControlIngresoPage />} /></Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la información')
    expect(screen.queryByText('Laura Paredes')).not.toBeInTheDocument()
  })
})
