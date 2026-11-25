import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AlertaSinPersonalControl from '../components/inicio/AlertaSinPersonalControl'
import { examenesSinPersonal } from '../services/personalControlService'

vi.mock('../services/personalControlService', () => ({ examenesSinPersonal: vi.fn() }))

describe('Alerta de exámenes sin personal de control', () => {
  it('lista los exámenes de la semana sin personal, con su enlace para asignarlo', async () => {
    vi.mocked(examenesSinPersonal).mockResolvedValue([
      { idExamen: 9, idParalelo: 7, materia: 'Cálculo II', grupo: 'G1', fecha: '2026-11-27', horaInicio: '08:00:00', aulas: 2 },
    ])
    render(<MemoryRouter><AlertaSinPersonalControl /></MemoryRouter>)
    expect(await screen.findByText('1 examen de esta semana no tiene personal de control')).toBeInTheDocument()
    expect(screen.getByText(/2 aulas/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Cálculo II · G1/ })).toHaveAttribute('href', '/dashboard/examenes/9/7')
  })

  it('si todos tienen personal no muestra nada', async () => {
    vi.mocked(examenesSinPersonal).mockResolvedValue([])
    const { container } = render(<MemoryRouter><AlertaSinPersonalControl /></MemoryRouter>)
    await Promise.resolve()
    expect(container).toBeEmptyDOMElement()
  })
})
