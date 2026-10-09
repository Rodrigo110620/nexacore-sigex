import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AulasAdicionalesEditor from '../components/examenes/AulasAdicionalesEditor'
import * as ambienteService from '../services/ambienteService'
import type { AmbienteDto } from '../services/ambienteService'
import { aulasAdicionalesOcupadas, aulasSinAforo } from '../utils/examFormUtils'

vi.mock('../services/ambienteService')

const AMBIENTES: AmbienteDto[] = [
  { id: 1, nombre: '692A', ubicacion: 'FCyT', capacidad: 40, disponible: true },
  { id: 2, nombre: '691A', ubicacion: 'FCyT', capacidad: 30, disponible: true },
  { id: 3, nombre: 'INFLAB', ubicacion: 'FCyT', capacidad: null, disponible: true },
  { id: 4, nombre: '690B', ubicacion: 'FCyT', capacidad: 25, disponible: false },
]

function renderEditor(props: Partial<Parameters<typeof AulasAdicionalesEditor>[0]> = {}) {
  const onChange = vi.fn()
  const onAforoGuardado = vi.fn()
  const onModoRepartoChange = vi.fn()
  render(
    <AulasAdicionalesEditor
      ambientes={AMBIENTES}
      idPrincipal="1"
      value={[]}
      onChange={onChange}
      esAdmin
      onAforoGuardado={onAforoGuardado}
      modoReparto="ALFABETICO"
      onModoRepartoChange={onModoRepartoChange}
      {...props}
    />,
  )
  return { onChange, onAforoGuardado, onModoRepartoChange }
}

describe('AulasAdicionalesEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('sin aula principal no muestra nada', () => {
    renderEditor({ idPrincipal: '' })
    expect(screen.queryByText('Aulas del examen')).not.toBeInTheDocument()
  })

  it('agrega un aula libre; la principal no se ofrece y las ocupadas no se pueden elegir', () => {
    const { onChange } = renderEditor()
    fireEvent.click(screen.getByLabelText('Agregar aula'))

    expect(screen.queryByRole('option', { name: /692A/ })).not.toBeInTheDocument()
    const ocupada = screen.getByRole('option', { name: /690B/ })
    expect(ocupada).toHaveAttribute('aria-disabled', 'true')
    expect(ocupada).toHaveTextContent('Ocupada')
    fireEvent.click(ocupada)
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('option', { name: '691A' }))
    expect(onChange).toHaveBeenCalledWith([2])
  })

  it('avisa si un aula ya agregada está ocupada en el horario elegido', () => {
    renderEditor({ value: [4] })
    expect(screen.getByText('Ocupada en este horario')).toBeInTheDocument()
  })

  it('con varias aulas muestra solo los nombres en orden, sin aforos', () => {
    renderEditor({ value: [2] })
    expect(screen.getByText('692A')).toBeInTheDocument()
    expect(screen.getByText('691A')).toBeInTheDocument()
    expect(screen.getByText('principal')).toBeInTheDocument()
    expect(screen.queryByText(/Aforo \d|Capacidad total/)).not.toBeInTheDocument()
  })

  it('el admin puede editar el aforo de un aula que ya lo tiene', async () => {
    vi.mocked(ambienteService.actualizarAforo).mockResolvedValue({ ...AMBIENTES[1], capacidad: 100 })
    const { onAforoGuardado } = renderEditor({ value: [2] })

    fireEvent.click(screen.getAllByRole('button', { name: /Editar aforo/ })[1])
    const campo = screen.getByLabelText('Aforo:')
    expect(campo).toHaveValue(30)
    fireEvent.change(campo, { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar aforo' }))

    await waitFor(() => expect(ambienteService.actualizarAforo).toHaveBeenCalledWith(2, 100))
    expect(onAforoGuardado).toHaveBeenCalledWith(expect.objectContaining({ id: 2, capacidad: 100 }))
  })

  it('el admin registra el aforo de un aula que no lo tiene', async () => {
    vi.mocked(ambienteService.actualizarAforo).mockResolvedValue({ ...AMBIENTES[2], capacidad: 35 })
    const { onAforoGuardado } = renderEditor({ value: [3] })

    expect(screen.getByText(/Todas las aulas necesitan aforo/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Aforo (cuántos caben):'), { target: { value: '35' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar aforo' }))

    await waitFor(() => expect(ambienteService.actualizarAforo).toHaveBeenCalledWith(3, 35))
    expect(onAforoGuardado).toHaveBeenCalledWith(expect.objectContaining({ id: 3, capacidad: 35 }))
  })

  it('quien no es admin ve que debe pedirlo', () => {
    renderEditor({ value: [3], esAdmin: false })
    expect(screen.getByText('Pide al administrador que registre el aforo de esta aula.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar aforo' })).not.toBeInTheDocument()
  })

  it('con una sola aula no muestra aforos ni pregunta cómo repartir', () => {
    renderEditor()
    expect(screen.queryByText('¿Cómo se reparten los estudiantes?')).not.toBeInTheDocument()
    expect(screen.queryByText(/Aforo/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Capacidad total/)).not.toBeInTheDocument()
  })

  it('con varias aulas permite elegir reparto por orden de llegada', () => {
    const { onModoRepartoChange } = renderEditor({ value: [2] })
    expect(screen.getByRole('radio', { name: /Por orden alfabético/ })).toBeChecked()

    fireEvent.click(screen.getByRole('radio', { name: /Por orden de llegada/ }))

    expect(onModoRepartoChange).toHaveBeenCalledWith('LLEGADA')
  })

  it('aulasSinAforo solo exige aforo cuando hay varias aulas', () => {
    expect(aulasSinAforo(AMBIENTES, '3', [])).toEqual([])
    expect(aulasSinAforo(AMBIENTES, '3', [2])).toEqual(['INFLAB'])
  })

  it('aulasAdicionalesOcupadas devuelve las agregadas que chocan con el horario', () => {
    expect(aulasAdicionalesOcupadas(AMBIENTES, [2, 4])).toEqual(['690B'])
    expect(aulasAdicionalesOcupadas(AMBIENTES, [2])).toEqual([])
  })
})
