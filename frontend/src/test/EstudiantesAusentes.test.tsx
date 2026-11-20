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
const botonAusentes = () => screen.getByRole('button', { name: /^Solo ausentes/ })
const consultasAusentes = () => vi.mocked(api.get).mock.calls.filter(([url, c]) => url === ruta && (c?.params as { estado?: string })?.estado === 'AUSENTES').length
const evento = async (tipo: string, idExamen: number | null) => act(async () => {
  emitirCambioLocal({ tipo, idExamen, idEstudiante: 6 })
  await new Promise((resolve) => setTimeout(resolve, 450))
})

beforeEach(() => {
  vi.resetAllMocks()
  estudiantes = Array.from({ length: 11 }, (_, i) => ({
    idEstudiante: i + 1, nombre: `Estudiante ${i + 1}`, apellidos: 'Prueba', codigoSis: `20260000${i + 1}`,
    ci: `900010${i + 1}`, carrera: null, estado: i === 7 || i === 8 ? 'DESHABILITADO' : 'HABILITADO',
    motivoInhabilitacion: i === 7 || i === 8 ? 'Pendiente' : null, ingresado: i === 6, fotoUrl: null,
  }))
  vi.mocked(api.get).mockImplementation(async (url, config) => {
    if (url.endsWith('/expulsiones')) return { data: [] }
    if (url.endsWith('/recientes')) return { data: { total: 8, ingresos: [
      { idEstudiante: 7, nombre: 'Estudiante 7', apellidos: 'Prueba', codigoSis: '202600007', fotoUrl: null, fechaHoraIngreso: '2026-11-07T09:14:45', aula: '608',
        fechaHoraSalida: '2026-11-07T10:30:00', salidaAlCierre: false, fechaHoraExpulsion: null, motivoExpulsion: null, expulsionAnulada: false, fechaHoraTraslado: null, traslado: null },
      { idEstudiante: 9, nombre: 'Estudiante 9', apellidos: 'Prueba', codigoSis: '202600009', fotoUrl: null, fechaHoraIngreso: '2026-11-07T09:02:10', aula: '608',
        fechaHoraSalida: null, salidaAlCierre: false, fechaHoraExpulsion: '2026-11-07T09:40:00', motivoExpulsion: 'Uso de celular', expulsionAnulada: false, fechaHoraTraslado: null, traslado: null },
      { idEstudiante: 6, nombre: 'Estudiante 6', apellidos: 'Prueba', codigoSis: '202600006', fotoUrl: null, fechaHoraIngreso: '2026-11-07T09:00:00', aula: '690A',
        fechaHoraSalida: '2026-11-07T11:00:00', salidaAlCierre: true, fechaHoraExpulsion: null, motivoExpulsion: null, expulsionAnulada: false, fechaHoraTraslado: '2026-11-07T09:20:00', traslado: '608 → 690A' },
    ] } }
    const { estado, page, size } = (config?.params ?? {}) as { estado: string; page: number; size: number }
    const filtrados = estudiantes.filter((e) => estado !== 'AUSENTES' || (e.estado === 'HABILITADO' && !e.ingresado))
    return { data: { contenido: filtrados.slice(page * size, (page + 1) * size), pagina: page, tamano: size,
      totalRegistros: filtrados.length, totalPaginas: Math.ceil(filtrados.length / size) } }
  })
})

const tarjeta = (idExamen = 20) => <MemoryRouter><IngresosRecientesCard idExamen={idExamen} /></MemoryRouter>
const montar = () => render(tarjeta())

it('sección 11, Todos (DASH-02): los ingresos del más reciente al más antiguo, con los cuatro datos de la HU', async () => {
  montar()
  const lista = await screen.findByRole('list', { name: 'Ingresos recientes' })
  // Una fila por estudiante con nombre, código, hora exacta y estado de ingreso.
  const filas = within(lista).getAllByRole('listitem')
  expect(filas[0]).toHaveTextContent('Prueba, Estudiante 7')
  expect(filas[0]).toHaveTextContent('SIS 202600007')
  expect(filas[0]).toHaveTextContent('09:14:45')
  expect(filas[0]).toHaveTextContent('Ingresó')
  expect(filas[0]).not.toHaveTextContent('10:30:00')
  expect(screen.getByRole('navigation', { name: 'Paginación de estudiantes' })).toHaveTextContent('Mostrando 1–6 de 8')
  // Paginación: 6 por página; la 2.ª se pide al servidor.
  fireEvent.click(screen.getByRole('button', { name: 'Ir a la página 2' }))
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/examenes/20/estudiantes/recientes', { params: { cantidad: 6, pagina: 1 } }))
  expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
})

it('sección 11, Solo ausentes (DASH-03): del servidor, en vivo y con el estado vacío', async () => {
  montar()
  await screen.findByRole('list', { name: 'Ingresos recientes' })
  expect(await screen.findByRole('button', { name: 'Solo ausentes (8)' })).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(botonAusentes())
  await waitFor(() => expect(api.get).toHaveBeenCalledWith(ruta, { params: { estado: 'AUSENTES', page: 0, size: 6 } }))
  const lista = await screen.findByRole('list', { name: 'Estudiantes ausentes' })
  expect(within(lista).getAllByRole('listitem')).toHaveLength(6)
  expect(within(lista).getAllByText('Pendiente')).toHaveLength(6)
  expect(screen.queryByText('Prueba, Estudiante 7')).not.toBeInTheDocument() // ya ingresó
  expect(screen.queryByText('Prueba, Estudiante 8')).not.toBeInTheDocument() // no habilitado
  expect(botonAusentes()).toHaveAccessibleName('Solo ausentes (8)')
  expect(screen.getByText(/Faltan 8 estudiantes habilitados por ingresar/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
  await screen.findByText('Prueba, Estudiante 11')
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.queryByText('Prueba, Estudiante 1')).not.toBeInTheDocument()
  expect(api.get).toHaveBeenCalledWith(ruta, { params: { estado: 'AUSENTES', page: 1, size: 6 } })
  expect(vi.mocked(api.get).mock.calls.some(([url]) => url.endsWith('/expulsiones'))).toBe(false)

  // Un cambio de otro examen no recarga; uno de este examen sí.
  estudiantes = estudiantes.map((e) => e.estado === 'HABILITADO' && e.idEstudiante > 2 ? { ...e, ingresado: true } : e)
  const antes = consultasAusentes()
  await evento('INGRESO', 21)
  expect(consultasAusentes()).toBe(antes)
  await evento('INGRESO', 20)
  await screen.findByText('Prueba, Estudiante 1') // la segunda página dejó de existir
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(botonAusentes()).toHaveAccessibleName('Solo ausentes (2)')
  expect(screen.getByText(/Faltan 2 estudiantes/)).toBeInTheDocument()

  // Si todos ingresaron (también al reconectar), el estado vacío del diseño.
  estudiantes = estudiantes.map((e) => e.estado === 'HABILITADO' ? { ...e, ingresado: true } : e)
  await evento('RECONECTADO', null)
  expect(botonAusentes()).toHaveAccessibleName('Solo ausentes (0)')
  expect(await screen.findByText('Todos los estudiantes ingresaron')).toBeInTheDocument()
  expect(screen.getByText('No queda ningún estudiante habilitado por ingresar.')).toBeInTheDocument()
  expect(screen.queryByRole('list', { name: 'Estudiantes ausentes' })).not.toBeInTheDocument()
})

it('actualiza el total desde Todos y conserva el último dato confirmado si falla el conteo', async () => {
  const get = vi.mocked(api.get)
  const cargar = get.getMockImplementation()!
  get.mockImplementationOnce((...args) => args[0] === ruta ? Promise.reject(new Error('Sin conexión')) : cargar(...args))
  montar()
  await screen.findByRole('list', { name: 'Ingresos recientes' })
  expect(botonAusentes()).toHaveAccessibleName('Solo ausentes')

  estudiantes[0].ingresado = true
  await evento('INGRESO', 20)
  expect(botonAusentes()).toHaveAccessibleName('Solo ausentes (7)')

  estudiantes[1].ingresado = true
  get.mockImplementationOnce((...args) => args[0] === ruta ? Promise.reject(new Error('Sin conexión')) : cargar(...args))
  await evento('INGRESO', 20)
  expect(botonAusentes()).toHaveAccessibleName('Solo ausentes (7)')
  expect(screen.getByRole('list', { name: 'Ingresos recientes' })).toBeInTheDocument()

  estudiantes.forEach((e) => { e.ingresado = true })
  await evento('INGRESO', 20)
  expect(botonAusentes()).toHaveAccessibleName('Solo ausentes (0)')
})

it('permite reintentar un cambio de filtro fallido después de cargar ingresos', async () => {
  montar()
  await screen.findByRole('list', { name: 'Ingresos recientes' })
  vi.mocked(api.get).mockRejectedValueOnce(new Error('Sin conexión'))

  fireEvent.click(botonAusentes())

  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la lista')
  expect(screen.queryByText('Cargando…')).not.toBeInTheDocument()
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

  expect(await screen.findByRole('list', { name: 'Estudiantes ausentes' })).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('descarta la respuesta atrasada de otra página al cambiar de filtro y volver', async () => {
  montar()
  await screen.findByRole('button', { name: 'Solo ausentes (8)' })
  fireEvent.click(botonAusentes())
  await screen.findByText('Prueba, Estudiante 1')

  const get = vi.mocked(api.get)
  const cargar = get.getMockImplementation()!
  let responder!: () => void
  get.mockImplementationOnce((...args) => new Promise((resolve) => { responder = () => resolve(cargar(...args)) }))
  fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
  expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
  fireEvent.click(botonAusentes())
  await screen.findByText('Prueba, Estudiante 1')

  await act(async () => responder())
  expect(screen.getByText('Prueba, Estudiante 1')).toBeInTheDocument()
  expect(screen.queryByText('Prueba, Estudiante 11')).not.toBeInTheDocument()
})

it('reinicia el estado de la tarjeta al cambiar de examen', async () => {
  const { rerender } = montar()
  await screen.findByRole('button', { name: 'Solo ausentes (8)' })
  fireEvent.click(botonAusentes())
  await screen.findByText('Prueba, Estudiante 1')

  estudiantes = []
  rerender(tarjeta(21))
  expect(screen.queryByText('Prueba, Estudiante 1')).not.toBeInTheDocument()
  expect(botonAusentes()).toHaveAccessibleName('Solo ausentes')
  expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
  expect(await screen.findByRole('button', { name: 'Solo ausentes (0)' })).toBeInTheDocument()
  expect(api.get).toHaveBeenCalledWith('/examenes/21/estudiantes', { params: { estado: 'AUSENTES', page: 0, size: 1 } })
})
