import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import LoginPage from '../pages/Login/LoginPage'

vi.mock('../hooks/useIsMobileDevice', () => ({ useIsMobileDevice: () => false }))

function renderEn(ruta: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route element={<LoginPage />}>
            <Route path="/" element={null} />
            <Route path="/login" element={null} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

const formulario = () => screen.getByRole('heading', { name: 'INICIAR SESIÓN', hidden: true }).closest('section')!

describe('LoginPage (landing + login)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('en "/" muestra la landing y oculta el formulario', () => {
    renderEn('/')
    expect(screen.getByRole('heading', { name: /Sistema de Control/ })).toBeInTheDocument()
    expect(formulario()).toHaveAttribute('aria-hidden', 'true')
  })

  it('al pulsar "Iniciar sesión" abre el formulario', async () => {
    renderEn('/')
    await userEvent.click(screen.getAllByRole('button', { name: /iniciar sesión/i })[0])
    await waitFor(() => expect(formulario()).toHaveAttribute('aria-hidden', 'false'))
    expect(screen.getByLabelText('CORREO ELECTRÓNICO')).toHaveFocus()
  })

  it('"/login" abre directo el formulario y "Volver" regresa a la landing', async () => {
    renderEn('/login')
    expect(formulario()).toHaveAttribute('aria-hidden', 'false')
    await userEvent.click(screen.getByRole('button', { name: /volver/i }))
    await waitFor(() => expect(formulario()).toHaveAttribute('aria-hidden', 'true'))
  })
})
