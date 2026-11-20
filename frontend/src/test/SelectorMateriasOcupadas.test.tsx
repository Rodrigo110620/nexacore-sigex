import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SelectorMaterias from '../components/admin/SelectorMaterias'
import type { MateriaDto } from '../services/materiaService'

vi.mock('../services/materiaService', () => ({
  buscarMaterias: vi.fn().mockResolvedValue([{ id: 1, sigla: 'FIS-101', nombre: 'Física I' }]),
  gruposOcupados: vi.fn().mockResolvedValue(['G1', 'G2']),
}))

function Selector() {
  const [materias, setMaterias] = useState<MateriaDto[]>([])
  return <SelectorMaterias value={materias} onChange={setMaterias} />
}

describe('HU#1 BUG-A01 - grupos ocupados al registrar docente', () => {
  it('oculta los grupos de otros docentes y selecciona el primer grupo libre', async () => {
    render(<Selector />)
    fireEvent.change(screen.getByPlaceholderText(/Busca por nombre o sigla/), { target: { value: 'fis' } })
    fireEvent.click(await screen.findByRole('button', { name: /Física I/ }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'G3' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.queryByRole('button', { name: 'G1' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'G2' })).not.toBeInTheDocument()
    expect(screen.getByText(/G1, G2 ya tienen docente/)).toBeInTheDocument()
  })
})
