import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import UserPagination from '../components/users/UserPagination'

describe('UserPagination', () => {
  it('muestra el rango y navega usando índices base 0', () => {
    const onPageChange = vi.fn()
    render(
      <UserPagination
        page={0}
        pageSize={10}
        totalRecords={25}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    )

    expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 1–10 de 25 usuarios')
    expect(screen.getByLabelText('Página 1 de 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a la página 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Ir a la página 3' }))
    expect(onPageChange).toHaveBeenCalledWith(2)

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('limita el último rango y deshabilita avanzar desde la última página', () => {
    const onPageChange = vi.fn()
    render(
      <UserPagination
        page={2}
        pageSize={10}
        totalRecords={25}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    )

    expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 21–25 de 25 usuarios')
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('no renderiza controles cuando no existen resultados', () => {
    render(
      <UserPagination
        page={0}
        pageSize={10}
        totalRecords={0}
        totalPages={0}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('navigation', { name: 'Paginación de usuarios' })).not.toBeInTheDocument()
  })

  it('no renderiza controles cuando todos los resultados caben en una página', () => {
    render(
      <UserPagination
        page={0}
        pageSize={5}
        totalRecords={4}
        totalPages={1}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('navigation', { name: 'Paginación de usuarios' })).not.toBeInTheDocument()
  })

  it('bloquea ambos controles mientras una navegación está en curso', () => {
    render(
      <UserPagination
        page={1}
        pageSize={10}
        totalRecords={30}
        totalPages={3}
        onPageChange={vi.fn()}
        disabled
      />,
    )

    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Ir a la página 2' })).toBeDisabled()
  })

  it('limita los botones y usa puntos suspensivos cuando existen muchas páginas', () => {
    const onPageChange = vi.fn()
    render(
      <UserPagination
        page={9}
        pageSize={10}
        totalRecords={200}
        totalPages={20}
        onPageChange={onPageChange}
      />,
    )

    const pageButtons = screen.getAllByRole('button', { name: /Ir a la página/ })
    expect(pageButtons).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Ir a la página 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a la página 9' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a la página 10' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Ir a la página 11' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir a la página 20' })).toBeInTheDocument()
    expect(screen.getAllByText('…')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'Ir a la página 20' }))
    expect(onPageChange).toHaveBeenCalledWith(19)
  })

  it('normaliza una página fuera de rango y deshabilita el límite correspondiente', () => {
    const { rerender } = render(
      <UserPagination
        page={-4}
        pageSize={10}
        totalRecords={30}
        totalPages={3}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Ir a la página 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()

    rerender(
      <UserPagination
        page={99}
        pageSize={10}
        totalRecords={30}
        totalPages={3}
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Ir a la página 3' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()
  })
})
