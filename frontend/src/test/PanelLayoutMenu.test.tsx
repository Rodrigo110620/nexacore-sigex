import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import PanelLayout from '../components/layout/PanelLayout'

vi.mock('../services/api')
vi.mock('../components/layout/PanelTopBar', () => ({ default: () => null }))
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('token', 'test')
  localStorage.setItem('roles', JSON.stringify(['ADMIN']))
})
const montar = () => render(<AuthProvider><MemoryRouter><PanelLayout>contenido</PanelLayout></MemoryRouter></AuthProvider>)

it('el menú lateral se contrae a solo íconos y lo recuerda', () => {
  const { unmount } = montar()
  const menu = screen.getByRole('complementary', { name: 'Menú principal' })
  expect(screen.getByText('Cerrar sesión')).not.toHaveClass('sr-only')
  expect(menu).not.toHaveClass('w-[72px]')

  fireEvent.click(screen.getByRole('button', { name: 'Contraer menú' }))
  expect(menu).toHaveClass('w-[72px]')
  expect(screen.getByText('Cerrar sesión')).toHaveClass('sr-only') // el nombre sigue para lectores de pantalla
  expect(screen.getByRole('link', { name: 'Estudiantes' })).toHaveAttribute('title', 'Estudiantes')
  expect(screen.getByRole('button', { name: 'Expandir menú' })).toHaveAttribute('aria-expanded', 'false')

  unmount()
  montar() // al volver a entrar sigue contraído
  expect(screen.getByRole('complementary', { name: 'Menú principal' })).toHaveClass('w-[72px]')
  fireEvent.click(screen.getByRole('button', { name: 'Expandir menú' }))
  expect(screen.getByRole('link', { name: 'Estudiantes' })).not.toHaveAttribute('title')
})
