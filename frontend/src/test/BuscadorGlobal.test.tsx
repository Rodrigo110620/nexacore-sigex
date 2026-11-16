import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import BuscadorGlobal from '../components/layout/BuscadorGlobal'

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ roles: ['ADMIN'], permisos: null }) }))
vi.mock('../services/examenService', () => ({
  listarExamenes: vi.fn().mockResolvedValue([{ idExamen: 7, idParalelo: 3, asignatura: 'Física I', grupo: 'G1', fecha: '2026-11-20', horaInicio: '08:30:00', ambienteNombre: '691A' }]),
}))
vi.mock('../services/estudianteService', () => ({ getEstudiantes: vi.fn().mockResolvedValue({ contenido: [] }) }))
vi.mock('../services/userService', () => ({ getUsers: vi.fn().mockResolvedValue({ contenido: [] }) }))

describe('Buscador rápido (Ctrl+K)', () => {
  it('se abre con Ctrl+K, filtra pantallas y exámenes y con Enter abre el elegido', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/inicio']}>
        <BuscadorGlobal />
        <Routes>
          <Route path="/dashboard/inicio" element={<p>Inicio</p>} />
          <Route path="/dashboard/examenes/:id/:p" element={<p>Detalle del examen</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const entrada = await screen.findByRole('combobox')
    expect(screen.getByRole('option', { name: /Reportes/ })).toBeInTheDocument()

    await act(async () => { fireEvent.change(entrada, { target: { value: 'fisica' } }) })
    const examen = await screen.findByRole('option', { name: /Física I · G1/ })
    expect(examen).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(entrada, { key: 'Enter' })
    expect(await screen.findByText('Detalle del examen')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
