import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import ControlRoute from '../routes/ControlRoute'

function renderRoute(roles: string[]) {
  localStorage.setItem('token', 'token-valido')
  localStorage.setItem('roles', JSON.stringify(roles))
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/control']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/control" element={<ControlRoute><div>Control de ingreso</div></ControlRoute>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('ControlRoute', () => {
  beforeEach(() => localStorage.clear())

  it.each([
    ['CONTROL', ['CONTROL']],
    ['ADMIN', ['ADMIN']],
    ['DOCENTE', ['DOCENTE']],
    ['ADMIN + CONTROL', ['ADMIN', 'CONTROL']],
    ['DOCENTE + CONTROL', ['DOCENTE', 'CONTROL']],
  ])('permite el acceso a %s', (_nombre, roles) => {
    renderRoute(roles)
    expect(screen.getByText('Control de ingreso')).toBeInTheDocument()
  })

  it.each([
    ['otro rol', ['ESTUDIANTE']],
  ])('redirige a %s porque no tiene un rol operativo', (_nombre, roles) => {
    renderRoute(roles)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Control de ingreso')).not.toBeInTheDocument()
  })
})
