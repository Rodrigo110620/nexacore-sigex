import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import EstudiantesExamenSeccion from '../components/control/EstudiantesExamenSeccion'
import useEstudiantesExamen from '../hooks/useEstudiantesExamen'
import type { EstudianteAsignado } from '../services/controlExamenService'
import { emitirCambioLocal } from '../services/notificacionService'
import api from '../services/api'

vi.mock('../services/api')
let estudiantes: EstudianteAsignado[]
const anchoOriginal = window.innerWidth
const ruta = '/examenes/20/estudiantes'
function Pantalla() {
  const datos = useEstudiantesExamen(20)
  return <EstudiantesExamenSeccion idExamen={20} {...datos} />
}
function montar(ancho: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: ancho })
  return render(<AuthProvider><MemoryRouter><Pantalla /></MemoryRouter></AuthProvider>)
}
const consultas = () => vi.mocked(api.get).mock.calls.filter(([url]) => url === ruta).length
const esperarEvento = async (idExamen: number) => act(async () => {
  emitirCambioLocal({ tipo: 'INGRESO', idExamen, idEstudiante: 6 })
  await new Promise((resolve) => setTimeout(resolve, 450))
})
beforeEach(() => {
  vi.resetAllMocks()
  localStorage.setItem('token', 'test')
  localStorage.setItem('roles', JSON.stringify(['CONTROL']))
  estudiantes = Array.from({ length: 9 }, (_, i) => ({
    idEstudiante: i + 1, nombre: `Estudiante ${i + 1}`, apellidos: 'Prueba', codigoSis: `20260000${i + 1}`,
    ci: `900010${i + 1}`, carrera: null, estado: i < 7 ? 'HABILITADO' : 'DESHABILITADO',
    motivoInhabilitacion: i < 7 ? null : 'Pendiente', ingresado: i === 6,
  }))
  vi.mocked(api.get).mockImplementation(async (url, config) => {
    if (url.endsWith('/expulsiones') || url === '/ambientes') return { data: [] }
    if (url.endsWith('/resumen')) return { data: { total: 9, habilitados: 7, noHabilitados: 2,
      ingresados: estudiantes.filter((e) => e.ingresado).length } }
    const { estado, page, size } = (config?.params ?? {}) as { estado: string; page: number; size: number }
    const filtrados = estudiantes.filter((e) => estado !== 'AUSENTES' || (e.estado === 'HABILITADO' && !e.ingresado))
    return { data: { contenido: filtrados.slice(page * size, (page + 1) * size), pagina: page, tamano: size,
      totalRegistros: filtrados.length, totalPaginas: Math.ceil(filtrados.length / size) } }
  })
})
afterEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: anchoOriginal }))

it.each([390, 1024])('DASH-03 a %s px: pestañas, servidor, páginas y actualización en vivo', async (ancho) => {
  const size = ancho < 768 ? 3 : 5
  const { container } = montar(ancho)
  const grupo = within(screen.getByRole('group', { name: ancho < 768 ? 'Filtrar por estado en móvil' : 'Filtrar por estado' }))
  await screen.findByRole('table')
  expect(grupo.getAllByRole('button')).toHaveLength(4)
  expect(grupo.getByRole('button', { name: 'No habilitados (2)' })).toBeInTheDocument()
  if (ancho < 768) expect(grupo.getByRole('button', { name: 'Solo ausentes (6)' }).parentElement).toHaveClass('grid-cols-2')
  fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
  await waitFor(() => expect(api.get).toHaveBeenCalledWith(ruta, { params: { estado: 'TODOS', page: 1, size } }))
  await screen.findByRole('table')
  fireEvent.click(grupo.getByRole('button', { name: 'Solo ausentes (6)' }))
  await waitFor(() => expect(api.get).toHaveBeenCalledWith(ruta, { params: { estado: 'AUSENTES', page: 0, size } }))
  await screen.findByRole('table')
  expect(grupo.getByRole('button', { name: 'Solo ausentes (6)' })).toHaveAttribute('aria-pressed', 'true')
  expect(within(container.querySelector('table')!).getAllByRole('row')).toHaveLength(size + 1)
  expect(screen.queryByText('Estudiante 7 Prueba')).not.toBeInTheDocument()
  expect(screen.queryByText('Estudiante 8 Prueba')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
  await waitFor(() => expect(api.get).toHaveBeenCalledWith(ruta, { params: { estado: 'AUSENTES', page: 1, size } }))
  await screen.findByRole('table')
  estudiantes = estudiantes.map((e) => e.estado === 'HABILITADO' && e.idEstudiante > 2 ? { ...e, ingresado: true } : e)
  const antes = consultas()
  await esperarEvento(21)
  expect(consultas()).toBe(antes)
  expect(grupo.getByRole('button', { name: 'Solo ausentes (6)' })).toBeInTheDocument()
  await esperarEvento(20)
  await waitFor(() => expect(grupo.getByRole('button', { name: 'Solo ausentes (2)' })).toBeInTheDocument())
  await waitFor(() => expect(within(screen.getByRole('table')).getByText('Estudiante 1 Prueba')).toBeInTheDocument())
  expect(consultas()).toBe(antes + 2) // Página 1 fuera de rango y recuperación en página 0.
  expect(screen.queryByText('Todos los estudiantes ingresaron')).not.toBeInTheDocument()
  estudiantes = estudiantes.map((e) => e.estado === 'HABILITADO' ? { ...e, ingresado: true } : e)
  await esperarEvento(20)
  expect(await screen.findByText('Todos los estudiantes ingresaron')).toBeInTheDocument()
  expect(grupo.getByRole('button', { name: 'Solo ausentes (0)' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})

it('al reconectar actualiza el filtro activo aunque se haya perdido el ingreso', async () => {
  montar(390)
  const grupo = within(screen.getByRole('group', { name: 'Filtrar por estado en móvil' }))
  fireEvent.click(await grupo.findByRole('button', { name: 'Solo ausentes (6)' }))
  await screen.findByRole('table')
  estudiantes = estudiantes.map((e) => e.estado === 'HABILITADO' ? { ...e, ingresado: true } : e)
  act(() => emitirCambioLocal({ tipo: 'RECONECTADO', idExamen: null, idEstudiante: null }))
  expect(await screen.findByText('Todos los estudiantes ingresaron')).toBeInTheDocument()
})
