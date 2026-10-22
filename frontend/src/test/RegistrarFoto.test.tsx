import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import InicioEstudiantePage from '../pages/PortalEstudiante/InicioEstudiantePage'
import RegistrarFotoPage from '../pages/PortalEstudiante/RegistrarFotoPage'
import { enviarMiFoto, obtenerMiPerfil, requiereRegistrarFoto, type MiPerfilEstudiante } from '../services/panelEstudianteService'

vi.mock('../hooks/useIsMobileDevice', () => ({ useIsMobileDevice: () => false }))
// La cámara no existe en las pruebas: el escaneo devuelve una foto al pulsar un botón.
vi.mock('../components/estudiantes/EscaneoRostro', () => ({
  default: ({ onCapturada, onCancelar }: { onCapturada: (f: { archivo: Blob; url: string }) => void; onCancelar: () => void }) => (
    <div>
      <p>Cámara simulada</p>
      <button onClick={() => onCapturada({ archivo: new Blob(['x']), url: 'blob:foto' })}>Simular foto</button>
      <button onClick={onCancelar}>Cancelar escaneo</button>
    </div>
  ),
}))
vi.mock('../services/panelEstudianteService', async (original) => ({
  ...(await original<typeof import('../services/panelEstudianteService')>()),
  obtenerMiPerfil: vi.fn(),
  enviarMiFoto: vi.fn(),
}))

const obtener = vi.mocked(obtenerMiPerfil)
const enviar = vi.mocked(enviarMiFoto)

const PERFIL: MiPerfilEstudiante = {
  id: 1,
  codigoSis: '202104010',
  nombre: 'Ana',
  apellidos: 'Rojas Mendoza',
  ciEnmascarado: '*****321',
  email: '202104010@est.umss.edu',
  telefono: null,
  estadoMatricula: 'MATRICULADO',
  condicion: 'REGULAR',
  fotoUrl: null,
  solicitudFoto: null,
}

function renderEn(ruta: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/estudiante" element={<InicioEstudiantePage />} />
          <Route path="/estudiante/foto" element={<RegistrarFotoPage />} />
          <Route path="/estudiante/foto/cambiar" element={<RegistrarFotoPage cambio />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('requiereRegistrarFoto (CTA-02)', () => {
  it('pide la foto si nunca envió una o se la rechazaron', () => {
    expect(requiereRegistrarFoto(PERFIL)).toBe(true)
    expect(
      requiereRegistrarFoto({ ...PERFIL, solicitudFoto: { estado: 'RECHAZADA', motivoRechazo: 'Borrosa', enviadaEn: '2026-10-20T10:00:00' } })
    ).toBe(true)
  })

  it('no la pide si ya tiene foto aprobada o una pendiente de revisión', () => {
    expect(requiereRegistrarFoto({ ...PERFIL, fotoUrl: '/mi/foto' })).toBe(false)
    expect(
      requiereRegistrarFoto({ ...PERFIL, solicitudFoto: { estado: 'PENDIENTE', motivoRechazo: null, enviadaEn: '2026-10-20T10:00:00' } })
    ).toBe(false)
  })
})

describe('Foto obligatoria del estudiante (CTA-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('sin foto, el inicio lo manda a registrarla', async () => {
    obtener.mockResolvedValue(PERFIL)
    renderEn('/estudiante')
    expect(await screen.findByRole('heading', { name: 'Registra tu foto' })).toBeInTheDocument()
    expect(screen.getByText('Sin gorra, lentes oscuros ni barbijo')).toBeInTheDocument()
  })

  it('con foto aprobada se queda en el inicio', async () => {
    obtener.mockResolvedValue({ ...PERFIL, fotoUrl: '/mi/foto' })
    renderEn('/estudiante')
    expect(await screen.findByText('Tu cuenta de estudiante está activa.')).toBeInTheDocument()
  })

  it('si se la rechazaron, muestra el motivo de la administración', async () => {
    obtener.mockResolvedValue({
      ...PERFIL,
      solicitudFoto: { estado: 'RECHAZADA', motivoRechazo: 'La foto está borrosa.', enviadaEn: '2026-10-20T10:00:00' },
    })
    renderEn('/estudiante/foto')
    expect(await screen.findByRole('heading', { name: 'Tu foto fue rechazada' })).toBeInTheDocument()
    expect(screen.getByText('La foto está borrosa.')).toBeInTheDocument()
  })

  it('si no se pudo cargar el perfil, permite reintentar', async () => {
    obtener.mockRejectedValue(new Error('No se pudo conectar con el servidor. Intenta más tarde.'))
    renderEn('/estudiante/foto')
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('activa la cámara, completa el escaneo y permite repetir', async () => {
    URL.revokeObjectURL = vi.fn()
    obtener.mockResolvedValue(PERFIL)
    renderEn('/estudiante/foto')
    await userEvent.click(await screen.findByRole('button', { name: /activar cámara/i }))
    expect(screen.getByText('Cámara simulada')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Simular foto' }))
    expect(screen.getByRole('heading', { name: 'Revisa tu foto' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Tu foto de frente' })).toHaveAttribute('src', 'blob:foto')

    await userEvent.click(screen.getByRole('button', { name: /repetir escaneo/i }))
    expect(screen.getByText('Cámara simulada')).toBeInTheDocument()
  })

  it('cancelar el escaneo vuelve a las indicaciones', async () => {
    obtener.mockResolvedValue(PERFIL)
    renderEn('/estudiante/foto')
    await userEvent.click(await screen.findByRole('button', { name: /activar cámara/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar escaneo' }))
    expect(screen.getByRole('heading', { name: 'Registra tu foto' })).toBeInTheDocument()
  })

  async function hastaRevisarFoto() {
    URL.revokeObjectURL = vi.fn()
    obtener.mockResolvedValue(PERFIL)
    renderEn('/estudiante/foto')
    await userEvent.click(await screen.findByRole('button', { name: /activar cámara/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Simular foto' }))
  }

  it('pide la contraseña antes de registrar la foto', async () => {
    await hastaRevisarFoto()
    await userEvent.click(screen.getByRole('button', { name: /registrar foto/i }))
    expect(screen.getByText('Escribe tu contraseña')).toBeInTheDocument()
    expect(enviar).not.toHaveBeenCalled()
  })

  it('registra la primera foto y queda aprobada', async () => {
    enviar.mockResolvedValue({ estado: 'APROBADA', mensaje: 'Tu foto quedó registrada.' })
    await hastaRevisarFoto()
    await userEvent.type(screen.getByLabelText('CONFIRMA TU CONTRASEÑA'), 'Segura#2026')
    await userEvent.click(screen.getByRole('button', { name: /registrar foto/i }))

    expect(enviar).toHaveBeenCalledWith(expect.any(Blob), 'Segura#2026')
    expect(await screen.findByRole('heading', { name: '¡Foto registrada!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ir a mi panel/i })).toBeInTheDocument()
  })

  it('un cambio de foto queda en revisión', async () => {
    enviar.mockResolvedValue({ estado: 'PENDIENTE', mensaje: 'Tu foto nueva quedó pendiente.' })
    await hastaRevisarFoto()
    await userEvent.type(screen.getByLabelText('CONFIRMA TU CONTRASEÑA'), 'Segura#2026')
    await userEvent.click(screen.getByRole('button', { name: /registrar foto/i }))
    expect(await screen.findByRole('heading', { name: 'Tu foto está en revisión' })).toBeInTheDocument()
  })

  it('si la contraseña es incorrecta lo indica en el campo y no avanza', async () => {
    enviar.mockRejectedValue(new Error('La contraseña no es correcta.'))
    await hastaRevisarFoto()
    await userEvent.type(screen.getByLabelText('CONFIRMA TU CONTRASEÑA'), 'Otra#2026')
    await userEvent.click(screen.getByRole('button', { name: /registrar foto/i }))
    expect(await screen.findByText('La contraseña no es correcta.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Revisa tu foto' })).toBeInTheDocument()
  })

  it('si el personal de control reportó su foto, debe volver a escanear su rostro', async () => {
    expect(requiereRegistrarFoto({ ...PERFIL, fotoUrl: '/mi/foto', fotoReportada: true })).toBe(true)
    obtener.mockResolvedValue({ ...PERFIL, fotoUrl: '/mi/foto', fotoReportada: true })
    renderEn('/estudiante')
    expect(await screen.findByRole('heading', { name: 'Vuelve a escanear tu rostro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /volver a escanear/i })).toBeInTheDocument()
  })

  it('con foto aprobada puede cambiarla desde el inicio sin perderla', async () => {
    obtener.mockResolvedValue({ ...PERFIL, fotoUrl: '/mi/foto' })
    renderEn('/estudiante')
    await userEvent.click(await screen.findByRole('link', { name: /cambiar foto/i }))
    expect(await screen.findByRole('heading', { name: 'Cambia tu foto' })).toBeInTheDocument()
    expect(screen.getByText(/Tu foto actual seguirá vigente/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /cancelar y volver/i }))
    expect(await screen.findByText('Tu cuenta de estudiante está activa.')).toBeInTheDocument()
  })

  it('si le rechazaron un cambio, su foto sigue vigente y puede subir otra', async () => {
    obtener.mockResolvedValue({
      ...PERFIL,
      fotoUrl: '/mi/foto',
      solicitudFoto: { estado: 'RECHAZADA', motivoRechazo: 'Lentes oscuros', enviadaEn: '2026-10-20T10:00:00' },
    })
    renderEn('/estudiante')
    expect(await screen.findByText('Cambio rechazado')).toBeInTheDocument()
    expect(screen.getByText(/Motivo: Lentes oscuros/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /subir otra foto/i })).toHaveAttribute('href', '/estudiante/foto/cambiar')
  })
})
