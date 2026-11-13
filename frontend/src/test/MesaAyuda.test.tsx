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

  it('bandeja del ADMIN: lista a la izquierda, detalle con la respuesta y se recarga al atender', async () => {
    const consulta = {
      id: 5, nombre: 'Ana Pérez', correo: 'ana@est.umss.edu', tipo: 'ACTIVACION', mensaje: 'No me llega el código.',
      origen: 'LOGIN' as const, rol: null, estado: 'PENDIENTE' as const, creadaEn: '2026-11-10T10:00:00',
      respuesta: null, atendidaPor: null, atendidaEn: null,
    }
    const otra = { ...consulta, id: 6, nombre: 'Luis Rojas', correo: 'luis@umss.edu', tipo: 'QR', mensaje: 'Necesito un QR nuevo.', origen: 'PANEL' as const, rol: 'DOCENTE' }
    vi.mocked(listarSolicitudesAyuda).mockResolvedValue({ contenido: [consulta, otra], pagina: 0, tamano: 20, totalRegistros: 2, totalPaginas: 1 })
    vi.mocked(atenderSolicitudAyuda).mockResolvedValue({ ...consulta, estado: 'ATENDIDA' })
    const onCambio = vi.fn()
    render(<BandejaAyuda onCambio={onCambio} />)
    const detalle = await screen.findByRole('complementary', { name: 'Detalle de la consulta' })
    // La primera queda elegida: su detalle a la derecha.
    expect(within(detalle).getByText('No me llega el código.')).toBeInTheDocument()
    expect(within(detalle).getByText(/Desde el ingreso/)).toBeInTheDocument()
    // Buscar filtra la lista.
    fireEvent.change(screen.getByLabelText('Buscar consulta'), { target: { value: 'qr nuevo' } })
    expect(screen.queryByRole('button', { name: /Ana Pérez/ })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Buscar consulta'), { target: { value: '' } })
    fireEvent.change(within(detalle).getByLabelText('Tu respuesta'), { target: { value: 'Ya te reenviamos el código.' } })
    fireEvent.click(within(detalle).getByRole('button', { name: 'Responder y marcar atendida' }))
    await waitFor(() => expect(atenderSolicitudAyuda).toHaveBeenCalledWith(5, 'Ya te reenviamos el código.'))
    await waitFor(() => expect(onCambio).toHaveBeenCalled())
    expect(listarSolicitudesAyuda).toHaveBeenCalledWith('PENDIENTE', 0, 20)
  })
})

describe('Mesa de ayuda en el menú', () => {
  it('el ADMIN la tiene en el menú lateral (solo escritorio, con contador); el docente no', async () => {
    const { navItemsFor } = await import('../components/navigation/navItems')
    const admin = navItemsFor(['ADMIN'])
    const ayuda = admin.find((i) => i.label === 'Mesa de ayuda')
    expect(ayuda).toMatchObject({ to: '/dashboard/mesa-ayuda', soloEscritorio: true, contador: 'ayuda' })
    expect(admin.map((i) => i.label).indexOf('Mesa de ayuda')).toBe(admin.map((i) => i.label).indexOf('Usuarios') + 1)
    expect(navItemsFor(['DOCENTE']).some((i) => i.label === 'Mesa de ayuda')).toBe(false)
  })
})
