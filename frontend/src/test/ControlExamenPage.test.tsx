import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import ControlExamenPage from '../pages/Control/ControlExamenPage'
import {
  listarEstudiantesExamen,
  obtenerResumenExamen,
  type EstudianteAsignado,
} from '../services/controlExamenService'

vi.mock('../services/controlExamenService')
vi.mock('../services/ingresosRecientesService', () => ({ ingresosRecientes: vi.fn().mockResolvedValue({ total: 0, ingresos: [] }) }))
vi.mock('../services/examenService', () => ({ listarExamenes: vi.fn().mockResolvedValue([]) }))
vi.mock('../services/ambienteService', () => ({ listarAmbientes: vi.fn().mockResolvedValue([]) }))

const estudiante = (
  id: number,
  nombre: string,
  estado: EstudianteAsignado['estado'],
  ingresado = false,
): EstudianteAsignado => ({
  idEstudiante: id,
  nombre,
  apellidos: 'Flores',
  codigoSis: `20210400${id}`,
  ci: `748921${id}`,
  carrera: 'Ingeniería de Sistemas',
  estado,
  motivoInhabilitacion: estado === 'DESHABILITADO' ? 'Deuda en biblioteca' : null,
  ingresado,
})

const paginaInicial = {
  contenido: [estudiante(1, 'María', 'HABILITADO', true), estudiante(2, 'Luis', 'DESHABILITADO')],
  pagina: 0,
  tamano: 5,
  totalRegistros: 45,
  totalPaginas: 5,
}

function paginaDemorada() {
  let responder!: (pagina: typeof paginaInicial) => void
  const promesa = new Promise<typeof paginaInicial>((resolve) => { responder = resolve })
  return { promesa, responder }
}

function Destino() {
  const { pathname, search } = useLocation()
  return <p>Destino {pathname + search}</p>
}

/** La lista completa está en la pestaña «Estudiantes del examen» (la inicial es «Ingresos recientes»). */
async function abrirTabla() {
  fireEvent.click(await screen.findByRole('tab', { name: 'Estudiantes del examen' }))
  return screen.findByRole('table')
}

function renderPage(conCambioDeExamen = false) {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard/control/7']}>
        {conCambioDeExamen && <Link to="/dashboard/control/8">Cambiar de examen</Link>}
        <Routes>
          <Route path="/dashboard/control/:idExamen" element={<ControlExamenPage />} />
          <Route path="/dashboard/control" element={<Destino />} />
          <Route path="/dashboard/control/:idExamen/identificar" element={<Destino />} />
          <Route path="/dashboard/control/:idExamen/informacion" element={<Destino />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('ControlExamenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'token-control')
    localStorage.setItem('roles', JSON.stringify(['CONTROL']))
    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 45, habilitados: 42, noHabilitados: 3, ingresados: 10, incidencias: 2 })
    vi.mocked(listarEstudiantesExamen).mockResolvedValue(paginaInicial)
  })

  it('oculta acciones del examen cuando el servidor niega el acceso', async () => {
    vi.mocked(listarEstudiantesExamen).mockRejectedValue({ isAxiosError: true, response: { status: 403 } })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para acceder a este examen')
    expect(screen.queryByRole('link', { name: /Iniciar control de ingreso/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Control' })).toHaveAttribute('href', '/dashboard/control')
  })

  it('DASH-03: avisa cuando un aula está llena o casi llena, con su ocupación', async () => {
    vi.mocked(obtenerResumenExamen).mockResolvedValue({ total: 45, habilitados: 42, noHabilitados: 3, ingresados: 40, incidencias: 0, aulas: [
      { idAmbiente: 4, nombre: '608', capacidad: 40, ocupados: 40, estado: 'LLENA' },
      { idAmbiente: 59, nombre: '690A', capacidad: 20, ocupados: 18, estado: 'CASI_LLENA' },
      { idAmbiente: 60, nombre: '690B', capacidad: 20, ocupados: 2, estado: 'LIBRE' },
    ] })
    renderPage()
    expect(await screen.findByText('Aula 608 llena')).toBeInTheDocument()
    expect(screen.getByText(/40\/40 estudiantes dentro/)).toBeInTheDocument()
    expect(screen.getByText('Aula 690A casi llena')).toBeInTheDocument()
    expect(screen.queryByText(/Aula 690B/)).not.toBeInTheDocument()
  })

  it('muestra las estadísticas del resumen y las filas con su estado', async () => {
    renderPage()
    expect(screen.queryByRole('table')).not.toBeInTheDocument() // oculta hasta «Ver todos»
    const filas = within(await abrirTabla()).getAllByRole('row')

    // DASH-01: habilitados, ingresados, ausentes (habilitados que aún no ingresan) e incidencias.
    const habilitados = within(await screen.findByRole('region', { name: 'Habilitados' }))
    expect(habilitados.getByText('42')).toBeInTheDocument()
    expect(habilitados.getByText('de 45 asignados · 3 con observación')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Ingresados' })).getByText('24 % de habilitados')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Ausentes' })).getByText('32')).toBeInTheDocument()
    const incidencias = within(screen.getByRole('region', { name: 'Incidencias' }))
    expect(incidencias.getByText('2')).toBeInTheDocument()
    expect(incidencias.getByRole('link', { name: /Ver detalle/ })).toHaveAttribute('href', '/dashboard/control/7/informacion')
    expect(within(filas[1]).getByText('María Flores')).toBeInTheDocument()
    expect(within(filas[1]).getByText('Ingresó')).toBeInTheDocument()
    expect(within(filas[2]).getByText('No ingresó')).toBeInTheDocument()
    expect(within(filas[2]).getByText('7489212')).toBeInTheDocument()
    expect(listarEstudiantesExamen).toHaveBeenCalledWith(7, 'TODOS', 0, 5)
    expect(screen.getByRole('link', { name: /Iniciar control de ingreso/i })).toHaveAttribute('href', '/dashboard/control/7/identificar')
  })

  it('permite volver al listado de Control', async () => {
    renderPage()
    fireEvent.click(screen.getAllByRole('link', { name: 'Control' })[0])
    expect(await screen.findByText('Destino /dashboard/control')).toBeInTheDocument()
  })

  it('abre Información de ingreso desde el acceso del protocolo', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('link', { name: 'Información de ingreso' }))
    expect(await screen.findByText('Destino /dashboard/control/7/informacion')).toBeInTheDocument()
  })

  it('al cambiar de pestaña pide ese estado desde la página 0', async () => {
    renderPage()
    await abrirTabla()
    fireEvent.click(screen.getByRole('button', { name: 'Ir a la página 2' }))
    await waitFor(() => expect(listarEstudiantesExamen).toHaveBeenLastCalledWith(7, 'TODOS', 1, 5))
    await screen.findByRole('table')

    const filtros = within(screen.getByRole('group', { name: 'Filtrar por estado' }))
    fireEvent.click(await filtros.findByRole('button', { name: 'No habilitados (3)' }))

    expect(filtros.getByRole('button', { name: 'No habilitados (3)' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(listarEstudiantesExamen).toHaveBeenLastCalledWith(7, 'NO_HABILITADOS', 0, 5))
  })

  it('inutiliza las filas y los controles de la página previa hasta recibir la nueva', async () => {
    localStorage.setItem('roles', JSON.stringify(['ADMIN']))
    const servicio = vi.mocked(listarEstudiantesExamen)
    const demorada = paginaDemorada()
    servicio.mockImplementation((_id, _estado, pagina) => pagina === 0 ? Promise.resolve(paginaInicial) : demorada.promesa)
    const usuario = userEvent.setup()
    renderPage()

    const tabla = await abrirTabla()
    const expulsar = within(tabla).getByRole('button', { name: 'Expulsar' })
    const reasignar = within(tabla).getByRole('button', { name: 'Reasignar' })
    const siguiente = screen.getByRole('button', { name: 'Página siguiente' })
    await act(async () => usuario.click(siguiente))
    expect(servicio).toHaveBeenLastCalledWith(7, 'TODOS', 1, 5)
    const bloque = tabla.closest('[inert]')
    expect(bloque).not.toBeNull()
    expect(bloque).toContainElement(expulsar)
    expect(bloque).toContainElement(reasignar)
    expect(bloque).toContainElement(siguiente)
    expect(bloque).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Cargando estudiantes…')).toHaveAttribute('aria-live', 'polite')

    await act(async () => demorada.responder({ ...paginaInicial, pagina: 1, contenido: [estudiante(3, 'Elena', 'HABILITADO', true)] }))
    expect(screen.getByRole('button', { name: 'Ir a la página 2' })).toHaveAttribute('aria-current', 'page')
    expect(within(tabla).getByText('Elena Flores')).toBeInTheDocument()
    expect(within(tabla).queryByText('María Flores')).not.toBeInTheDocument()
    expect(tabla.closest('[inert]')).toBeNull()
  })

  it('reinicia el filtro e ignora respuestas demoradas de la página y el filtro anteriores', async () => {
    const servicio = vi.mocked(listarEstudiantesExamen)
    const segunda = paginaDemorada()
    const habilitados = paginaDemorada()
    servicio.mockImplementation((_id, estado, pagina) => {
      if (pagina === 1) return segunda.promesa
      if (estado === 'HABILITADOS') return habilitados.promesa
      return Promise.resolve(paginaInicial)
    })
    renderPage()
    await abrirTabla()
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    const filtros = within(screen.getByRole('group', { name: 'Filtrar por estado' }))
    fireEvent.click(filtros.getByRole('button', { name: 'Habilitados (42)' }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    fireEvent.click(filtros.getByRole('button', { name: 'Todos (45)' }))
    await screen.findByRole('table')
    expect(servicio).toHaveBeenLastCalledWith(7, 'TODOS', 0, 5)
    await act(async () => {
      segunda.responder({ ...paginaInicial, pagina: 1, contenido: [] })
      habilitados.responder({ ...paginaInicial, contenido: [] })
    })
    expect(within(screen.getByRole('table')).getByText('María Flores')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a la página 1' })).toHaveAttribute('aria-current', 'page')
  })

  describe.each([
    ['Expulsar', 'Expulsar estudiante'],
    ['Reasignar', 'Reasignar ambiente por contingencia'],
  ])('modal de %s', (accion, titulo) => {
    it.each(['página', 'filtro', 'examen', 'tamaño'])('cierra y descarta la selección al cambiar de %s', async (cambio) => {
      const ancho = Object.getOwnPropertyDescriptor(window, 'innerWidth')!
      const dialogo = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
        configurable: true, value(this: HTMLDialogElement) { this.open = true },
      })
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
      try {
        localStorage.setItem('roles', JSON.stringify(['ADMIN']))
        const servicio = vi.mocked(listarEstudiantesExamen)
        const segunda = { ...paginaInicial, pagina: 1, contenido: [estudiante(6, 'Elena', 'HABILITADO', true)] }
        servicio.mockImplementation((_id, _estado, pagina) => Promise.resolve(pagina === 1 ? segunda : paginaInicial))
        renderPage(cambio === 'examen')
        await abrirTabla()
        fireEvent.click(screen.getByRole('button', { name: 'Ir a la página 2' }))
        const tabla = await screen.findByRole('table')
        expect(within(tabla).getByText('Elena Flores')).toBeInTheDocument()
        fireEvent.click(within(tabla).getByRole('button', { name: accion }))
        expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument()

        const demorada = paginaDemorada()
        servicio.mockReturnValue(demorada.promesa)
        if (cambio === 'filtro') fireEvent.click(within(screen.getByRole('group', { name: 'Filtrar por estado' })).getByRole('button', { name: 'Habilitados (42)' }))
        else if (cambio === 'examen') fireEvent.click(screen.getByRole('link', { name: 'Cambiar de examen' }))
        else {
          Object.defineProperty(window, 'innerWidth', { configurable: true, value: cambio === 'tamaño' ? 390 : 1400 })
          fireEvent(window, new Event('resize'))
        }
        const pagina = cambio === 'examen' ? 1 : 0
        const tamano = cambio === 'tamaño' ? 3 : 5
        expect(servicio).toHaveBeenLastCalledWith(cambio === 'examen' ? 8 : 7, cambio === 'filtro' ? 'HABILITADOS' : 'TODOS', pagina, tamano)
        expect(screen.queryByRole('heading', { name: titulo })).not.toBeInTheDocument()
        await act(async () => demorada.responder({ ...paginaInicial, pagina, tamano }))
        expect(within(await screen.findByRole('table')).getByText('María Flores')).toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: titulo })).not.toBeInTheDocument()

        if (cambio === 'página') {
          servicio.mockResolvedValue(segunda)
          fireEvent.click(screen.getByRole('button', { name: 'Ir a la página 2' }))
          await waitFor(() => expect(within(screen.getByRole('table')).getByText('Elena Flores')).toBeInTheDocument())
          expect(screen.queryByRole('heading', { name: titulo })).not.toBeInTheDocument()
        }
      } finally {
        Object.defineProperty(window, 'innerWidth', ancho)
        if (dialogo) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', dialogo)
        else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
      }
    })
  })

  it('quita la página previa al fallar y anuncia la carga al reintentar hasta el estado vacío', async () => {
    const servicio = vi.mocked(listarEstudiantesExamen)
    const reintento = paginaDemorada()
    servicio.mockImplementation((_id, _estado, pagina) => {
      if (pagina === 0) return Promise.resolve(paginaInicial)
      return Promise.reject(new Error('Servicio no disponible'))
    })
    renderPage()
    await abrirTabla()
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la lista')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    // Si la lista se vacía, el hook vuelve a la primera página.
    servicio.mockImplementation(() => reintento.promesa)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByText('Cargando estudiantes…')).toHaveAttribute('aria-live', 'polite')
    await act(async () => reintento.responder({ ...paginaInicial, contenido: [], totalRegistros: 0, totalPaginas: 0 }))
    expect(await screen.findByText('No hay estudiantes asignados a este examen')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Paginación de estudiantes asignados' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Estudiantes del examen' })).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('el ojo lleva a la identificación con ?codigo= del estudiante', async () => {
    renderPage()
    const tabla = await abrirTabla()

    fireEvent.click(within(tabla).getByRole('link', { name: 'Identificar a Luis Flores' }))

    expect(await screen.findByText('Destino /dashboard/control/7/identificar?codigo=202104002')).toBeInTheDocument()
  })

  it('solicita tres estudiantes por página en móvil', async () => {
    const anterior = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    try {
      renderPage()
      await abrirTabla()
      await waitFor(() => expect(listarEstudiantesExamen).toHaveBeenCalledWith(7, 'TODOS', 0, 3))
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: anterior })
    }
  })
})
