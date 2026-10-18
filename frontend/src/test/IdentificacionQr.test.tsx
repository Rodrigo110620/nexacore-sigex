import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import IdentificacionPage from '../pages/Control/IdentificacionPage'
import { identificarEstudiante, identificarQr } from '../services/identificacionService'
import { MENSAJE_SIN_CAMARA, MENSAJE_SIN_HTTPS, MENSAJE_SIN_PERMISO } from '../hooks/useEscanerQr'
import { extraerCodigoSis } from '../utils/extraerCodigoSis'

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
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard/control/7/identificar']}>
        <Routes>
          <Route path="/dashboard/control/:idExamen/identificar" element={<IdentificacionPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'QR' }))
}

const permitirCamara = (seguro: boolean) => {
  Object.defineProperty(window, 'isSecureContext', { value: seguro, configurable: true })
  Object.defineProperty(navigator, 'mediaDevices', { value: seguro ? {} : undefined, configurable: true })
}

describe('Identificación por QR', () => {
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

  it('oculta la credencial y muestra un modal al escanear un QR inválido', async () => {
    vi.mocked(identificarQr).mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { mensaje: 'El código QR es inválido o fue alterado' } } })
    renderPage()
    await screen.findByText('Apunta la cámara y alinea el código dentro del recuadro.')

    act(() => qr.leer({ data: 'SIGEX1.202104010.credencial-alterada' }))

    expect(await screen.findByRole('dialog', { name: 'Código QR no válido' })).toBeInTheDocument()
    expect(screen.queryByText(/credencial-alterada/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Escanear otro código' }))
    expect(screen.queryByRole('dialog', { name: 'Código QR no válido' })).not.toBeInTheDocument()
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
