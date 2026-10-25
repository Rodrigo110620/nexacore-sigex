import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CampanaNotificaciones from '../components/notificaciones/CampanaNotificaciones'
import AvisoFotoReportada from '../components/estudiantes/AvisoFotoReportada'
import * as service from '../services/notificacionService'
import type { Notificacion } from '../services/notificacionService'

vi.mock('../services/notificacionService', async (original) => ({
  ...(await original<typeof import('../services/notificacionService')>()),
  listarNotificaciones: vi.fn(),
  marcarNotificacionLeida: vi.fn().mockResolvedValue(undefined),
  marcarTodasLeidas: vi.fn().mockResolvedValue(undefined),
  quitarNotificacion: vi.fn().mockResolvedValue(undefined),
  limpiarNotificaciones: vi.fn().mockResolvedValue(undefined),
}))

const notificacion = (id: number, extra: Partial<Notificacion> = {}): Notificacion => ({
  id,
  tipo: 'QR_DUPLICADO',
  titulo: `QR duplicado: Estudiante ${id}`,
  detalle: 'Cálculo I · Se presentó Juan Pérez sin carnet',
  idExamen: 7,
  idEstudiante: 3,
  enlace: '/dashboard/control/7/informacion',
  creadaEn: new Date().toISOString(),
  leida: false,
  ...extra,
})

/** Respuesta SSE que el test puede ir escribiendo como el servidor. */
function flujoSse() {
  let escribir: (texto: string) => void = () => undefined
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      escribir = (texto) => controller.enqueue(encoder.encode(texto))
    },
  })
  return { respuesta: new Response(body, { status: 200 }), escribir: (t: string) => escribir(t) }
}

describe('CampanaNotificaciones', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'jwt-de-prueba')
  })
  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('muestra las no leídas y recibe un reporte nuevo en vivo con aviso emergente', async () => {
    vi.mocked(service.listarNotificaciones).mockResolvedValue([notificacion(1), notificacion(2, { leida: true })])
    const sse = flujoSse()
    const fetchMock = vi.fn().mockResolvedValue(sse.respuesta)
    vi.stubGlobal('fetch', fetchMock)
    const recibidas: Notificacion[] = []
    const dejar = service.alRecibirNotificacion((n) => recibidas.push(n))

    render(<MemoryRouter><CampanaNotificaciones roles={['CONTROL']} /></MemoryRouter>)

    expect(await screen.findByRole('button', { name: 'Notificaciones: 1 sin leer' })).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    // El token va en la cabecera, no en la URL.
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/notificaciones/stream')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-de-prueba')

    await act(async () => {
      sse.escribir('event:conectado\ndata:ok\n\n:latido\n\n')
      sse.escribir(`event:notificacion\nid:9\ndata:${JSON.stringify(notificacion(9, { titulo: 'Intento de ingreso incorrecto: Ana Rojas', tipo: 'INTENTO_INGRESO' }))}\n\n`)
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Intento de ingreso incorrecto: Ana Rojas')
    expect(screen.getByRole('button', { name: 'Notificaciones: 2 sin leer' })).toBeInTheDocument()
    expect(recibidas.map((n) => n.id)).toEqual([9])
    dejar()
  })

  it('al abrir una notificación la marca como leída', async () => {
    vi.mocked(service.listarNotificaciones).mockResolvedValue([notificacion(1)])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(flujoSse().respuesta))
    const user = userEvent.setup()

    render(<MemoryRouter><CampanaNotificaciones roles={['ADMIN']} /></MemoryRouter>)

    await user.click(await screen.findByRole('button', { name: 'Notificaciones: 1 sin leer' }))
    await user.click(screen.getByRole('button', { name: (nombre) => nombre.includes('QR duplicado: Estudiante 1') && !nombre.startsWith('Quitar') }))

    expect(service.marcarNotificacionLeida).toHaveBeenCalledWith(1)
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument()
  })

  it('quita una notificación solo de mi lista', async () => {
    vi.mocked(service.listarNotificaciones).mockResolvedValue([
      notificacion(1, { tipo: 'EXPULSION', titulo: 'Expulsión: Ana Rojas' }),
      notificacion(2, { tipo: 'INGRESO_MANUAL', titulo: 'Ingreso manual: Beto Paz' }),
    ])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(flujoSse().respuesta))
    const user = userEvent.setup()

    render(<MemoryRouter><CampanaNotificaciones roles={['CONTROL']} /></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: 'Notificaciones: 2 sin leer' }))
    // Los incidentes de la Épica 4 tienen su etiqueta.
    expect(screen.getByText(/^Expulsión ·/)).toBeInTheDocument()
    expect(screen.getByText(/^Ingreso manual ·/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar notificación: Expulsión: Ana Rojas' }))

    expect(service.quitarNotificacion).toHaveBeenCalledWith(1)
    expect(screen.queryByText('Expulsión: Ana Rojas')).not.toBeInTheDocument()
    expect(screen.getByText('Ingreso manual: Beto Paz')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notificaciones: 1 sin leer' })).toBeInTheDocument()
  })

  it('limpia todas las notificaciones', async () => {
    vi.mocked(service.listarNotificaciones).mockResolvedValue([notificacion(1), notificacion(2, { leida: true })])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(flujoSse().respuesta))
    const user = userEvent.setup()

    render(<MemoryRouter><CampanaNotificaciones roles={['DOCENTE']} /></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: 'Notificaciones: 1 sin leer' }))
    await user.click(screen.getByRole('button', { name: /Limpiar todas/ }))

    expect(service.limpiarNotificaciones).toHaveBeenCalled()
    expect(screen.getByText('No hay reportes por ahora.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Limpiar todas/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument()
  })
})

describe('AvisoFotoReportada', () => {
  it('avisa al personal que la foto está reportada, con el motivo y quién la reportó', () => {
    render(<AvisoFotoReportada reporte={{
      motivo: 'NO_SE_PARECE', detalle: 'Tiene barba', reportadoPor: 'Carla Méndez', reportadoEn: '2026-10-22T09:30:00',
    }} />)

    const aviso = screen.getByRole('status')
    expect(aviso).toHaveTextContent('Foto reportada · pendiente de revisión del admin')
    expect(aviso).toHaveTextContent('La persona no se parece a la foto: Tiene barba')
    expect(aviso).toHaveTextContent('por Carla Méndez')
  })
})
