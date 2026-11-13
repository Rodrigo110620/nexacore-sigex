import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ExamenesPage from '../pages/Examenes/ExamenesPage'
import { AuthProvider } from '../context/AuthContext'
import { listarExamenes, type ExamenDto } from '../services/examenService'
import { fechaLocal } from '../utils/examenFormat'

vi.mock('../services/examenService', async (original) => ({
  ...(await original<typeof import('../services/examenService')>()),
  listarExamenes: vi.fn(),
}))

const dia = (desplazamiento: number) => {
  const d = new Date()
  d.setDate(d.getDate() + desplazamiento)
  return fechaLocal(d)
}

const examen = (id: number, asignatura: string, fecha: string, estado = 'programado'): ExamenDto => ({
  idExamen: id, idParalelo: id, asignatura, sigla: 'S' + id, grupo: 'G1', docente: 'Docente', fecha,
  horaInicio: '23:58:00', duracionMinutos: 1, ambienteNombre: '607', estado,
} as unknown as ExamenDto)

function montar(ruta = '/dashboard/examenes') {
  localStorage.setItem('token', 't')
  localStorage.setItem('nombre', 'Admin')
  localStorage.setItem('roles', JSON.stringify(['ADMIN']))
  return render(<AuthProvider><MemoryRouter initialEntries={[ruta]}><ExamenesPage /></MemoryRouter></AuthProvider>)
}

describe('Exámenes: hoy y próximos, historial y cancelados', () => {
  beforeEach(() => {
    vi.mocked(listarExamenes).mockResolvedValue([
      examen(1, 'Cálculo Pasado', dia(-3)),
      examen(2, 'Física Hoy', dia(0)),
      examen(3, 'Química Mañana', dia(1)),
      examen(4, 'Biología Cancelada', dia(2), 'cancelado'),
    ])
  })

  it('por defecto muestra solo hoy y lo próximo, con el título de cada día', async () => {
    montar()
    const tabla = await screen.findByRole('table')
    expect(within(tabla).getByText('Física Hoy')).toBeInTheDocument()
    expect(within(tabla).getByText('Química Mañana')).toBeInTheDocument()
    expect(within(tabla).queryByText('Cálculo Pasado')).not.toBeInTheDocument()
    expect(within(tabla).queryByText('Biología Cancelada')).not.toBeInTheDocument()
    expect(within(tabla).getByText(/^Hoy · /)).toBeInTheDocument()
    expect(within(tabla).getByText(/^Mañana · /)).toBeInTheDocument()
  })

  it('los de días anteriores van al historial y los cancelados aparte', async () => {
    montar()
    await screen.findByRole('table')
    fireEvent.click(screen.getByRole('tab', { name: /Historial/ }))
    let tabla = screen.getByRole('table')
    expect(within(tabla).getByText('Cálculo Pasado')).toBeInTheDocument()
    expect(within(tabla).queryByText('Física Hoy')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Cancelados/ }))
    tabla = screen.getByRole('table')
    expect(within(tabla).getByText('Biología Cancelada')).toBeInTheDocument()
    expect(within(tabla).queryByText('Cálculo Pasado')).not.toBeInTheDocument()
  })
})
