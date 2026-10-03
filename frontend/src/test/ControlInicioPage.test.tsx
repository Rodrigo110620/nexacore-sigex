import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import ControlInicioPage from '../pages/Control/ControlInicioPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'

function renderRuta(ruta: string) {
  localStorage.setItem('token', 'token-control')
  localStorage.setItem('roles', JSON.stringify(['CONTROL']))
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/inicio" element={<ControlInicioPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('ControlInicioPage', () => {
  it('muestra un inicio neutral en progreso', () => {
    renderRuta('/dashboard/inicio')

    expect(screen.getByText('Inicio en progreso')).toBeInTheDocument()
    expect(screen.getByText(/Utiliza la sección Control/i)).toBeInTheDocument()
    expect(screen.queryByText('CONTROL DE INGRESO')).not.toBeInTheDocument()
  })

  it('CONTROL en /dashboard termina en Inicio', async () => {
    renderRuta('/dashboard')

    expect(await screen.findByText('Inicio en progreso')).toBeInTheDocument()
  })
})
