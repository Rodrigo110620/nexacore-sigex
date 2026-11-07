import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ExamenesPage from '../pages/Examenes/ExamenesPage'
import { listarExamenes, type ExamenDto } from '../services/examenService'

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ isAdmin: false, roles: ['DOCENTE'] }) }))
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn() }))
vi.mock('../components/layout/PanelLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('../components/navigation/MobileBottomNav', () => ({ default: () => null }))
vi.mock('../components/examenes/RegisterExamenModal', () => ({ default: () => null }))

const base: ExamenDto = {
  idExamen: 1, idParalelo: 1, asignatura: 'Base de Datos I', sigla: 'INF-272', grupo: 'G1',
  docente: 'Docente', fecha: '2026-11-10', horaInicio: '09:00:00', duracionMinutos: 90,
  idAmbiente: 3, ambienteNombre: '608', estado: 'programado', normasGenerales: [], normasParticulares: [],
}

describe('Exámenes: columna y filtro de grupo', () => {
  it('muestra el grupo en su propia columna y filtra por G1, G2…', async () => {
    vi.mocked(listarExamenes).mockResolvedValue([
      base,
      { ...base, idExamen: 2, idParalelo: 2, grupo: 'G2' },
      { ...base, idExamen: 3, idParalelo: 3, asignatura: 'Redes', sigla: 'SIS-401', grupo: 'G10' },
    ])
    render(<MemoryRouter><ExamenesPage /></MemoryRouter>)
    const tabla = await screen.findByRole('table')
    expect(within(tabla).getByRole('columnheader', { name: 'Grupo' })).toBeInTheDocument()
    // La asignatura ya no lleva el grupo pegado: va en su columna.
    expect(within(tabla).getAllByText('Base de Datos I')).toHaveLength(2)
    expect(within(tabla).queryByText('Base de Datos I · G1')).not.toBeInTheDocument()
    const filas = within(tabla).getAllByRole('row').slice(1)
    expect(filas.map((f) => within(f).getAllByRole('cell')[0].textContent)).toEqual(['G1', 'G2', 'G10'])

    // Las opciones van por número (G2 antes que G10) y el filtro deja solo ese grupo.
    const filtro = screen.getAllByLabelText('Filtrar por grupo')[1]
    expect(within(filtro).getAllByRole('option').map((o) => o.textContent)).toEqual(['Todos los grupos', 'G1', 'G2', 'G10'])
    fireEvent.change(filtro, { target: { value: 'G2' } })
    expect(within(tabla).getAllByRole('row')).toHaveLength(2)
    expect(within(tabla).getByText('G2')).toBeInTheDocument()
  })
})
