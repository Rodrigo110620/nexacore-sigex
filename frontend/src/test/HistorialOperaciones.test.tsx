import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HistorialOperaciones from '../components/configuracion/HistorialOperaciones'
import { listarHistorial, obtenerHistorial } from '../services/historialOperacionService'
import { emitirCambioLocal } from '../services/notificacionService'

vi.mock('../services/examenService', () => ({
  listarExamenes: vi.fn().mockResolvedValue([
    { idExamen: 4, idParalelo: 1, asignatura: 'Base de Datos I', grupo: 'G1', docente: 'Juan Pérez', idDocente: 7, fecha: '2026-11-10', horaInicio: '12:15:00' },
  ]),
}))

vi.mock('../services/historialOperacionService', () => ({
  listarHistorial: vi.fn(),
  obtenerHistorial: vi.fn(),
  listarAutores: vi.fn().mockResolvedValue([
    { idUsuario: 1, nombre: 'Carla Méndez', roles: 'ADMIN' },
    { idUsuario: 7, nombre: 'Juan Pérez', roles: 'DOCENTE' },
  ]),
}))

const pagina = {
  contenido: [
    {
      id: 2, fechaHora: '2026-11-09T14:05:44', idUsuario: 1,
      usuario: 'Carla Méndez', rolUsuario: 'ADMIN', email: 'carla@umss.edu.bo',
      modulo: 'Exámenes', operacion: 'Reprogramar', accion: 'EXAMEN_REPROGRAMADO',
      detalle: 'Reprogramó el examen para el 11/11/2026 a las 06:45', objetivo: 'Base de Datos I · G2', motivo: 'Fecha cambiada',
      diferencias: [
        { campo: 'Fecha', antes: '07/11/2026', despues: '11/11/2026' },
        { campo: 'Aula', antes: '607', despues: '692A' },
      ],
      examen: [
        { campo: 'Fecha', valor: '11/11/2026' }, { campo: 'Horario', valor: '06:45 – 08:15 (90 min)' },
        { campo: 'Aula', valor: '692A' }, { campo: 'Docente', valor: 'Juan Pérez Quiroga' },
      ],
      cambios: { idExamen: 2 },
    },
    {
      id: 1, fechaHora: '2026-11-09T13:00:00', idUsuario: 1,
      usuario: 'Carla Méndez', rolUsuario: 'ADMIN', email: 'carla@umss.edu.bo',
      modulo: 'Roles', operacion: 'Editar', accion: 'ROL_EDITADO',
      detalle: 'Cambió sus permisos: ahora tiene 2 permisos', objetivo: 'Rol AUXILIAR', motivo: null,
      diferencias: [
        { campo: 'Agregado', antes: null, despues: 'Exportar actas y asistencia' },
        { campo: 'Quitado', antes: 'Ver estudiantes', despues: null },
      ],
      examen: [],
      cambios: { nombre: 'AUXILIAR' },
    },
  ],
  pagina: 0, tamano: 8, totalRegistros: 10, totalPaginas: 2,
}

describe('Historial de operaciones del ADMIN', () => {
  beforeEach(() => {
    vi.mocked(listarHistorial).mockReset().mockResolvedValue(pagina)
    vi.mocked(obtenerHistorial).mockReset().mockResolvedValue({ blob: new Blob(['%PDF'], { type: 'application/pdf' }), nombre: 'historial-operaciones.pdf' })
  })

  it('muestra a qué afectó, el resumen, el motivo y los cambios legibles (sin JSON)', async () => {
    render(<HistorialOperaciones />)

    expect(await screen.findByRole('heading', { name: 'Historial de operaciones' })).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar usuario o detalle')).toBeInTheDocument()
    expect(await screen.findByText('Mostrando 1–8 de 10 operaciones')).toBeInTheDocument()

    const detalle = screen.getByRole('complementary', { name: 'Detalle de la operación' })
    expect(within(detalle).getByText('Reprogramar')).toBeInTheDocument()
    expect(within(detalle).getByText('Carla Méndez')).toBeInTheDocument()
    expect(within(detalle).getByText('Base de Datos I · G2')).toBeInTheDocument()
    expect(within(detalle).getByText('Reprogramó el examen para el 11/11/2026 a las 06:45')).toBeInTheDocument()
    expect(within(detalle).getByText('Fecha cambiada')).toBeInTheDocument()
    // Qué cambió: la fecha de antes y la nueva (la nueva también sale en el bloque del examen).
    expect(within(detalle).getByText('07/11/2026')).toBeInTheDocument()
    expect(within(detalle).getAllByText('11/11/2026')).toHaveLength(2)
    expect(detalle).not.toHaveTextContent('{')
    // Contexto del examen: cuándo empieza y termina y de qué docente es; y el rol de quien lo hizo.
    expect(within(detalle).getByText('06:45 – 08:15 (90 min)')).toBeInTheDocument()
    expect(within(detalle).getByText('Juan Pérez Quiroga')).toBeInTheDocument()
    expect(within(detalle).getByText('Administrador')).toBeInTheDocument()

    // Al elegir otra fila, su detalle: permiso agregado y quitado.
    fireEvent.click(screen.getByRole('row', { name: /Rol AUXILIAR/ }))
    expect(within(detalle).getByText('Exportar actas y asistencia')).toBeInTheDocument()
    expect(within(detalle).getByText('Ver estudiantes')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Operación'), { target: { value: 'Activar' } })
    await waitFor(() => expect(listarHistorial).toHaveBeenLastCalledWith(
      expect.objectContaining({ operacion: 'Activar' }), 0,
    ))
  })

  it('en celular el detalle se abre como hoja al tocar una operación y se cierra', async () => {
    render(<HistorialOperaciones />)
    await screen.findByText('Mostrando 1–8 de 10 operaciones')
    fireEvent.click(screen.getAllByRole('button', { name: /Base de Datos I · G2/ })[0])
    const hoja = screen.getByRole('dialog', { name: 'Detalle de la operación' })
    expect(within(hoja).getByText('Fecha cambiada')).toBeInTheDocument()
    fireEvent.click(within(hoja).getByRole('button', { name: 'Cerrar el detalle' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cambia de página conservando los filtros', async () => {
    render(<HistorialOperaciones />)
    await screen.findByText('Mostrando 1–8 de 10 operaciones')
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    await waitFor(() => expect(listarHistorial).toHaveBeenLastCalledWith(expect.any(Object), 1))
  })

  it('descarga en PDF con los filtros activos (vista previa como el resto de exportaciones)', async () => {
    render(<HistorialOperaciones />)
    await screen.findByText('Mostrando 1–8 de 10 operaciones')
    fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'Roles' } })
    fireEvent.click(screen.getByRole('button', { name: 'Exportar el historial en PDF' }))
    // Primero «¿Qué quieres descargar?», que parte de lo filtrado en pantalla y dice cuántas entran.
    const dialogo = await screen.findByRole('dialog', { name: '¿Qué quieres descargar?' })
    expect(await within(dialogo).findByText(/Se descargarán/)).toBeInTheDocument()
    expect(within(dialogo).getByText(/módulo Roles/)).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Expulsiones' }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Descargar PDF' }))
    await waitFor(() => expect(obtenerHistorial).toHaveBeenCalledWith(expect.objectContaining({ modulo: 'Roles', tipo: 'EXPULSIONES' }), 'pdf'))
    expect(obtenerHistorial).not.toHaveBeenCalledWith(expect.anything(), 'xlsx')
  })

  it('se actualiza en vivo cuando se registra una operación nueva', async () => {
    render(<HistorialOperaciones />)
    await screen.findByText('Mostrando 1–8 de 10 operaciones')
    const antes = vi.mocked(listarHistorial).mock.calls.length
    emitirCambioLocal({ tipo: 'AUDITORIA', idExamen: null, idEstudiante: null })
    await waitFor(() => expect(vi.mocked(listarHistorial).mock.calls.length).toBeGreaterThan(antes))
  })
})

describe('Filtrar y descargar el historial por quién lo hizo y por rango', () => {
  it('«Realizado por» y los rangos rápidos cambian lo que se consulta', async () => {
    vi.mocked(listarHistorial).mockResolvedValue(pagina)
    render(<HistorialOperaciones />)
    const quien = await screen.findByLabelText('Realizado por')
    await waitFor(() => expect(within(quien).getByRole('option', { name: 'Juan Pérez · DOCENTE' })).toBeInTheDocument())
    fireEvent.change(quien, { target: { value: '7' } })
    await waitFor(() => expect(vi.mocked(listarHistorial)).toHaveBeenLastCalledWith(expect.objectContaining({ usuario: '7' }), 0))

    fireEvent.click(screen.getByRole('button', { name: 'Todo' }))
    await waitFor(() => expect(vi.mocked(listarHistorial)).toHaveBeenLastCalledWith(expect.objectContaining({ usuario: '7', desde: '', hasta: '' }), 0))
    expect(screen.getByRole('button', { name: 'Todo' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    await waitFor(() => expect(vi.mocked(listarHistorial)).toHaveBeenLastCalledWith(expect.objectContaining({ usuario: '' }), 0))
  })
})

describe('Descargar lo ocurrido en los exámenes de un docente', () => {
  it('elegir docente limita los exámenes y se manda a la descarga', async () => {
    vi.mocked(listarHistorial).mockResolvedValue(pagina)
    vi.mocked(obtenerHistorial).mockResolvedValue({ blob: new Blob(['%PDF'], { type: 'application/pdf' }), nombre: 'h.pdf' })
    render(<HistorialOperaciones />)
    fireEvent.click(await screen.findByRole('button', { name: 'Exportar el historial en PDF' }))
    const dialogo = await screen.findByRole('dialog')
    const docente = within(dialogo).getByLabelText('Filtrar por docente')
    await waitFor(() => expect(within(docente).getByRole('option', { name: 'Juan Pérez' })).toBeInTheDocument())
    fireEvent.change(docente, { target: { value: '7' } })
    const examen = within(dialogo).getByLabelText('Filtrar por examen')
    expect(within(examen).getByRole('option', { name: 'Base de Datos I · G1 · 10/11/2026' })).toBeInTheDocument()
    fireEvent.change(examen, { target: { value: '4' } })
    await waitFor(() => expect(vi.mocked(listarHistorial)).toHaveBeenLastCalledWith(expect.objectContaining({ docente: '7', examen: '4' }), 0, 1))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Descargar PDF' }))
    await waitFor(() => expect(obtenerHistorial).toHaveBeenCalledWith(expect.objectContaining({ docente: '7', examen: '4' }), 'pdf'))
  })
})
