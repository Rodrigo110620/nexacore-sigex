import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import UserListContent from '../components/users/UserListContent'
import type { UserListItem } from '../types/user'

const users: UserListItem[] = [
  {
    id: 12,
    nombre: 'Ana',
    apellidos: 'Rojas Vidal',
    email: 'ana.rojas@umss.edu.bo',
    rol: 'ADMIN',
    estado: 'activo',
  },
  {
    id: 13,
    nombre: 'Bruno',
    apellidos: 'Flores Paz',
    email: 'bruno.flores@umss.edu.bo',
    rol: 'SIN_ROL',
    estado: 'inactivo',
  },
  {
    id: 14,
    nombre: 'Carla',
    apellidos: 'Mendez Soliz',
    email: 'carla.mendez@umss.edu.bo',
    rol: 'DOCENTE',
    estado: 'activo',
  },
  {
    id: 15,
    nombre: 'Diego',
    apellidos: 'Choque Rios',
    email: 'diego.choque@umss.edu.bo',
    rol: 'CONTROL',
    estado: 'inactivo',
  },
]

describe('UserListContent', () => {
  it('renderiza avatar, nombre completo e ID en la misma celda, sin columna ID', () => {
    render(<UserListContent users={users} />)

    const table = screen.getByRole('table', { name: 'Lista de usuarios del sistema' })
    const userCell = within(table).getByRole('row', { name: /Ana Rojas Vidal ID: 12/ }).querySelector('th')
    expect(userCell).toBeInTheDocument()
    expect(userCell).toHaveTextContent('Ana Rojas Vidal')
    expect(userCell).toHaveTextContent('ID: 12')
    expect(userCell?.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    expect(within(table).queryByRole('columnheader', { name: 'ID' })).not.toBeInTheDocument()
    expect(within(table).getByText('ana.rojas@umss.edu.bo')).toBeInTheDocument()
    expect(within(table).getByText('ADMIN')).toBeInTheDocument()
    expect(within(table).getByText('DOCENTE')).toBeInTheDocument()
    expect(within(table).getByText('CONTROL')).toBeInTheDocument()
    expect(within(table).getByText('SIN ROL')).toBeInTheDocument()
    expect(within(table).queryByText('SIN_ROL')).not.toBeInTheDocument()
    expect(within(table).getAllByText('Activo')).toHaveLength(2)
    expect(within(table).getAllByText('Inactivo')).toHaveLength(2)
  })

  it('muestra el estado vacio sin filas cuando no hay usuarios', () => {
    render(<UserListContent users={[]} />)

    expect(screen.getByText('Sin usuarios')).toBeInTheDocument()
    expect(screen.queryByRole('row')).not.toBeInTheDocument()
  })

  it('mantiene deshabilitadas las acciones pendientes por fila', () => {
    render(<UserListContent users={users} />)

    const table = screen.getByRole('table', { name: 'Lista de usuarios del sistema' })

    const editButtons = within(table).getAllByRole('button', { name: /Editar a/ })
    const blockButtons = within(table).getAllByRole('button', { name: /Bloquear a/ })
    expect(editButtons).toHaveLength(users.length)
    expect(blockButtons).toHaveLength(users.length)
    users.forEach((user) => {
      const fullName = `${user.nombre} ${user.apellidos}`
      expect(within(table).getByRole('button', { name: `Editar a ${fullName}, no disponible` })).toBeDisabled()
      expect(within(table).getByRole('button', { name: `Bloquear a ${fullName}, no disponible` })).toBeDisabled()
    })
  })

  it('muestra carga sin presentar prematuramente el estado vacío', () => {
    render(<UserListContent users={[]} loading />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando usuarios...')
    expect(screen.queryByText('Sin usuarios')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Buscar usuarios')).toBeDisabled()
  })

  it('muestra el error 403 sin ofrecer reintento', () => {
    render(
      <UserListContent
        users={[]}
        error={{ kind: 'forbidden', message: 'No tienes permisos para consultar los usuarios.' }}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Acceso restringido')
    expect(screen.getByRole('alert')).toHaveTextContent('No tienes permisos para consultar los usuarios.')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Buscar usuarios')).toBeDisabled()
  })

  it('permite reintentar después de un error de red', () => {
    const onRetry = vi.fn()
    render(
      <UserListContent
        users={[]}
        error={{ kind: 'network', message: 'No se pudo conectar con el servidor.' }}
        onRetry={onRetry}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('distingue el vacío producido por filtros', () => {
    render(<UserListContent users={[]} />)

    fireEvent.change(screen.getByLabelText('Buscar usuarios'), { target: { value: 'nadie' } })
    expect(screen.getByText('No se encontraron usuarios con los filtros seleccionados.')).toBeInTheDocument()
  })
})
