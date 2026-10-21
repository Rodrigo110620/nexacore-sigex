import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import InicioEstudiantePage from '../pages/PortalEstudiante/InicioEstudiantePage'
import RegistrarFotoPage from '../pages/PortalEstudiante/RegistrarFotoPage'
import { obtenerMiPerfil, requiereRegistrarFoto, type MiPerfilEstudiante } from '../services/panelEstudianteService'

vi.mock('../hooks/useIsMobileDevice', () => ({ useIsMobileDevice: () => false }))
vi.mock('../services/panelEstudianteService', async (original) => ({
  ...(await original<typeof import('../services/panelEstudianteService')>()),
  obtenerMiPerfil: vi.fn(),
}))

const obtener = vi.mocked(obtenerMiPerfil)

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
})
