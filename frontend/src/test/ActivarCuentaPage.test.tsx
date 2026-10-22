import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ActivarCuentaPage from '../pages/Login/ActivarCuentaPage'
import { confirmarActivacionEstudiante, solicitarActivacionEstudiante } from '../services/authService'

vi.mock('../hooks/useIsMobileDevice', () => ({ useIsMobileDevice: () => false }))
vi.mock('../services/authService', () => ({
  solicitarActivacionEstudiante: vi.fn(),
  confirmarActivacionEstudiante: vi.fn(),
}))

const solicitar = vi.mocked(solicitarActivacionEstudiante)
const confirmar = vi.mocked(confirmarActivacionEstudiante)
const AVISO = 'Si los datos coinciden con un estudiante registrado sin cuenta, te enviamos un código a tu correo institucional.'

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/activar-cuenta']}>
      <Routes>
        <Route path="/activar-cuenta" element={<ActivarCuentaPage />} />
        <Route path="/login" element={<div>Pantalla Login</div>} />
      </Routes>
    </MemoryRouter>
  )
}

async function completarIdentidad() {
  await userEvent.type(screen.getByLabelText('CÓDIGO SIS'), '202104010')
  await userEvent.type(screen.getByLabelText('C.I.'), '7654321')
  await userEvent.click(screen.getByRole('button', { name: /continuar/i }))
}

async function completarCodigo(codigo = '123456') {
  await userEvent.type(await screen.findByLabelText('CÓDIGO DE VERIFICACIÓN'), codigo)
  await userEvent.click(screen.getByRole('button', { name: /continuar/i }))
}

describe('ActivarCuentaPage (CTA-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    solicitar.mockResolvedValue(AVISO)
  })

  it('valida el formato de los datos antes de pedir el código', async () => {
    renderPagina()
    await userEvent.type(screen.getByLabelText('CÓDIGO SIS'), '2021')
    await userEvent.type(screen.getByLabelText('C.I.'), '12')
    await userEvent.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.getByText('El código SIS debe tener 9 dígitos')).toBeInTheDocument()
    expect(screen.getByText('El C.I. debe tener 7 u 8 dígitos')).toBeInTheDocument()
    expect(solicitar).not.toHaveBeenCalled()
  })

  it('el código SIS y el C.I. solo aceptan dígitos', async () => {
    renderPagina()
    await userEvent.type(screen.getByLabelText('CÓDIGO SIS'), '20a21-04010999')
    expect(screen.getByLabelText('CÓDIGO SIS')).toHaveValue('202104010')
  })

  it('no pide el correo: lo arma con el código SIS', async () => {
    renderPagina()
    expect(screen.queryByLabelText('CORREO INSTITUCIONAL')).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('CÓDIGO SIS'), '202104010')
    expect(screen.getByTestId('correo-activacion')).toHaveTextContent('202104010@est.umss.edu')
  })

  it('envía los datos, muestra el aviso del servidor y pasa al código', async () => {
    renderPagina()
    await completarIdentidad()

    expect(solicitar).toHaveBeenCalledWith({ codigoSis: '202104010', ci: '7654321', email: '202104010@est.umss.edu' })
    expect(await screen.findByRole('heading', { name: 'Verifica tu correo' })).toBeInTheDocument()
    expect(screen.getByText(AVISO)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reenviar código en \d+ s/i })).toBeDisabled()
  })

  it('pide un código de 6 dígitos antes de crear la contraseña', async () => {
    renderPagina()
    await completarIdentidad()
    await completarCodigo('123')
    expect(screen.getByText('El código tiene 6 dígitos')).toBeInTheDocument()
  })

  it('no deja usar el código SIS dentro de la contraseña', async () => {
    renderPagina()
    await completarIdentidad()
    await completarCodigo()
    await userEvent.type(screen.getByLabelText('CONTRASEÑA'), 'Clave#202104010')
    await userEvent.type(screen.getByLabelText('CONFIRMAR CONTRASEÑA'), 'Clave#202104010')
    await userEvent.click(screen.getByRole('button', { name: /activar mi cuenta/i }))

    expect(screen.getByText('La contraseña no puede contener tu código SIS ni tu C.I.')).toBeInTheDocument()
    expect(confirmar).not.toHaveBeenCalled()
  })

  it('activa la cuenta y lleva al inicio de sesión', async () => {
    confirmar.mockResolvedValue('Tu cuenta quedó activada. Ya puedes iniciar sesión.')
    renderPagina()
    await completarIdentidad()
    await completarCodigo()
    await userEvent.type(screen.getByLabelText('CONTRASEÑA'), 'Segura#2026')
    expect(screen.getByText('Fuerte')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('CONFIRMAR CONTRASEÑA'), 'Segura#2026')
    await userEvent.click(screen.getByRole('button', { name: /activar mi cuenta/i }))

    expect(confirmar).toHaveBeenCalledWith({
      codigoSis: '202104010',
      codigo: '123456',
      passwordNueva: 'Segura#2026',
      passwordConfirmacion: 'Segura#2026',
    })
    expect(await screen.findByRole('heading', { name: 'Tu cuenta está activa' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    // navigate() se aplica un instante después: se espera la pantalla, no se busca al momento.
    expect(await screen.findByText('Pantalla Login')).toBeInTheDocument()
  })

  it('si el código es incorrecto vuelve al paso del código con el error', async () => {
    confirmar.mockRejectedValue(new Error('El código es incorrecto o venció. Pide uno nuevo.'))
    renderPagina()
    await completarIdentidad()
    await completarCodigo()
    await userEvent.type(screen.getByLabelText('CONTRASEÑA'), 'Segura#2026')
    await userEvent.type(screen.getByLabelText('CONFIRMAR CONTRASEÑA'), 'Segura#2026')
    await userEvent.click(screen.getByRole('button', { name: /activar mi cuenta/i }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Verifica tu correo' })).toBeInTheDocument())
    expect(screen.getByText('El código es incorrecto o venció. Pide uno nuevo.')).toBeInTheDocument()
    expect(screen.getByLabelText('CÓDIGO DE VERIFICACIÓN')).toHaveValue('')
  })

  it('otros errores del servidor se quedan en el paso de la contraseña', async () => {
    confirmar.mockRejectedValue(new Error('La contraseña no puede contener tu nombre, tu código SIS ni tu CI.'))
    renderPagina()
    await completarIdentidad()
    await completarCodigo()
    await userEvent.type(screen.getByLabelText('CONTRASEÑA'), 'Segura#2026')
    await userEvent.type(screen.getByLabelText('CONFIRMAR CONTRASEÑA'), 'Segura#2026')
    await userEvent.click(screen.getByRole('button', { name: /activar mi cuenta/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña no puede contener tu nombre')
    expect(screen.getByRole('heading', { name: 'Crea tu contraseña' })).toBeInTheDocument()
  })
})
