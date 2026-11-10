import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import PanelLayout from '../components/layout/PanelLayout'

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ roles: ['ADMIN'], permisos: null, nombre: 'Sofía', logout: vi.fn() }) }))
vi.mock('../components/layout/PanelTopBar', () => ({ default: () => null }))
vi.mock('../components/layout/Footer', () => ({ default: () => null }))
vi.mock('../services/mesaAyudaService', () => ({ contarPendientesAyuda: vi.fn().mockResolvedValue(0) }))
vi.mock('../hooks/useEnVivo', () => ({ default: () => undefined }))

beforeEach(() => localStorage.setItem('sigex.menuContraido', '1'))
const montar = (hijos: ReactNode = null) => render(<MemoryRouter initialEntries={['/dashboard/inicio']}><PanelLayout>{hijos}</PanelLayout></MemoryRouter>)

it('contraído, Configuración despliega el menú un momento con sus nombres y se vuelve a contraer al elegir', () => {
  montar()
  const menu = screen.getByRole('complementary', { name: 'Menú principal' })
  expect(within(menu).queryByText('Inicio')).toHaveClass('sr-only')
  fireEvent.click(within(menu).getByRole('button', { name: 'Configuración' }))
  // Desplegado: nombres visibles y Configuración abierta con su primera opción enfocada.
  expect(within(menu).getByText('Inicio')).not.toHaveClass('sr-only')
  expect(within(menu).getByRole('button', { name: 'Configuración' })).toHaveAttribute('aria-expanded', 'true')
  expect(within(menu).getByRole('link', { name: 'Roles y permisos' })).toHaveFocus()
  fireEvent.click(within(menu).getByRole('link', { name: 'Historial' }))
  expect(within(menu).getByText('Inicio')).toHaveClass('sr-only')
})

it('desplegado, un clic fuera o Escape lo vuelve a contraer', () => {
  montar(<p>contenido</p>)
  const menu = screen.getByRole('complementary', { name: 'Menú principal' })
  fireEvent.click(within(menu).getByRole('button', { name: 'Configuración' }))
  fireEvent.mouseDown(screen.getByText('contenido'))
  expect(within(menu).getByText('Inicio')).toHaveClass('sr-only')
  fireEvent.click(within(menu).getByRole('button', { name: 'Configuración' }))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(within(menu).getByText('Inicio')).toHaveClass('sr-only')
})
