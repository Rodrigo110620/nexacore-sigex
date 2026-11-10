import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MesaAyudaModal from '../components/ayuda/MesaAyudaModal'
import BandejaAyuda from '../components/ayuda/BandejaAyuda'
import Header from '../components/layout/Header'
import { atenderSolicitudAyuda, enviarSolicitudAyuda, listarSolicitudesAyuda } from '../services/mesaAyudaService'

vi.mock('../services/mesaAyudaService', async (original) => ({
  ...(await original<typeof import('../services/mesaAyudaService')>()),
  enviarSolicitudAyuda: vi.fn(),
  listarSolicitudesAyuda: vi.fn(),
  atenderSolicitudAyuda: vi.fn(),
}))

/** Paso 1: tema; paso 2: «No, quiero escribir»; paso 3: el formulario. */
const irAlFormulario = (tema = 'Activar mi cuenta de estudiante') => {
  fireEvent.click(screen.getByRole('button', { name: tema }))
  fireEvent.click(screen.getByRole('button', { name: 'No, quiero escribir' }))
}
const llenar = () => {
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Pérez' } })
  fireEvent.change(screen.getByLabelText('Correo para responderte'), { target: { value: 'ana@est.umss.edu' } })
  fireEvent.change(screen.getByLabelText('¿Qué pasa?'), { target: { value: 'No me llega el código para activar mi cuenta.' } })
}

describe('Mesa de ayuda', () => {
  beforeEach(() => {
    vi.mocked(enviarSolicitudAyuda).mockReset().mockResolvedValue(undefined)
    vi.mocked(atenderSolicitudAyuda).mockReset()
    vi.mocked(listarSolicitudesAyuda).mockReset()
  })

  it('el botón del ingreso abre el asistente: tema → pasos explicados → «se resolvió»', () => {
    const onClose = vi.fn()
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: 'Mesa de Ayuda' }))
    const dialogo = screen.getByRole('dialog', { name: 'Mesa de ayuda' })
    expect(within(dialogo).getByText('¿Con qué necesitas ayuda?')).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Olvidé mi contraseña' }))
    // Paso 2: explicación, pasos numerados y el acceso directo.
    expect(within(dialogo).getByText(/sin esperar al administrador/)).toBeInTheDocument()
    expect(within(dialogo).getAllByRole('listitem').length).toBeGreaterThanOrEqual(4)
    expect(within(dialogo).getByRole('link', { name: 'Recuperar mi contraseña' })).toHaveAttribute('href', '/forgot-password')
    expect(within(dialogo).getByText('Solución').closest('li')).toHaveAttribute('aria-current', 'step')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Elegir otro tema' }))
    expect(within(dialogo).getByText('¿Con qué necesitas ayuda?')).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar la mesa de ayuda' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    render(<MesaAyudaModal open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Olvidé mi contraseña' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, gracias' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('si no se resolvió, envía la consulta con el tema elegido y explica qué pasa después', async () => {
    render(<MesaAyudaModal open onClose={vi.fn()} />)
    irAlFormulario()
    expect(screen.getByText('Consulta').closest('li')).toHaveAttribute('aria-current', 'step')
    const enviar = screen.getByRole('button', { name: 'Enviar consulta' })
    expect(enviar).toBeDisabled()
    llenar()
    fireEvent.click(enviar)
    await waitFor(() => expect(enviarSolicitudAyuda).toHaveBeenCalledWith({
      nombre: 'Ana Pérez', correo: 'ana@est.umss.edu', tipo: 'ACTIVACION',
      mensaje: 'No me llega el código para activar mi cuenta.', sitio: '',
    }))
    const hecho = await screen.findByRole('status')
    expect(hecho).toHaveTextContent('ana@est.umss.edu')
    expect(hecho).toHaveTextContent('El administrador recibe tu consulta')
  })

  it('«Otro problema» va directo a escribir; avisa si se enviaron muchas consultas seguidas', async () => {
    vi.mocked(enviarSolicitudAyuda).mockRejectedValue(new AxiosError('429', 'ERR', undefined, undefined,
      { status: 429, data: {}, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } }))
    render(<MesaAyudaModal open onClose={vi.fn()} nombreInicial="Juan Pérez" />)
    fireEvent.click(screen.getByRole('button', { name: 'Otro problema' }))
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Juan Pérez')
    llenar()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Espera unos minutos')
  })

  it('el ADMIN responde una consulta pendiente y se recarga la bandeja', async () => {
    const consulta = {
      id: 5, nombre: 'Ana Pérez', correo: 'ana@est.umss.edu', tipo: 'ACTIVACION', mensaje: 'No me llega el código.',
      origen: 'LOGIN' as const, rol: null, estado: 'PENDIENTE' as const, creadaEn: '2026-11-10T10:00:00',
      respuesta: null, atendidaPor: null, atendidaEn: null,
    }
    vi.mocked(listarSolicitudesAyuda).mockResolvedValue({ contenido: [consulta], pagina: 0, tamano: 10, totalRegistros: 1, totalPaginas: 1 })
    vi.mocked(atenderSolicitudAyuda).mockResolvedValue({ ...consulta, estado: 'ATENDIDA' })
    const onCambio = vi.fn()
    render(<BandejaAyuda onCambio={onCambio} />)
    expect(await screen.findByText('No me llega el código.')).toBeInTheDocument()
    expect(screen.getByText(/Desde el ingreso/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marcar como atendida' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Respuesta/), { target: { value: 'Ya te reenviamos el código.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Responder y marcar atendida' }))
    await waitFor(() => expect(atenderSolicitudAyuda).toHaveBeenCalledWith(5, 'Ya te reenviamos el código.'))
    await waitFor(() => expect(onCambio).toHaveBeenCalled())
    expect(listarSolicitudesAyuda).toHaveBeenCalledWith('PENDIENTE', 0)
  })
})
