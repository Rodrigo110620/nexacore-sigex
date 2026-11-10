import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HistorialOperaciones from '../components/configuracion/HistorialOperaciones'
import { exportarHistorial, listarHistorial } from '../services/historialOperacionService'

vi.mock('../services/historialOperacionService', () => ({
  listarHistorial: vi.fn(),
  exportarHistorial: vi.fn(),
}))

const pagina = {
  contenido: [
    {
      id: 2, fechaHora: '2026-11-09T14:05:44', idUsuario: 1,
      usuario: 'Carla Méndez', rolUsuario: 'ADMIN', email: 'carla@umss.edu.bo',
      modulo: 'Roles', operacion: 'Editar', accion: 'ROL_EDITADO', detalle: 'AUXILIAR',
      cambios: { nombre: 'AUXILIAR', antes: '3 permisos', despues: '4 permisos', agregado: 'Exportar actas y asistencia' },
    },
    {
      id: 1, fechaHora: '2026-11-09T13:00:00', idUsuario: 1,
      usuario: 'Carla Méndez', rolUsuario: 'ADMIN', email: 'carla@umss.edu.bo',
      modulo: 'Usuarios', operacion: 'Desbloquear', accion: 'USUARIO_DESBLOQUEADO', detalle: 'Pedro Rojas',
      cambios: { nombre: 'Pedro Rojas', estado: 'activo' },
    },
  ],
  pagina: 0, tamano: 8, totalRegistros: 10, totalPaginas: 2,
}

describe('Historial de operaciones del ADMIN', () => {
  beforeEach(() => {
    vi.mocked(listarHistorial).mockReset().mockResolvedValue(pagina)
    vi.mocked(exportarHistorial).mockReset().mockResolvedValue(undefined)
  })

  it('muestra filtros, paginación y el detalle antes/después del registro seleccionado', async () => {
    render(<HistorialOperaciones />)

    expect(await screen.findByRole('heading', { name: 'Historial de operaciones' })).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar usuario o detalle')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 1–8 de 10 operaciones')).toBeInTheDocument()

    const detalle = screen.getByRole('complementary', { name: 'Detalle de la operación' })
    expect(within(detalle).getByText('Editar')).toBeInTheDocument()
    expect(within(detalle).getByText('Carla Méndez (ADMIN)')).toBeInTheDocument()
    expect(within(detalle).getByText('Roles y permisos')).toBeInTheDocument()
    expect(within(detalle).getByText('Rol AUXILIAR')).toBeInTheDocument()
    expect(within(detalle).getByText('3 permisos')).toBeInTheDocument()
    expect(within(detalle).getByText('4 permisos')).toBeInTheDocument()
    expect(within(detalle).getByText('Exportar actas y asistencia')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Operación'), { target: { value: 'Desbloquear' } })
    await waitFor(() => expect(listarHistorial).toHaveBeenLastCalledWith(
      expect.objectContaining({ operacion: 'Desbloquear' }), 0,
    ))
  })

  it('cambia de página conservando los filtros', async () => {
    render(<HistorialOperaciones />)
    await screen.findByText('Mostrando 1–8 de 10 operaciones')
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    await waitFor(() => expect(listarHistorial).toHaveBeenLastCalledWith(expect.any(Object), 1))
  })

  it('exporta con los filtros activos y avisa si la descarga falla', async () => {
    render(<HistorialOperaciones />)
    await screen.findByText('Mostrando 1–8 de 10 operaciones')
    fireEvent.change(screen.getByLabelText('Módulo'), { target: { value: 'Roles' } })
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    await waitFor(() => expect(exportarHistorial).toHaveBeenCalledWith(expect.objectContaining({ modulo: 'Roles' })))

    vi.mocked(exportarHistorial).mockRejectedValueOnce(new Error('falló'))
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo exportar el historial')
  })
})
