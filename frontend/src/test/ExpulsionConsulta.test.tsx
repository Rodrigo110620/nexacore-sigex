import { fireEvent, render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import EstudiantesExamenLista from '../components/control/EstudiantesExamenLista'
import { listarEstudiantesExamen, type EstudianteAsignado } from '../services/controlExamenService'
import { listarExpulsionesExamen } from '../services/expulsionService'
import api from '../services/api'

vi.mock('../services/api')
const estudiante: EstudianteAsignado = {
  idEstudiante: 10, nombre: 'Lucía', apellidos: 'Aguilar', codigoSis: '2026001', ci: '9000101',
  carrera: 'Sistemas', estado: 'HABILITADO', motivoInhabilitacion: null, ingresado: true, expulsado: true,
}
const pagina = { contenido: [estudiante], pagina: 0, tamano: 5, totalRegistros: 1, totalPaginas: 1 }
const registro = { idExpulsion: 90, idEstudiante: 10, idExamen: 20, motivo: 'Uso de celular',
  idResponsable: 7, responsable: 'Ana Rojas', fechaHora: '2026-10-24T14:00:00.123456' }
beforeEach(() => {
  vi.resetAllMocks()
})

it.each(['ADMIN', 'CONTROL', 'DOCENTE'])('consulta real y registro solo lectura en ambas vistas para %s', async (rol) => {
  vi.mocked(api.get).mockResolvedValueOnce({ data: pagina }).mockResolvedValueOnce({ data: [registro] })
  const datos = await listarEstudiantesExamen(20, 'TODOS', 0)
  expect(api.get).toHaveBeenCalledWith('/control-ingresos/examen/20/expulsiones')
  localStorage.setItem('token', 'test')
  localStorage.setItem('roles', JSON.stringify([rol]))
  const { container } = render(<AuthProvider><MemoryRouter><EstudiantesExamenLista idExamen={20} estudiantes={datos.contenido} /></MemoryRouter></AuthProvider>)
  for (const selector of ['table', 'ul']) {
    const vista = within(container.querySelector(selector)!)
    expect(vista.getByText('EXPULSADO')).toHaveClass('text-[#B91C1C]')
    expect(vista.queryByRole('button', { name: 'Expulsar' })).not.toBeInTheDocument()
    fireEvent.click(vista.getByText('Ver registro de expulsión'))
    expect(vista.getByText('Uso de celular')).toBeVisible()
    expect(vista.getByText('Ana Rojas')).toBeVisible()
    expect(vista.getByText('24/10/2026 14:00:00')).toBeVisible()
    expect(vista.queryByRole('textbox')).not.toBeInTheDocument()
  }
})

it('una sesión sin expulsiones elimina el estado anterior aunque estudiantes traiga un flag obsoleto', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({ data: pagina }).mockResolvedValueOnce({ data: [] })
  const datos = await listarEstudiantesExamen(20, 'TODOS', 0)
  expect(datos.contenido[0].expulsado).toBe(false)
  expect(datos.contenido[0].expulsion).toBeUndefined()
})

it('propaga un error HTTP de consulta y no presenta una lista como si no hubiera expulsiones', async () => {
  const error = { response: { status: 500 } }
  vi.mocked(api.get).mockResolvedValueOnce({ data: pagina }).mockRejectedValueOnce(error)
  await expect(listarEstudiantesExamen(20, 'TODOS', 0)).rejects.toBe(error)
})

it.each([null, {}, [{ ...registro, idExamen: 21 }], [{ ...registro, responsable: '' }],
  [{ ...registro, fechaHora: '2026-02-30T14:00:00' }], [{ ...registro, idExpulsion: 0 }]])(
  'rechaza registros no verificables %j', async (data) => {
    vi.mocked(api.get).mockResolvedValueOnce({ data })
    await expect(listarExpulsionesExamen(20)).rejects.toThrow('verificar')
  },
)
