import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import IngresosRecientesCard from '../components/control/IngresosRecientesCard'
import type { EstudianteAsignado } from '../services/controlExamenService'
import { emitirCambioLocal } from '../services/notificacionService'
import api from '../services/api'

vi.mock('../services/api')
let estudiantes: EstudianteAsignado[]
const ruta = '/examenes/20/estudiantes'
const consultasAusentes = () => vi.mocked(api.get).mock.calls.filter(([url, c]) => url === ruta && (c?.params as { estado?: string })?.estado === 'AUSENTES').length
const evento = async (tipo: string, idExamen: number | null) => act(async () => {
  emitirCambioLocal({ tipo, idExamen, idEstudiante: 6 })
  await new Promise((resolve) => setTimeout(resolve, 450))
})

beforeEach(() => {
  vi.resetAllMocks()
  estudiantes = Array.from({ length: 9 }, (_, i) => ({
    idEstudiante: i + 1, nombre: `Estudiante ${i + 1}`, apellidos: 'Prueba', codigoSis: `20260000${i + 1}`,
    ci: `900010${i + 1}`, carrera: null, estado: i < 7 ? 'HABILITADO' : 'DESHABILITADO',
    motivoInhabilitacion: i < 7 ? null : 'Pendiente', ingresado: i === 6, fotoUrl: null,
  }))
  vi.mocked(api.get).mockImplementation(async (url, config) => {
    if (url.endsWith('/expulsiones')) return { data: [] }
    if (url.endsWith('/recientes')) return { data: { total: 2, ingresos: [
      { idEstudiante: 7, nombre: 'Estudiante 7', apellidos: 'Prueba', codigoSis: '202600007', fotoUrl: null, fechaHoraIngreso: '2026-11-07T09:14:45', aula: '608', expulsado: false },
      { idEstudiante: 9, nombre: 'Estudiante 9', apellidos: 'Prueba', codigoSis: '202600009', fotoUrl: null, fechaHoraIngreso: '2026-11-07T09:02:10', aula: '608', expulsado: true },
    ] } }
    const { estado, page, size } = (config?.params ?? {}) as { estado: string; page: number; size: number }
    const filtrados = estudiantes.filter((e) => estado !== 'AUSENTES' || (e.estado === 'HABILITADO' && !e.ingresado))
    return { data: { contenido: filtrados.slice(page * size, (page + 1) * size), pagina: page, tamano: size,
      totalRegistros: filtrados.length, totalPaginas: Math.ceil(filtrados.length / size) } }
  })
})

const montar = () => render(<MemoryRouter><IngresosRecientesCard idExamen={20} /></MemoryRouter>)

it('sección 11, Todos (DASH-02): los ingresos del más reciente al más antiguo, con hora y estado', async () => {
  montar()
  const lista = await screen.findByRole('list', { name: 'Ingresos recientes' })
  const filas = within(lista).getAllByRole('listitem')
  expect(filas[0]).toHaveTextContent('Prueba, Estudiante 7')
  expect(filas[0]).toHaveTextContent('SIS 202600007')
  expect(filas[0]).toHaveTextContent('09:14:45')
  expect(filas[0]).toHaveTextContent('Ingresó')
  expect(filas[1]).toHaveTextContent('Expulsado')
  expect(screen.getByText(/Mostrando 2 de 2 ingresos/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
})

it('sección 11, Solo ausentes (DASH-03): del servidor, en vivo y con el estado vacío', async () => {
  montar()
  await screen.findByRole('list', { name: 'Ingresos recientes' })
  fireEvent.click(screen.getByRole('button', { name: 'Solo ausentes' }))
  await waitFor(() => expect(api.get).toHaveBeenCalledWith(ruta, { params: { estado: 'AUSENTES', page: 0, size: 6 } }))
  const lista = await screen.findByRole('list', { name: 'Estudiantes ausentes' })
  expect(within(lista).getAllByRole('listitem')).toHaveLength(6)
  expect(within(lista).getAllByText('No ingresó')).toHaveLength(6)
  expect(screen.queryByText('Prueba, Estudiante 7')).not.toBeInTheDocument() // ya ingresó
  expect(screen.queryByText('Prueba, Estudiante 8')).not.toBeInTheDocument() // no habilitado
  expect(screen.getByText(/Faltan 6 estudiantes habilitados por ingresar/)).toBeInTheDocument()

  // Un cambio de otro examen no recarga; uno de este examen sí.
  estudiantes = estudiantes.map((e) => e.estado === 'HABILITADO' && e.idEstudiante > 2 ? { ...e, ingresado: true } : e)
  const antes = consultasAusentes()
  await evento('INGRESO', 21)
  expect(consultasAusentes()).toBe(antes)
  await evento('INGRESO', 20)
  await waitFor(() => expect(within(screen.getByRole('list', { name: 'Estudiantes ausentes' })).getAllByRole('listitem')).toHaveLength(2))
  expect(screen.getByText(/Faltan 2 estudiantes/)).toBeInTheDocument()

  // Si todos ingresaron (también al reconectar), el estado vacío del diseño.
  estudiantes = estudiantes.map((e) => e.estado === 'HABILITADO' ? { ...e, ingresado: true } : e)
  await evento('RECONECTADO', null)
  expect(await screen.findByText('Todos los estudiantes ingresaron')).toBeInTheDocument()
  expect(screen.getByText('No queda ningún estudiante habilitado por ingresar.')).toBeInTheDocument()
  expect(screen.queryByRole('list', { name: 'Estudiantes ausentes' })).not.toBeInTheDocument()
})
