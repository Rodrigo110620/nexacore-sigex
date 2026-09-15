import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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

    const userCell = screen.getByRole('row', { name: /Ana Rojas Vidal ID: 12/ }).querySelector('th')
    expect(userCell).toBeInTheDocument()
    expect(userCell).toHaveTextContent('Ana Rojas Vidal')
    expect(userCell).toHaveTextContent('ID: 12')
    expect(userCell?.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'ID' })).not.toBeInTheDocument()
    expect(screen.getByText('ana.rojas@umss.edu.bo')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
    expect(screen.getByText('DOCENTE')).toBeInTheDocument()
    expect(screen.getByText('CONTROL')).toBeInTheDocument()
    expect(screen.getByText('SIN ROL')).toBeInTheDocument()
    expect(screen.queryByText('SIN_ROL')).not.toBeInTheDocument()
    expect(screen.getAllByText('Activo')).toHaveLength(2)
    expect(screen.getAllByText('Inactivo')).toHaveLength(2)
  })

  it('muestra el estado vacio sin filas cuando no hay usuarios', () => {
    render(<UserListContent users={[]} />)

    expect(screen.getByText('Sin usuarios')).toBeInTheDocument()
    expect(screen.queryByRole('row')).not.toBeInTheDocument()
  })

  it('mantiene deshabilitadas las acciones pendientes', () => {
    render(<UserListContent users={users} />)

    expect(screen.getByRole('button', { name: /Registrar usuario/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Exportar usuarios/ })).toBeDisabled()

    const editButtons = screen.getAllByRole('button', { name: /Editar a/ })
    const blockButtons = screen.getAllByRole('button', { name: /Bloquear a/ })
    expect(editButtons).toHaveLength(users.length)
    expect(blockButtons).toHaveLength(users.length)
    users.forEach((user) => {
      const fullName = `${user.nombre} ${user.apellidos}`
      expect(screen.getByRole('button', { name: `Editar a ${fullName}, no disponible` })).toBeDisabled()
      expect(screen.getByRole('button', { name: `Bloquear a ${fullName}, no disponible` })).toBeDisabled()
    })
  })
})