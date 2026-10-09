import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AulasAdicionalesEditor from '../components/examenes/AulasAdicionalesEditor'
import * as ambienteService from '../services/ambienteService'
import type { AmbienteDto } from '../services/ambienteService'
import { aulasSinAforo } from '../utils/examFormUtils'

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

  it('agrega un aula libre y no ofrece la principal ni las ocupadas', () => {
    const { onChange } = renderEditor()
    fireEvent.click(screen.getByLabelText('Agregar aula'))

    expect(screen.queryByRole('option', { name: /692A/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /690B/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: '691A' }))

    expect(onChange).toHaveBeenCalledWith([2])
  })

  it('con varias aulas muestra el orden y la capacidad total', () => {
    renderEditor({ value: [2] })
    expect(screen.getByText('Capacidad total: 70 lugares')).toBeInTheDocument()
    expect(screen.getByText('principal')).toBeInTheDocument()
  })

  it('el admin registra el aforo de un aula que no lo tiene', async () => {
    vi.mocked(ambienteService.actualizarAforo).mockResolvedValue({ ...AMBIENTES[2], capacidad: 35 })
    const { onAforoGuardado } = renderEditor({ value: [3] })

    expect(screen.getByText(/Todas las aulas necesitan aforo/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Aforo:'), { target: { value: '35' } })
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
})
