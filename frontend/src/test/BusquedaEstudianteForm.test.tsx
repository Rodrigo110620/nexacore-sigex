import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BusquedaEstudianteForm from '../components/control/BusquedaEstudianteForm'
import MecanismoSelector from '../components/control/MecanismoSelector'

/** Enviar el form equivale a presionar Enter en el input. */
function escribirYEnviar(input: HTMLElement, valor: string) {
  fireEvent.change(input, { target: { value: valor } })
  fireEvent.submit(input.closest('form') as HTMLFormElement)
}

describe('BusquedaEstudianteForm', () => {
  it('deshabilita Buscar con el input vacío y busca sin los espacios de los extremos', () => {
    const onBuscar = vi.fn()
    render(<BusquedaEstudianteForm tipo="codigo" onBuscar={onBuscar} />)
    const input = screen.getByLabelText('Ingresa el Código Universitario:')
    const buscar = screen.getByRole('button', { name: 'Buscar' })

    expect(buscar).toBeDisabled()
    escribirYEnviar(input, '   ')
    expect(buscar).toBeDisabled()
    expect(onBuscar).not.toHaveBeenCalled()

    escribirYEnviar(input, ' 201904725 ')
    expect(buscar).toBeEnabled()
    expect(onBuscar).toHaveBeenCalledWith('201904725')
  })

  it('cambia la etiqueta según el mecanismo y no busca mientras carga', () => {
    const onBuscar = vi.fn()
    render(<BusquedaEstudianteForm tipo="ci" buscando onBuscar={onBuscar} />)

    escribirYEnviar(screen.getByLabelText('Ingresa el Carnet / CI:'), '7845123')
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeDisabled()
    expect(onBuscar).not.toHaveBeenCalled()
  })
})

describe('MecanismoSelector', () => {
  it('marca la opción activa, deja QR deshabilitado y cambia de mecanismo', () => {
    const onChange = vi.fn()
    render(<MecanismoSelector value="codigo" onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'QR' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cód. Univ' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('● ACTIVO')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Carnet / CI' }))
    expect(onChange).toHaveBeenCalledWith('ci')
  })
})
