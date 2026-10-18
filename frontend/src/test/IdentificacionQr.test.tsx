import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import IdentificacionPage from '../pages/Control/IdentificacionPage'
import { identificarEstudiante, identificarQr } from '../services/identificacionService'
import { MENSAJE_SIN_CAMARA, MENSAJE_SIN_HTTPS, MENSAJE_SIN_PERMISO } from '../hooks/useEscanerQr'
import { extraerCodigoSis } from '../utils/extraerCodigoSis'
import { SIN_CONEXION_IDENTIFICAR } from '../hooks/useIdentificacion'

const qr = vi.hoisted(() => ({
  hasCamera: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  destroy: vi.fn(),
  leer: (_resultado: { data: string }) => {},
}))

vi.mock('qr-scanner', () => ({
  default: class {
    static hasCamera = qr.hasCamera
    start = qr.start
    stop = qr.stop
    destroy = qr.destroy
    constructor(_video: HTMLVideoElement, leer: (resultado: { data: string }) => void) {
      qr.leer = leer
    }
  },
}))
vi.mock('../services/identificacionService')
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn().mockResolvedValue([]) }))

function renderPage() {
  const view = render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard/control/7/identificar']}>
        <Routes>
          <Route path="/dashboard/control/:idExamen/identificar" element={<IdentificacionPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'QR' }))
  return view
}

const permitirCamara = (seguro: boolean) => {
  Object.defineProperty(window, 'isSecureContext', { value: seguro, configurable: true })
  Object.defineProperty(navigator, 'mediaDevices', { value: seguro ? {} : undefined, configurable: true })
}

describe('Identificación por QR', () => {
  let conexion: { mockRestore: () => void } | undefined
  afterEach(() => { conexion?.mockRestore(); conexion = undefined })
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'token-control')
    localStorage.setItem('roles', JSON.stringify(['CONTROL']))
    permitirCamara(true)
    qr.hasCamera.mockResolvedValue(true)
    qr.start.mockResolvedValue(undefined)
    vi.mocked(identificarEstudiante).mockResolvedValue({
      idEstudiante: 23,
      nombre: 'María José',
      apellidos: 'González Flores',
      codigoSis: '202104010',
      ci: '7489210',
      carrera: null,
      fotoUrl: null,
      estado: 'HABILITADO',
    })
    vi.mocked(identificarQr).mockResolvedValue({
      idEstudiante: 23, nombre: 'María José', apellidos: 'González Flores', codigoSis: '202104010',
      ci: '7489210', carrera: null, fotoUrl: null, estado: 'HABILITADO',
    })
  })

  it('con el QR habilitado, muestra el marco de lectura y al leerlo detiene la cámara', async () => {
    renderPage()
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')
    expect(document.querySelector('.qr-scan-beam')).toBeInTheDocument()
    expect(screen.getByText('Cámara activa')).toBeInTheDocument()

    act(() => qr.leer({ data: 'SIGEX1.202104010.credencialSeguraDeEjemplo_12345678901234567890' }))

    expect(qr.stop).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Verificando identidad y autorización…')
    expect(await screen.findByText('María José González Flores')).toBeInTheDocument()
    expect(identificarQr).toHaveBeenCalledWith(7, 'SIGEX1.202104010.credencialSeguraDeEjemplo_12345678901234567890')
  })

  it('apaga la cámara al cambiar de mecanismo', async () => {
    renderPage()
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')

    fireEvent.click(screen.getByRole('button', { name: 'Cód. Univ' }))

    expect(qr.destroy).toHaveBeenCalled()
    expect(screen.getByLabelText('Ingresa el Código Universitario:')).toBeInTheDocument()
  })

  it('permite volver a escanear un segundo QR válido tras verificar el primero', async () => {
    renderPage()
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')

    act(() => qr.leer({ data: 'SIGEX1.202104010.credencialSeguraDeEjemplo_12345678901234567890' }))
    await screen.findByRole('button', { name: 'Volver a escanear' }, { timeout: 2000 })
    fireEvent.click(screen.getByRole('button', { name: 'Volver a escanear' }))
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')

    act(() => qr.leer({ data: 'SIGEX1.202104010.credencialSeguraDeEjemplo_98765432109876543210' }))

    expect(await screen.findByText('María José González Flores')).toBeInTheDocument()
    expect(identificarQr).toHaveBeenLastCalledWith(7, 'SIGEX1.202104010.credencialSeguraDeEjemplo_98765432109876543210')
    expect(identificarQr).toHaveBeenCalledTimes(2)
  })

  it('oculta la credencial y muestra un modal al escanear un QR inválido', async () => {
    vi.mocked(identificarQr).mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { mensaje: 'El código QR es inválido o fue alterado' } } })
    renderPage()
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')

    act(() => qr.leer({ data: 'SIGEX1.202104010.credencial-alterada' }))

    expect(screen.getByRole('status')).toHaveTextContent('Verificando identidad y autorización…')
    expect(screen.queryByRole('dialog', { name: 'Código QR no válido' })).not.toBeInTheDocument()
    expect(await screen.findByRole('dialog', { name: 'Código QR no válido' }, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('Resultado')).not.toBeInTheDocument()
    expect(screen.queryByText(/credencial-alterada/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Escanear otro código' }))
    expect(screen.queryByRole('dialog', { name: 'Código QR no válido' })).not.toBeInTheDocument()
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')
    expect(qr.start).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['red', { isAxiosError: true, code: 'ERR_NETWORK' }, SIN_CONEXION_IDENTIFICAR],
    ['HTTP 500', { isAxiosError: true, response: { status: 500, data: { mensaje: 'SIGEX2.credencial-privada-de-prueba' } } }, 'No se pudo consultar al estudiante. Intenta de nuevo.'],
  ])('muestra el error de %s y permite reescanear sin revelar credenciales', async (_caso, error, mensaje) => {
    vi.mocked(identificarQr).mockRejectedValueOnce(error)
    renderPage()
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')
    act(() => qr.leer({ data: 'SIGEX2.credencial-privada-de-prueba' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/credencial-privada-de-prueba/)).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Volver a escanear' }, { timeout: 2000 }))
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    act(() => qr.leer({ data: 'SIGEX2.otro-qr-de-prueba' }))
    expect(await screen.findByText('María José González Flores')).toBeInTheDocument()
    expect(qr.start).toHaveBeenCalledTimes(2)
  })

  it('muestra el error sin conexión antes de llamar al servidor', async () => {
    renderPage()
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')
    conexion = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    act(() => qr.leer({ data: 'SIGEX2.credencial-privada-de-prueba' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(SIN_CONEXION_IDENTIFICAR)
    expect(identificarQr).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('libera la cámara al salir de la página', async () => {
    const view = renderPage()
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')
    view.unmount()
    expect(qr.destroy).toHaveBeenCalledTimes(1)
  })

  it('no abre un modal tardío si se abandona QR durante la verificación', async () => {
    vi.mocked(identificarQr).mockRejectedValueOnce({ isAxiosError: true, response: { status: 400 } })
    renderPage()
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')
    await act(async () => qr.leer({ data: 'SIGEX2.credencial-privada-de-prueba' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cód. Univ' }))
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1300)) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Ingresa el Código Universitario:')).toBeInTheDocument()
    expect(qr.destroy).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['se niega el permiso', () => qr.start.mockRejectedValue('Camera not found.'), MENSAJE_SIN_PERMISO],
    ['no hay cámara', () => qr.hasCamera.mockResolvedValue(false), MENSAJE_SIN_CAMARA],
    ['no hay HTTPS', () => permitirCamara(false), MENSAJE_SIN_HTTPS],
  ])('muestra un mensaje claro si %s', async (_caso, provocarError, mensaje) => {
    provocarError()
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(mensaje)
    expect(screen.getByRole('button', { name: 'Volver a escanear' })).toBeInTheDocument()
  })

  it('extrae el código SIS de un JSON, de una URL o del texto tal cual', () => {
    expect(extraerCodigoSis('{"codigo_sis": 201904725}')).toBe('201904725')
    expect(extraerCodigoSis('https://sigex.umss.edu.bo/qr?codigoSis=201904725')).toBe('201904725')
    expect(extraerCodigoSis('https://sigex.umss.edu.bo/estudiantes/201904725')).toBe('201904725')
    expect(extraerCodigoSis('  201904725 ')).toBe('201904725')
  })
})
