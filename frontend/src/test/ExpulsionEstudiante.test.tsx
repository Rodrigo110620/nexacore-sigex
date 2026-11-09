import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import EstudiantesExamenLista from '../components/control/EstudiantesExamenLista'
import api from '../services/api'
import { EVENTO_CAMBIO } from '../services/notificacionService'
import type { ExamenDto } from '../services/examenService'

vi.mock('../services/api')
const estudiante = {
  idEstudiante: 10, nombre: 'Lucía', apellidos: 'Aguilar', codigoSis: '2026001',
  ci: '9000101', carrera: 'Sistemas', estado: 'HABILITADO' as const,
  motivoInhabilitacion: null, ingresado: true, expulsado: false,
}
const examen: ExamenDto = {
  idExamen: 20, idParalelo: 1, asignatura: 'Ingeniería', docente: 'Ana Rojas',
  fecha: '2026-10-31', horaInicio: '14:00:00', duracionMinutos: 90,
  idAmbiente: 1, ambienteNombre: 'Aula 201', estado: 'en-curso', normasGenerales: [], normasParticulares: [],
}
function montar(rol = 'ADMIN', ingresado = true, expulsado = false) {
  localStorage.setItem('token', 'test')
  localStorage.setItem('roles', JSON.stringify([rol]))
  return render(<AuthProvider><MemoryRouter><EstudiantesExamenLista idExamen={20} examen="Ingeniería · Aula 201" datosExamen={examen} estudiantes={[{ ...estudiante, ingresado, expulsado }]} /></MemoryRouter></AuthProvider>)
}
beforeEach(() => {
  vi.resetAllMocks()
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
})

it.each([
  { rol: 'ADMIN', ingresado: true, expulsado: false, visible: true },
  { rol: 'CONTROL', ingresado: true, expulsado: false, visible: false },
  // El docente del examen también expulsa (el backend verifica que el examen sea suyo); el control no.
  { rol: 'DOCENTE', ingresado: true, expulsado: false, visible: true },
  { rol: 'ADMIN', ingresado: false, expulsado: false, visible: false },
  { rol: 'ADMIN', ingresado: true, expulsado: true, visible: false },
])('comparte elegibilidad en tabla y tarjetas: $rol, ingresado=$ingresado, expulsado=$expulsado', ({ rol, ingresado, expulsado, visible }) => {
  const { container } = montar(rol, ingresado, expulsado)
  for (const selector of ['table', 'ul']) {
    const vista = within(container.querySelector(selector)!)
    expect(vista.queryAllByRole('button', { name: 'Expulsar' })).toHaveLength(visible ? 1 : 0)
    // Identificar es parte de registrar el control: el ADMIN lo supervisa y no ve el ojo.
    if (rol === 'ADMIN') expect(vista.queryByRole('link', { name: 'Identificar a Lucía Aguilar' })).not.toBeInTheDocument()
    else expect(vista.getByRole('link', { name: 'Identificar a Lucía Aguilar' })).toHaveAttribute('href', '/dashboard/control/20/identificar?codigo=2026001')
  }
})

it.each([0, 1])('abre y cancela desde la vista %s; un motivo vacío no envía', (indice) => {
  montar()
  fireEvent.click(screen.getAllByRole('button', { name: 'Expulsar' })[indice])
  const modal = screen.getByRole('dialog', { name: 'Expulsar estudiante' })
  // Sección 24: el estudiante en una línea bajo el título, «Motivo *», motivos frecuentes y el aviso.
  expect(within(modal).getByText('Lucía Aguilar · 2026001 · Ingeniería')).toBeInTheDocument()
  expect(within(modal).getByText('Entre 10 y 200 caracteres, con palabras que expliquen la expulsión.')).toBeInTheDocument()
  expect(within(modal).getByRole('group', { name: 'Motivos frecuentes' })).toBeInTheDocument()
  expect(within(modal).getByText(/La expulsión queda registrada con la fecha y hora del servidor/)).toBeInTheDocument()
  fireEvent.change(within(modal).getByRole('textbox'), { target: { value: '   ' } })
  expect(within(modal).getByRole('button', { name: 'Expulsar' })).toBeDisabled()
  fireEvent.submit(modal.querySelector('form')!)
  expect(api.post).not.toHaveBeenCalled()
  fireEvent.click(within(modal).getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it.each([0, 1])('vista %s: valida junto al motivo y limita también el texto pegado a 200', (indice) => {
  montar()
  fireEvent.click(screen.getAllByRole('button', { name: 'Expulsar' })[indice])
  const modal = screen.getByRole('dialog')
  const campo = within(modal).getByRole('textbox')
  for (const motivo of ['Copia ora', 'Drrtgrdsgdgdfggfdffd', 'Uso de celularrrrr']) {
    fireEvent.change(campo, { target: { value: motivo } })
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveAccessibleDescription(/motivo/i)
    expect(within(modal).getByRole('button', { name: 'Expulsar' })).toBeDisabled()
    fireEvent.submit(modal.querySelector('form')!)
  }
  expect(api.post).not.toHaveBeenCalled()
  fireEvent.change(campo, { target: { value: 'Uso de ' + 'a '.repeat(97) + 'qrs' } })
  expect(campo).not.toHaveAttribute('maxlength') // El límite se aplica después de normalizar, también al pegar.
  expect((campo as HTMLTextAreaElement).value).toHaveLength(200)
  expect(within(modal).getByText('200/200')).toBeInTheDocument()
  fireEvent.change(campo, { target: { value: 'Copia oral' } })
  expect(campo).toHaveAttribute('aria-invalid', 'false')
  expect(within(modal).getByRole('button', { name: 'Expulsar' })).toBeEnabled()
})

it.each([0, 1])('vista %s: pegar texto normaliza antes de limitar y permite los cuatro motivos legítimos', async (indice) => {
  const user = userEvent.setup()
  montar()
  fireEvent.click(screen.getAllByRole('button', { name: 'Expulsar' })[indice])
  const campo = screen.getByRole('textbox')
  const limite = 'Uso de celular durante el examen para copiar respuestas de física'
  await user.click(campo)
  await user.paste(limite.replace(/ /g, '   '))
  expect(campo).toHaveValue(limite)
  expect(screen.getByText(`${limite.length}/200`)).toBeInTheDocument()
  for (const motivo of ['Uso de WhatsApp durante el examen', 'Consulta de archivo PDF', 'Uso de ChatGPT durante el examen', 'Uso de código en C durante el examen']) {
    fireEvent.change(campo, { target: { value: motivo } })
    expect(campo).toHaveAttribute('aria-invalid', 'false')
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Expulsar' })).toBeEnabled()
  }
  fireEvent.change(campo, { target: { value: 'Uso   de celular' } })
  expect(campo).toHaveValue('Uso de celular')
  expect(api.post).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar expulsión' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('IMP-14: conserva siglas y aula desde el campo hasta la confirmación oficial', async () => {
  const motivo = 'Uso de CI y SIS en aula 690B'
  vi.mocked(api.post).mockResolvedValueOnce({ data: {
    idExpulsion: 90, idEstudiante: 10, idExamen: 20, motivo,
    idResponsable: 7, responsable: 'Ana Rojas', fechaHora: '2026-10-24T14:00:00',
  } })
  montar()
  fireEvent.click(screen.getAllByRole('button', { name: 'Expulsar' })[0])
  const modal = screen.getByRole('dialog')
  const campo = within(modal).getByRole('textbox')
  fireEvent.change(campo, { target: { value: 'USO DE CI Y SIS EN AULA 690B' } })
  fireEvent.blur(campo)
  expect(campo).toHaveValue(motivo)
  expect(campo).toHaveAttribute('aria-invalid', 'false')
  expect(within(modal).getByText(`${motivo.length}/200`)).toBeInTheDocument()
  fireEvent.submit(modal.querySelector('form')!)
  expect(await screen.findByRole('status')).toHaveTextContent('Expulsión registrada correctamente.')
  expect(api.post).toHaveBeenCalledWith('/control-ingresos/expulsar', { idEstudiante: 10, idExamen: 20, motivo })
  expect(campo).toHaveValue(motivo)
})

it.each([0, 1])('vista %s: carga, doble envío, error HTTP y 2xx sin confirmar', async (indice) => {
  let rechazar!: (error: unknown) => void
  vi.mocked(api.post).mockImplementationOnce(() => new Promise((_, reject) => { rechazar = reject }))
  montar()
  fireEvent.click(screen.getAllByRole('button', { name: 'Expulsar' })[indice])
  const modal = screen.getByRole('dialog')
  const campo = within(modal).getByRole('textbox')
  fireEvent.change(campo, { target: { value: 'Uso de celular' } })
  fireEvent.submit(modal.querySelector('form')!)
  fireEvent.submit(modal.querySelector('form')!)
  expect(api.post).toHaveBeenCalledTimes(1)
  expect(within(modal).getByRole('button', { name: 'Enviando…' })).toBeDisabled()
  expect(within(modal).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  expect(within(modal).getByRole('button', { name: 'Cerrar expulsión' })).toBeDisabled()
  expect(campo).toBeDisabled()
  await act(async () => rechazar({ response: { status: 403, data: { resultado: 'EXPULSADO', mensaje: 'Sin permiso' } } }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin permiso')
  expect(campo).toHaveValue('Uso de celular')
  expect(screen.queryByText('EXPULSADO')).not.toBeInTheDocument()
  vi.mocked(api.post).mockResolvedValueOnce({ data: null })
  fireEvent.click(within(modal).getByRole('button', { name: 'Expulsar' }))
  expect(await screen.findByRole('status')).toHaveTextContent('sin registro verificable')
  expect(within(modal).getByRole('button', { name: 'Expulsar' })).toBeDisabled()
  fireEvent.submit(modal.querySelector('form')!)
  expect(api.post).toHaveBeenCalledTimes(2)
  expect(screen.getAllByText('INGRESÓ')).toHaveLength(2)
})

it.each([0, 1])('vista %s: confirma auditoría válida y conserva el bloqueo hasta cerrar', async (indice) => {
  const registro = { idExpulsion: 90, idEstudiante: 10, idExamen: 20, motivo: 'Uso de celular',
    idResponsable: 7, responsable: 'Ana Rojas', fechaHora: '2026-10-24T14:00:00' }
  vi.mocked(api.post).mockResolvedValueOnce({ data: registro })
  montar()
  fireEvent.click(screen.getAllByRole('button', { name: 'Expulsar' })[indice])
  const modal = screen.getByRole('dialog')
  fireEvent.change(within(modal).getByRole('textbox'), { target: { value: 'Uso de celular' } })
  fireEvent.submit(modal.querySelector('form')!)
  expect(await screen.findByRole('status')).toHaveTextContent('Expulsión registrada correctamente.')
  fireEvent.click(within(modal).getByText('Ver registro de expulsión'))
  expect(within(modal).getByText('Ana Rojas')).toBeVisible()
  expect(within(modal).getByText('24/10/2026 14:00:00')).toBeVisible()
  expect(within(modal).getByRole('textbox')).toBeDisabled()
  fireEvent.submit(modal.querySelector('form')!)
  expect(api.post).toHaveBeenCalledTimes(1)
  fireEvent.click(within(modal).getByRole('button', { name: 'Cerrar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('una respuesta válida de otro estudiante no confirma ni solicita recarga', async () => {
  const avisos = vi.fn()
  window.addEventListener(EVENTO_CAMBIO, avisos)
  try {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { idExpulsion: 90, idEstudiante: 11,
      idExamen: 20, motivo: 'Uso de celular', idResponsable: 7, responsable: 'Ana', fechaHora: '2026-10-24T14:00:00' } })
    montar()
    fireEvent.click(screen.getAllByRole('button', { name: 'Expulsar' })[0])
    const modal = screen.getByRole('dialog')
    fireEvent.change(within(modal).getByRole('textbox'), { target: { value: 'Uso de celular' } })
    fireEvent.submit(modal.querySelector('form')!)
    expect(await screen.findByRole('status')).toHaveTextContent('sin registro verificable')
    expect(avisos).not.toHaveBeenCalled()
  } finally {
    window.removeEventListener(EVENTO_CAMBIO, avisos)
  }
})


it.each([['ADMIN', true], ['DOCENTE', true], ['CONTROL', false]])('reasignar: %s = %s', (rol, visible) => {
  const { container } = montar(rol)
  for (const selector of ['table', 'ul']) {
    expect(within(container.querySelector(selector)!).queryAllByRole('button', { name: 'Reasignar' })).toHaveLength(visible ? 1 : 0)
  }
})

it('sección 24: un motivo frecuente llena el campo y permite expulsar', () => {
  montar()
  fireEvent.click(screen.getAllByRole('button', { name: 'Expulsar' })[0])
  const modal = screen.getByRole('dialog', { name: 'Expulsar estudiante' })
  const frecuentes = within(modal).getByRole('group', { name: 'Motivos frecuentes' })
  expect(within(frecuentes).getAllByRole('button').map((b) => b.textContent)).toEqual(['Uso de celular', 'Copia o plagio', 'Suplantación de identidad', 'Conducta inapropiada'])
  fireEvent.click(within(frecuentes).getByRole('button', { name: 'Copia o plagio' }))
  expect(within(modal).getByRole('textbox')).toHaveValue('Copia o plagio')
  expect(within(frecuentes).getByRole('button', { name: 'Copia o plagio' })).toHaveAttribute('aria-pressed', 'true')
  expect(within(modal).getByRole('button', { name: 'Expulsar' })).toBeEnabled()
})
