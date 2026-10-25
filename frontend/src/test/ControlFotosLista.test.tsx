import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import EstudiantesExamenLista from '../components/control/EstudiantesExamenLista'
import type { EstudianteAsignado } from '../services/controlExamenService'

vi.mock('../services/api')
vi.mock('../services/estudianteService', () => ({
  descargarFotoEstudiante: vi.fn().mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' })),
}))

const fila = (id: number, nombre: string, fotoUrl: string | null, ingresado = false): EstudianteAsignado => ({
  idEstudiante: id, nombre, apellidos: 'Prueba', codigoSis: `20210401${id}`, ci: `123456${id}`,
  carrera: 'Ingeniería de Sistemas', estado: 'HABILITADO', motivoInhabilitacion: null, ingresado, fotoUrl,
})

describe('Lista de estudiantes del control: fotos', () => {
  it('muestra la foto (ampliable) de quien la tiene y avisa "Sin foto" a quien no', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:foto')
    URL.revokeObjectURL = vi.fn()
    render(<AuthProvider><MemoryRouter><EstudiantesExamenLista idExamen={20} estudiantes={[
      fila(1, 'Ana', '/estudiantes/1/foto'),
      fila(2, 'Beto', null),
      fila(3, 'Ciro', null, true),
    ]} /></MemoryRouter></AuthProvider>)

    expect((await screen.findAllByRole('button', { name: 'Ver la foto de Ana Prueba en grande' })).length).toBeGreaterThan(0)
    // Beto no tiene foto y aún no ingresó; Ciro ya ingresó: no se le avisa.
    const avisos = screen.getAllByText('Sin foto: no podrá ingresar')
    expect(avisos.length).toBeGreaterThan(0)
    avisos.forEach((aviso) => expect(aviso.closest('tr, li')).toHaveTextContent('Beto'))
  })
})
