import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import PanelTopBar from '../components/layout/PanelTopBar'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ nombre: 'Carla Control', roles: ['CONTROL'], logout: vi.fn() }),
}))

describe('PanelTopBar', () => {
  it('usa la variante de control sin depender del texto del título', () => {
    const { container } = render(
      <MemoryRouter>
        <PanelTopBar compactDesktop title="Aula 204" description="" variant="control" />
      </MemoryRouter>,
    )

    expect(container.querySelector('svg.lucide-clipboard-check')).toBeInTheDocument()
  })
})
