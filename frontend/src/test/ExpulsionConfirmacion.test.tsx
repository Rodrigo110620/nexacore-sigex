import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import EstudiantesExamenSeccion from '../components/control/EstudiantesExamenSeccion'
import useEstudiantesExamen from '../hooks/useEstudiantesExamen'
import { emitirCambioLocal } from '../services/notificacionService'
import type { ExpulsionResponse } from '../services/expulsionService'
import api from '../services/api'

vi.mock('../services/api')
const registro: ExpulsionResponse = {
  idExpulsion: 90, idEstudiante: 10, idExamen: 20, motivo: 'Uso de celular',
  idResponsable: 7, responsable: 'Ana Rojas', fechaHora: '2026-10-24T14:00:00.123456',
}
function Pantalla() {
  const datos = useEstudiantesExamen(20)
  return <EstudiantesExamenSeccion idExamen={20} {...datos} />
}
beforeEach(() => {
  vi.resetAllMocks()
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  localStorage.setItem('token', 'test')
  localStorage.setItem('roles', JSON.stringify(['ADMIN']))
})

it.each([0, 1])('vista %s: POST confirmado recarga GET y solo entonces muestra EXPULSADO', async (indice) => {
  let confirmado = false
  let nuevaSesion = false
  let lecturas = 0
  let devolverConsulta!: (respuesta: { data: ExpulsionResponse[] }) => void
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url.endsWith('/expulsiones')) {
      lecturas++
      if (confirmado && !nuevaSesion) return new Promise((resolve) => { devolverConsulta = resolve })
      return { data: [] }
    }
    if (url.endsWith('/resumen')) {
      return { data: { total: 1, habilitados: 1, noHabilitados: 0, ingresados: nuevaSesion ? 0 : 1 } }
    }
    return { data: { contenido: [{ idEstudiante: 10, nombre: 'Lucía', apellidos: 'Aguilar',
      codigoSis: '2026001', ci: '9000101', carrera: 'Sistemas', estado: 'HABILITADO',
      motivoInhabilitacion: null, ingresado: !nuevaSesion }],
      pagina: 0, tamano: 5, totalRegistros: 1, totalPaginas: 1 } }
  })
  vi.mocked(api.post).mockImplementation(async () => {
    confirmado = true
    return { data: registro }
  })
  render(<AuthProvider><MemoryRouter><Pantalla /></MemoryRouter></AuthProvider>)
  fireEvent.click((await screen.findAllByRole('button', { name: 'Expulsar' }))[indice])
  const modal = screen.getByRole('dialog')
  fireEvent.change(within(modal).getByRole('textbox'), { target: { value: 'USO DE CELULAR' } })
  fireEvent.submit(modal.querySelector('form')!)
  fireEvent.submit(modal.querySelector('form')!)
  expect(await screen.findByRole('status')).toHaveTextContent('Expulsión registrada correctamente.')
  expect(within(modal).getByRole('textbox')).toHaveValue('Uso de celular')
  expect(api.post).toHaveBeenCalledWith('/control-ingresos/expulsar', { idEstudiante: 10, idExamen: 20, motivo: 'Uso de celular' })
  await waitFor(() => expect(lecturas).toBe(2))
  expect(screen.queryByText('EXPULSADO')).not.toBeInTheDocument()
  expect(screen.getAllByText('INGRESÓ')).toHaveLength(2)
  await act(async () => devolverConsulta({ data: [registro] }))
  expect(await screen.findAllByText('EXPULSADO')).toHaveLength(2)
  expect(screen.queryByRole('button', { name: 'Expulsar' })).not.toBeInTheDocument()
  expect(api.post).toHaveBeenCalledTimes(1)
  fireEvent.click(within(modal).getByRole('button', { name: 'Cerrar' }))
  nuevaSesion = true
  act(() => emitirCambioLocal({ tipo: 'EXAMEN', idExamen: 20, idEstudiante: null }))
  expect(await screen.findAllByText('NO INGRESÓ')).toHaveLength(2)
  expect(screen.queryByText('EXPULSADO')).not.toBeInTheDocument()
  expect(screen.queryByText('Ver registro de expulsión')).not.toBeInTheDocument()
})
