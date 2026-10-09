import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import IdentificacionRoute from '../routes/IdentificacionRoute'

function renderRoute(roles: string[]) {
  localStorage.setItem('token', 'token-valido')
  localStorage.setItem('roles', JSON.stringify(roles))
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/identificar']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/identificar" element={<IdentificacionRoute><div>Identificación</div></IdentificacionRoute>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('IdentificacionRoute', () => {
  beforeEach(() => localStorage.clear())

  it.each([
    ['ADMIN', ['ADMIN']],
    ['CONTROL', ['CONTROL']],
    ['DOCENTE', ['DOCENTE']],
    ['ADMIN + CONTROL', ['ADMIN', 'CONTROL']],
    ['DOCENTE + CONTROL', ['DOCENTE', 'CONTROL']],
  ])('permite identificar a %s', (_nombre, roles) => {
    renderRoute(roles)
    expect(screen.getByText('Identificación')).toBeInTheDocument()
  })

  it.each([
    ['otro usuario', ['ESTUDIANTE']],
  ])('rechaza a %s', (_nombre, roles) => {
    renderRoute(roles)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Identificación')).not.toBeInTheDocument()
  })
})
