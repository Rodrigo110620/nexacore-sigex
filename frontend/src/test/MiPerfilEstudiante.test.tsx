import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import MiPerfilPage from '../pages/PortalEstudiante/MiPerfilPage'
import { obtenerMiPerfil, type MiPerfilEstudiante } from '../services/panelEstudianteService'
import { cambiarPassword } from '../services/profileService'
import { usaDatosDelEstudiante } from '../utils/passwordPolicy'

vi.mock('../hooks/useIsMobileDevice', () => ({ useIsMobileDevice: () => false }))
vi.mock('../services/panelEstudianteService', async (original) => ({
  ...(await original<typeof import('../services/panelEstudianteService')>()),
  obtenerMiPerfil: vi.fn(),
}))
vi.mock('../services/profileService', () => ({ cambiarPassword: vi.fn() }))

const obtener = vi.mocked(obtenerMiPerfil)
const cambiar = vi.mocked(cambiarPassword)

const PERFIL: MiPerfilEstudiante = {
  id: 1,
  codigoSis: '202104010',
  nombre: 'Ana',
  apellidos: 'Rojas Mendoza',
  ciEnmascarado: '••••210',
  email: '202104010@est.umss.edu',
  telefono: '71234567',
  estadoMatricula: 'MATRICULADO',
  condicion: 'REGULAR',
  carreras: [{ idCarrera: 2, nombreCarrera: 'Ingeniería de Sistemas', idFacultad: 1, nombreFacultad: 'Facultad de Ciencias y Tecnología' }],
  fotoUrl: '/mi/foto',
  solicitudFoto: null,
}

function renderPerfil() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/estudiante/perfil']}>
        <Routes>
          <Route path="/estudiante/perfil" element={<MiPerfilPage />} />
          <Route path="/estudiante/foto" element={<p>Registro obligatorio</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('MiPerfilPage (CTA-02)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('muestra sus datos de solo lectura y el acceso a cambiar la foto', async () => {
    obtener.mockResolvedValue(PERFIL)
    renderPerfil()
    expect(await screen.findByText('Datos personales y académicos')).toBeInTheDocument()
    expect(screen.getByText('••••210')).toBeInTheDocument()
    expect(screen.getByText('Ingeniería de Sistemas')).toBeInTheDocument()
    expect(screen.getByText('Foto aprobada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cambiar foto/i })).toHaveAttribute('href', '/estudiante/foto/cambiar')
  })

  it('si le rechazaron un cambio muestra el motivo y que su foto sigue vigente', async () => {
    obtener.mockResolvedValue({
      ...PERFIL,
      solicitudFoto: { estado: 'RECHAZADA', motivoRechazo: 'La foto tiene lentes oscuros.', enviadaEn: '2026-10-20T10:00:00' },
    })
    renderPerfil()
    expect(await screen.findByText('Tu foto nueva fue rechazada')).toBeInTheDocument()
    expect(screen.getByText('La foto tiene lentes oscuros.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /subir otra foto/i })).toBeInTheDocument()
  })

  it('si su foto fue reportada lo manda al registro obligatorio', async () => {
    obtener.mockResolvedValue({ ...PERFIL, fotoReportada: true })
    renderPerfil()
    expect(await screen.findByText('Registro obligatorio')).toBeInTheDocument()
  })

  it('no deja usar su código SIS como contraseña y cambia la contraseña válida', async () => {
    obtener.mockResolvedValue(PERFIL)
    cambiar.mockResolvedValue('Contraseña actualizada correctamente')
    renderPerfil()
    await userEvent.type(await screen.findByLabelText('Contraseña actual'), 'Clave#Segura9')
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'Sis#202104010')
    await userEvent.type(screen.getByLabelText('Confirmar nueva contraseña'), 'Sis#202104010')
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))
    expect(screen.getByText('No puede contener tu nombre, tu código SIS ni tu CI')).toBeInTheDocument()
    expect(cambiar).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText('Nueva contraseña'))
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'Otra#Clave77')
    await userEvent.clear(screen.getByLabelText('Confirmar nueva contraseña'))
    await userEvent.type(screen.getByLabelText('Confirmar nueva contraseña'), 'Otra#Clave77')
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))

    await waitFor(() => expect(cambiar).toHaveBeenCalledWith({
      passwordActual: 'Clave#Segura9', passwordNueva: 'Otra#Clave77', passwordConfirmacion: 'Otra#Clave77',
    }))
    expect(await screen.findByText('Contraseña actualizada correctamente')).toBeInTheDocument()
  })

  it('si la contraseña actual es incorrecta lo indica en ese campo', async () => {
    obtener.mockResolvedValue(PERFIL)
    cambiar.mockRejectedValue(new Error('La contraseña actual es incorrecta'))
    renderPerfil()
    await userEvent.type(await screen.findByLabelText('Contraseña actual'), 'Mala#1234')
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'Otra#Clave77')
    await userEvent.type(screen.getByLabelText('Confirmar nueva contraseña'), 'Otra#Clave77')
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))
    expect(await screen.findByText('La contraseña actual es incorrecta')).toBeInTheDocument()
  })
})

describe('usaDatosDelEstudiante', () => {
  it('detecta el código SIS o una palabra del nombre', () => {
    expect(usaDatosDelEstudiante('x202104010X#', '202104010', 'Ana María')).toBe(true)
    expect(usaDatosDelEstudiante('Maria#2026x', '202104010', 'Ana María')).toBe(false)
    expect(usaDatosDelEstudiante('maría#2026X', '202104010', 'Ana María')).toBe(true)
    expect(usaDatosDelEstudiante('Ana#2026xyz', '202104010', 'Ana')).toBe(true)
  })
})
