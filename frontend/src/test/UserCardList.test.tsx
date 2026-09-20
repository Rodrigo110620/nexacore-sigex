import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import UserCardList from '../components/users/UserCardList'
import UserListContent from '../components/users/UserListContent'
import { getUserAvatarPalette } from '../components/users/userAvatar.utils'
import type { UserListItem } from '../types/user'

const users: UserListItem[] = [
  { id: 12, nombre: 'Ana', apellidos: 'Rojas Vidal', email: 'ana.rojas@umss.edu.bo', ci: '6512340', rol: 'ADMIN', estado: 'activo' },
  { id: 13, nombre: 'Bruno', apellidos: 'Flores Paz', email: 'bruno.flores@umss.edu.bo', ci: '5566778', rol: 'SIN_ROL', estado: 'inactivo' },
  { id: 14, nombre: 'Carla', apellidos: 'Mendez Soliz', email: 'carla.mendez@umss.edu.bo', ci: '3322110', rol: 'DOCENTE', estado: 'activo' },
  { id: 15, nombre: 'Diego', apellidos: 'Choque Rios', email: 'diego.choque@umss.edu.bo', ci: '4433221', rol: 'CONTROL', estado: 'inactivo' },
]

describe('UserCardList', () => {
  it('muestra el contador, una tarjeta por usuario y todos sus datos', () => {
    render(<UserCardList users={users} />)

    const list = screen.getByRole('list', { name: '4 usuarios visibles' })
    expect(screen.getByText('4 visibles')).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
    users.forEach((user) => {
      const fullName = `${user.nombre} ${user.apellidos}`
      const card = within(list).getByRole('article', { name: fullName })
      const initials = `${user.nombre.charAt(0)}${user.apellidos.charAt(0)}`.toUpperCase()
      const avatar = within(card).getByText(initials)
      expect(avatar).toHaveAttribute('aria-hidden', 'true')
      const heading = within(card).getByRole('heading', { name: fullName })
      expect(heading).not.toHaveClass('truncate')
      expect(heading).toHaveClass('break-words')
      expect(card).toHaveTextContent(fullName)
      expect(card).toHaveTextContent(`ID: ${user.id}`)
      expect(card).toHaveTextContent(user.email)
      expect(card.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
    })
    expect(within(list).getByText('ADMIN')).toBeInTheDocument()
    expect(within(list).getByText('DOCENTE')).toBeInTheDocument()
    expect(within(list).getByText('CONTROL')).toBeInTheDocument()
    expect(within(list).getByText('SIN ROL')).toBeInTheDocument()
    expect(within(list).getAllByText('Activo')).toHaveLength(2)
    expect(within(list).getAllByText('Inactivo')).toHaveLength(2)
    expect(within(list).queryByRole('table')).not.toBeInTheDocument()
  })

  it('muestra el contador singular para un usuario', () => {
    render(<UserCardList users={[users[0]]} />)

    expect(screen.getByText('1 visible')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '1 usuario visible' })).toBeInTheDocument()
  })

  it('mantiene una paleta determinista por usuario', () => {
    const { container } = render(<UserCardList users={[users[0]]} />)
    const avatar = container.querySelector('[aria-hidden="true"]')
    expect(avatar).toHaveClass(...getUserAvatarPalette(users[0]).split(' '))
  })

  it('habilita editar cuando hay callback y mantiene bloquear deshabilitado', () => {
    const onEditClick = vi.fn()
    render(<UserCardList users={users} onEditClick={onEditClick} />)

    const list = screen.getByRole('list', { name: '4 usuarios visibles' })
    expect(within(list).getAllByRole('button', { name: /^Editar a/ })).toHaveLength(4)
    expect(within(list).getAllByRole('button', { name: /Bloquear a/ })).toHaveLength(4)
    users.forEach((user) => {
      const fullName = `${user.nombre} ${user.apellidos}`
      expect(screen.getByRole('button', { name: `Editar a ${fullName}` })).toBeEnabled()
      expect(screen.getByRole('button', { name: `Bloquear a ${fullName}, no disponible` })).toBeDisabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Editar a Ana Rojas Vidal' }))
    expect(onEditClick).toHaveBeenCalledWith(users[0])
  })

  it('mantiene editar deshabilitado si no hay callback', () => {
    render(<UserCardList users={users} />)

    users.forEach((user) => {
      const fullName = `${user.nombre} ${user.apellidos}`
      expect(screen.getByRole('button', { name: `Editar a ${fullName}, no disponible` })).toBeDisabled()
    })
  })

  it('usa variantes responsive y una sola instancia de EmptyState', () => {
    const { container } = render(<UserListContent users={users} />)
    expect(container.querySelector('[class*="min-[960px]:hidden"]')).toBeInTheDocument()
    expect(container.querySelector('.hidden[class*="min-[960px]:block"]')).toBeInTheDocument()

    render(<UserListContent users={[]} />)
    expect(screen.getAllByText('Sin usuarios')).toHaveLength(1)
  })
})
