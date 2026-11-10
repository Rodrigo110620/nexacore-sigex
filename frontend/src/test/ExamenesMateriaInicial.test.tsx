import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import ExamenesPage from '../pages/Examenes/ExamenesPage'
import { listarExamenes } from '../services/examenService'

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ isAdmin: false, roles: ['DOCENTE'], permisos: ['EXAMENES_GESTIONAR_PROPIOS'] }) }))
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn() }))
vi.mock('../services/api')
vi.mock('../components/layout/PanelLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../components/navigation/MobileBottomNav', () => ({ default: () => null }))
// El formulario real se prueba aparte: aquí solo importa qué materia le llega al abrirse.
vi.mock('../components/examenes/RegisterExamenModal', () => ({
  default: ({ isOpen, onClose, materiaInicial }: { isOpen: boolean; onClose: () => void; materiaInicial?: { id: number; nombre: string } | null }) =>
    isOpen ? <div role="dialog" aria-label="Programar examen">
      <p>{materiaInicial ? `Materia ${materiaInicial.id}: ${materiaInicial.nombre}` : 'Sin materia'}</p>
      <button type="button" onClick={onClose}>Cerrar</button>
    </div> : null,
}))

it('«Programar el primer examen» de Mis materias abre el formulario con esa materia, solo la primera vez', async () => {
  vi.mocked(listarExamenes).mockResolvedValue([])
  render(<MemoryRouter initialEntries={['/dashboard/examenes?nuevo=1&materia=2&nombre=Bases%20de%20Datos%20I']}><ExamenesPage /></MemoryRouter>)
  expect(await screen.findByText('Materia 2: Bases de Datos I')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('sin materia en el enlace, el formulario abre vacío', async () => {
  vi.mocked(listarExamenes).mockResolvedValue([])
  render(<MemoryRouter initialEntries={['/dashboard/examenes?nuevo=1']}><ExamenesPage /></MemoryRouter>)
  expect(await screen.findByText('Sin materia')).toBeInTheDocument()
})
