import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import VistaPreviaExamen from '../components/examenes/VistaPreviaExamen'
import { obtenerArchivo } from '../services/descargas'

vi.mock('../services/descargas', () => ({
  obtenerArchivo: vi.fn().mockResolvedValue({ blob: new Blob(['Código SIS;Nombre\n'], { type: 'text/csv' }), nombre: 'asistencia.csv' }),
}))

describe('Descargas del examen (DASH-04 y DASH-05)', () => {
  it('ofrece el acta en PDF y la asistencia en Excel y en CSV', async () => {
    render(<VistaPreviaExamen idExamen={4} formato="pdf" onClose={vi.fn()} />)
    const formatos = await screen.findAllByRole('tab')
    expect(formatos.map((f) => f.textContent)).toEqual(['PDF', 'Excel', 'CSV'])

    fireEvent.click(screen.getByRole('tab', { name: 'CSV' }))
    await waitFor(() => expect(obtenerArchivo).toHaveBeenCalledWith('/examenes/4/asistencia.csv', undefined, 'asistencia.csv'))
  })
})
