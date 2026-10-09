import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import FiltroDesplegable, { type OpcionDesplegable } from '../components/ui/FiltroDesplegable'

const CARRERAS: OpcionDesplegable[] = [
  { value: '1', label: 'Arquitectura', grupo: 'Facultad de Arquitectura y Ciencias del Hábitat' },
  { value: '2', label: 'Turismo', grupo: 'Facultad de Arquitectura y Ciencias del Hábitat' },
  { value: '3', label: 'Biología', grupo: 'Facultad de Ciencias y Tecnología' },
  { value: '4', label: 'Ingeniería de Sistemas', grupo: 'Facultad de Ciencias y Tecnología' },
  { value: '5', label: 'Ingeniería Informática', grupo: 'Facultad de Ciencias y Tecnología' },
  { value: '6', label: 'Física', grupo: 'Facultad de Ciencias y Tecnología' },
  { value: '7', label: 'Medicina', grupo: 'Facultad de Medicina' },
  { value: '8', label: 'Odontología', grupo: 'Facultad de Odontología' },
]

function Filtro({ opciones = CARRERAS }: { opciones?: OpcionDesplegable[] }) {
  const [value, setValue] = useState('')
  return (
    <>
      <label htmlFor="carrera">Carrera</label>
      <FiltroDesplegable id="carrera" value={value} onChange={setValue} opciones={opciones} textoTodas="Todas las carreras" />
      <output>{value || 'ninguna'}</output>
    </>
  )
}

describe('FiltroDesplegable', () => {
  it('muestra "Todas" y lista las opciones agrupadas por facultad', () => {
    render(<Filtro />)
    const boton = screen.getByLabelText('Carrera')
    expect(boton).toHaveTextContent('Todas las carreras')

    fireEvent.click(boton)
    const lista = screen.getByRole('listbox')
    expect(within(lista).getByText('Facultad de Ciencias y Tecnología')).toBeInTheDocument()
    expect(within(lista).getAllByRole('option')).toHaveLength(CARRERAS.length + 1)
  })

  it('filtra con el buscador sin importar tildes y elige con un clic', () => {
    render(<Filtro />)
    fireEvent.click(screen.getByLabelText('Carrera'))
    fireEvent.change(screen.getByPlaceholderText('Buscar…'), { target: { value: 'informatica' } })

    const opciones = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(opciones).toHaveLength(1)
    fireEvent.click(opciones[0])

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Carrera')).toHaveTextContent('Ingeniería Informática')
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('se maneja con el teclado y Escape cierra sin cambiar', () => {
    render(<Filtro />)
    const boton = screen.getByLabelText('Carrera')
    fireEvent.keyDown(boton, { key: 'ArrowDown' })
    const buscador = screen.getByPlaceholderText('Buscar…')
    fireEvent.keyDown(buscador, { key: 'ArrowDown' })
    fireEvent.keyDown(buscador, { key: 'Enter' })
    expect(screen.getByText('1')).toBeInTheDocument()

    fireEvent.keyDown(boton, { key: 'Enter' })
    fireEvent.keyDown(screen.getByPlaceholderText('Buscar…'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(boton).toHaveTextContent('Arquitectura')
  })

  it('sin coincidencias lo indica', () => {
    render(<Filtro />)
    fireEvent.click(screen.getByLabelText('Carrera'))
    fireEvent.change(screen.getByPlaceholderText('Buscar…'), { target: { value: 'zzz' } })
    expect(screen.getByText('Sin coincidencias')).toBeInTheDocument()
  })

  it('con pocas opciones no muestra buscador', () => {
    render(<Filtro opciones={CARRERAS.slice(0, 3)} />)
    fireEvent.click(screen.getByLabelText('Carrera'))
    expect(screen.queryByPlaceholderText('Buscar…')).not.toBeInTheDocument()
  })

  it('una opción deshabilitada se ve con su motivo y no se puede elegir', () => {
    render(<Filtro opciones={[{ value: '1', label: '692A', deshabilitada: 'Ocupada' }, { value: '2', label: '691A' }]} />)
    fireEvent.click(screen.getByLabelText('Carrera'))
    const ocupada = screen.getByRole('option', { name: /692A/ })

    expect(ocupada).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(ocupada)
    expect(screen.getByText('ninguna')).toBeInTheDocument()
  })
})
