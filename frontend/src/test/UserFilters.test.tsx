import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UserFilters from '../components/users/UserFilters'
import UserListContent from '../components/users/UserListContent'
import type { UserFilterParams, UserListItem } from '../types/user'

const initialFilters: UserFilterParams = { search: '', rol: '', estado: '' }
const users: UserListItem[] = [
  { id: 1, nombre: 'Ana', apellidos: 'Rojas', email: 'ana@example.com', ci: '123', rol: 'ADMIN', estado: 'activo' },
]

function renderFilters(onChange = vi.fn()) {
  render(<UserFilters value={initialFilters} onChange={onChange} />)
  return onChange
}

describe('UserFilters', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderiza labels, placeholder y opciones exactas sin SIN_ROL', () => {
    renderFilters()

    expect(screen.getByLabelText('Buscar usuarios')).toHaveAttribute('placeholder', 'Buscar por nombre, email o DNI...')
    expect(screen.getByLabelText('Rol')).toHaveValue('')
    expect(screen.getByLabelText('Estado')).toHaveValue('')
    expect(within(screen.getByLabelText('Rol')).getByText('Todos los roles')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Rol')).getByText('ADMIN')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Rol')).getByText('DOCENTE')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Rol')).getByText('CONTROL')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Rol')).queryByText('SIN_ROL')).not.toBeInTheDocument()
    expect(within(screen.getByLabelText('Estado')).getByText('Todos los estados')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Estado')).getByText('Activo')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Estado')).getByText('Inactivo')).toBeInTheDocument()
  })

  it('conserva el input inmediato y emite search después de 300 ms', () => {
    vi.useFakeTimers()
    const onFiltersChange = vi.fn()
    render(<UserListContent users={users} onFiltersChange={onFiltersChange} />)
    const search = screen.getByLabelText('Buscar usuarios')

    fireEvent.change(search, { target: { value: 'Ána' } })
    expect(search).toHaveValue('Ána')
    expect(onFiltersChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(299))
    expect(onFiltersChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onFiltersChange).toHaveBeenLastCalledWith({ search: 'Ána', rol: '', estado: '' })
  })

  it('cancela el timeout anterior y combina filtros conservando acentos', () => {
    vi.useFakeTimers()
    const onFiltersChange = vi.fn()
    render(<UserListContent users={users} onFiltersChange={onFiltersChange} />)
    const search = screen.getByLabelText('Buscar usuarios')
    const role = screen.getByLabelText('Rol')
    const state = screen.getByLabelText('Estado')

    fireEvent.change(search, { target: { value: 'Á' } })
    act(() => vi.advanceTimersByTime(200))
    fireEvent.change(search, { target: { value: 'Ána' } })
    fireEvent.change(role, { target: { value: 'DOCENTE' } })
    expect(onFiltersChange).toHaveBeenLastCalledWith({ search: '', rol: 'DOCENTE', estado: '' })
    act(() => vi.advanceTimersByTime(99))
    expect(onFiltersChange).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(201))
    expect(onFiltersChange).toHaveBeenLastCalledWith({ search: 'Ána', rol: 'DOCENTE', estado: '' })
    fireEvent.change(state, { target: { value: 'inactivo' } })
    expect(onFiltersChange).toHaveBeenLastCalledWith({ search: 'Ána', rol: 'DOCENTE', estado: 'inactivo' })
  })

  it('conserva la búsqueda confirmada al cambiar el rol mientras otra búsqueda espera', () => {
    vi.useFakeTimers()
    const onFiltersChange = vi.fn()
    const { container } = render(<UserListContent users={users} onFiltersChange={onFiltersChange} />)
    const search = screen.getByLabelText('Buscar usuarios')
    const role = screen.getByLabelText('Rol')
    const filtersRegion = screen.getByRole('region', { name: 'Filtros de usuarios' })

    expect(filtersRegion.closest('.mb-5, .sm\\:mb-6') || filtersRegion.closest('[class*="mb-5"]')).toBeTruthy()
    expect(filtersRegion.closest('[class*="rounded-xl"]')).toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'Ána' } })
    act(() => vi.advanceTimersByTime(300))
    expect(onFiltersChange).toHaveBeenCalledTimes(1)
    expect(onFiltersChange).toHaveBeenLastCalledWith({ search: 'Ána', rol: '', estado: '' })

    fireEvent.change(search, { target: { value: 'Andrea' } })
    fireEvent.change(role, { target: { value: 'DOCENTE' } })
    expect(onFiltersChange).toHaveBeenCalledTimes(2)
    expect(onFiltersChange).toHaveBeenLastCalledWith({ search: 'Ána', rol: 'DOCENTE', estado: '' })
    act(() => vi.advanceTimersByTime(299))
    expect(onFiltersChange).toHaveBeenCalledTimes(2)
    act(() => vi.advanceTimersByTime(1))
    expect(onFiltersChange).toHaveBeenCalledTimes(3)
    expect(onFiltersChange).toHaveBeenLastCalledWith({ search: 'Andrea', rol: 'DOCENTE', estado: '' })
    expect(container.querySelector('[name="search"]')).toHaveValue('Andrea')
  })

  it('emite estado inmediatamente y no filtra usuarios localmente', () => {
    vi.useFakeTimers()
    const onFiltersChange = vi.fn()
    render(<UserListContent users={users} onFiltersChange={onFiltersChange} />)

    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'activo' } })
    expect(onFiltersChange).toHaveBeenCalledWith({ search: '', rol: '', estado: 'activo' })
    expect(screen.getAllByText('Ana Rojas')).toHaveLength(2)
  })

  it('cancela el callback pendiente al desmontarse', () => {
    vi.useFakeTimers()
    const onFiltersChange = vi.fn()
    const { unmount } = render(<UserListContent users={users} onFiltersChange={onFiltersChange} />)

    fireEvent.change(screen.getByLabelText('Buscar usuarios'), { target: { value: 'Ana' } })
    unmount()
    act(() => vi.advanceTimersByTime(300))
    expect(onFiltersChange).not.toHaveBeenCalled()
  })

  it('expone el grid responsive esperado', () => {
    const { container } = render(<UserFilters value={initialFilters} onChange={vi.fn()} />)
    expect(container.querySelector('.grid-cols-1')).toBeInTheDocument()
    expect(container.querySelector('.sm\\:grid-cols-2')).toBeInTheDocument()
    expect(container.querySelector('.lg\\:grid-cols-\\[minmax\\(0\\,1fr\\)_12rem_12rem\\]')).toBeInTheDocument()
  })
})
