import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import EstudiantesExamenLista from '../components/control/EstudiantesExamenLista'
import { AuthProvider } from '../context/AuthContext'

vi.mock('../services/ambienteService', () => ({ listarAmbientes: vi.fn().mockResolvedValue([]) }))

it('INCI-03: la lista muestra "Trasladado de [origen] a [aula actual]" que llega del servidor, en la tabla y en las tarjetas', () => {
  localStorage.setItem('token', 'test')
  localStorage.setItem('roles', JSON.stringify(['CONTROL']))
  const estudiante = {
    idEstudiante: 10, nombre: 'Lucía', apellidos: 'Aguilar', codigoSis: '2026001', ci: '9000101', carrera: 'Sistemas',
    estado: 'HABILITADO' as const, motivoInhabilitacion: null, ingresado: true, expulsado: false, trasladadoDesde: 'Aula 691A', trasladadoA: 'Aula 692B',
  }
  render(<AuthProvider><MemoryRouter><EstudiantesExamenLista idExamen={20} estudiantes={[estudiante]} /></MemoryRouter></AuthProvider>)
  expect(screen.getAllByText('Trasladado de Aula 691A a Aula 692B')).toHaveLength(2)
})
