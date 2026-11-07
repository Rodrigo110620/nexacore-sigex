import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EstudiantesExamenLista from '../components/control/EstudiantesExamenLista'
import { listarAmbientes } from '../services/ambienteService'
import type { EstudianteAsignado } from '../services/controlExamenService'

const sesion = vi.hoisted(() => ({ roles: ['CONTROL'] as string[] }))
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ roles: sesion.roles, permisos: [], isAdmin: sesion.roles.includes('ADMIN') }) }))
vi.mock('../services/api')
vi.mock('../services/ambienteService', () => ({ listarAmbientes: vi.fn().mockResolvedValue([{ id: 4, nombre: '608' }]) }))
vi.mock('../services/estudianteService', () => ({ descargarFotoEstudiante: vi.fn().mockResolvedValue(new Blob(['x'])) }))

const ingresado: EstudianteAsignado = {
  idEstudiante: 1, nombre: 'Ana', apellidos: 'Rojas Vera', codigoSis: '202100101', ci: '7400113', carrera: 'Ingeniería de Sistemas',
  estado: 'HABILITADO', motivoInhabilitacion: null, ingresado: true, fotoUrl: null, idAmbienteIngreso: 4, aulaIngreso: '608',
}

describe('Lista de estudiantes del examen: aulas', () => {
  beforeEach(() => vi.mocked(listarAmbientes).mockClear())

  it('el CONTROL ve el aula de ingreso sin pedir la lista de aulas (no tiene permiso: 403)', () => {
    sesion.roles = ['CONTROL']
    render(<MemoryRouter><EstudiantesExamenLista idExamen={1} estudiantes={[ingresado]} /></MemoryRouter>)
    expect(screen.getAllByText('608').length).toBeGreaterThan(0)
    expect(listarAmbientes).not.toHaveBeenCalled()
  })

  it('el DOCENTE sí carga las aulas, porque puede trasladar', () => {
    sesion.roles = ['DOCENTE']
    render(<MemoryRouter><EstudiantesExamenLista idExamen={1} estudiantes={[ingresado]} /></MemoryRouter>)
    expect(listarAmbientes).toHaveBeenCalled()
  })
})
