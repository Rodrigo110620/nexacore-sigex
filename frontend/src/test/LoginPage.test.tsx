import { describe, it, expect, beforeEach, vi } from 'vitest'
import MesaAyudaGlobal from '../components/ayuda/MesaAyudaGlobal'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import LoginPage from '../pages/Login/LoginPage'
import { loginUser } from '../services/authService'

vi.mock('../hooks/useIsMobileDevice', () => ({ useIsMobileDevice: () => false }))
vi.mock('../services/authService', () => ({ loginUser: vi.fn() }))

function renderEn(ruta: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route element={<LoginPage />}>
            <Route path="/" element={null} />
            <Route path="/login" element={null} />
          </Route>
          <Route path="/dashboard" element={<p>Panel</p>} />
        </Routes>
      </MemoryRouter>
      {/* La mesa de ayuda es una sola para toda la app (se monta en App). */}
      <MesaAyudaGlobal />
    </AuthProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it.each(['/', '/login'])('en "%s" muestra directamente un formulario y conserva los accesos', async (ruta) => {
    renderEn(ruta)
    expect(screen.getByRole('heading', { name: 'INICIAR SESIÓN' })).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'INGRESAR' })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /^Iniciar sesión$/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText('CORREO ELECTRÓNICO')).toHaveFocus()
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.getByRole('link', { name: 'Activar mi cuenta' })).toHaveAttribute('href', '/activar-cuenta')
    await userEvent.click(screen.getByRole('button', { name: 'Mesa de Ayuda' }))
    expect(screen.getByRole('dialog')).toBeVisible()
  })

  it('al enviar campos vacíos muestra el error junto a cada campo', async () => {
    renderEn('/login')
    await userEvent.click(screen.getByRole('button', { name: 'INGRESAR' }))
    expect(screen.getByLabelText('CORREO ELECTRÓNICO')).toHaveAccessibleDescription(/El correo es obligatorio/)
    expect(screen.getByLabelText('CONTRASEÑA')).toHaveAccessibleDescription('La contraseña es obligatoria')
    expect(loginUser).not.toHaveBeenCalled()
  })

  it('describe el formato inválido y el mínimo de contraseña en sus campos', async () => {
    renderEn('/login')
    const correo = screen.getByLabelText('CORREO ELECTRÓNICO')
    await userEvent.type(correo, 'ana@')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), '12345')
    await userEvent.click(screen.getByRole('button', { name: 'INGRESAR' }))
    expect(correo).toHaveAccessibleDescription('Formato de correo inválido')
    expect(screen.getByLabelText('CONTRASEÑA')).toHaveAccessibleDescription(/al menos 6 caracteres/)
    expect(loginUser).not.toHaveBeenCalled()
  })

  it.each([
    ['ana@umss.edu', 'ana@umss.edu'],
    ['202100101', '202100101@est.umss.edu'],
  ])('envía %s con el correo admitido por el backend', async (valor, email) => {
    vi.mocked(loginUser).mockResolvedValue({ token: 'test', nombre: 'Ana', roles: ['ESTUDIANTE'] })
    renderEn('/login')
    await userEvent.type(screen.getByLabelText('CORREO ELECTRÓNICO'), valor)
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'valida123')
    await userEvent.click(screen.getByRole('button', { name: 'INGRESAR' }))
    expect(await screen.findByText('Panel')).toBeInTheDocument()
    expect(loginUser).toHaveBeenCalledWith({ email, password: 'valida123' })
  })

  it.each([
    ['El correo no está registrado', 'Credenciales no válidas', 'Revisa tus credenciales e intenta de nuevo.'],
    ['La contraseña es incorrecta', 'Credenciales no válidas', 'Revisa tus credenciales e intenta de nuevo.'],
    ['Usuario o contraseña incorrectos', 'Credenciales no válidas'],
    ['La cuenta se encuentra inactiva. Contacte al administrador.', 'Cuenta inactiva'],
    ['Cuenta bloqueada temporalmente por intentos fallidos.', 'Cuenta bloqueada temporalmente'],
    ['No se pudo conectar con el servidor. Intenta más tarde.', 'Sin conexión al servidor'],
  ])('muestra un aviso general para «%s»', async (mensaje, titulo, detalle?: string) => {
    vi.mocked(loginUser).mockRejectedValue(new Error(mensaje))
    renderEn('/login')
    const correo = screen.getByLabelText('CORREO ELECTRÓNICO')
    await userEvent.type(correo, 'ana@umss.edu')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'valida123')
    await userEvent.click(screen.getByRole('button', { name: 'INGRESAR' }))
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(titulo)
    expect(alerta).toHaveTextContent(detalle ?? mensaje)
    if (detalle) expect(screen.queryByText(mensaje)).not.toBeInTheDocument()
    expect(correo).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByLabelText('CONTRASEÑA')).toHaveAttribute('aria-invalid', 'false')
  })
})
