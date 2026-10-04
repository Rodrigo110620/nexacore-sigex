import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ConfirmarEstadoUsuarioModal from '../components/users/ConfirmarEstadoUsuarioModal'
import type { UserListItem } from '../types/user'

const activo: UserListItem = {
  id: 12, nombre: 'Ana', apellidos: 'Rojas Vidal', email: 'ana.rojas@umss.edu.bo', ci: '6512340', rol: 'ADMIN', estado: 'activo',
}

describe('ConfirmarEstadoUsuarioModal', () => {
  it('confirma el bloqueo de una cuenta activa enviando activo=false', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<ConfirmarEstadoUsuarioModal user={activo} onCancel={vi.fn()} onConfirm={onConfirm} />)

    expect(screen.getByRole('alertdialog', { name: '¿Bloquear a este usuario?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }))
    expect(onConfirm).toHaveBeenCalledWith(false)
  })

  it('ofrece desbloquear una cuenta inactiva enviando activo=true', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<ConfirmarEstadoUsuarioModal user={{ ...activo, estado: 'inactivo' }} onCancel={vi.fn()} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }))
    expect(onConfirm).toHaveBeenCalledWith(true)
  })

  it('explica que se levanta el bloqueo temporal por intentos fallidos', () => {
    render(
      <ConfirmarEstadoUsuarioModal
        user={{ ...activo, bloqueadoHasta: '2026-10-04T18:00:00' }}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText(/bloqueo temporal por intentos fallidos/)).toBeInTheDocument()
  })

  it('muestra el error del servidor y permite reintentar', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('No puedes bloquear tu propia cuenta.'))
    render(<ConfirmarEstadoUsuarioModal user={activo} onCancel={vi.fn()} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }))
    expect(await screen.findByText('No puedes bloquear tu propia cuenta.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bloquear' })).toBeEnabled()
  })

  it('cancela con el botón y con Escape', () => {
    const onCancel = vi.fn()
    render(<ConfirmarEstadoUsuarioModal user={activo} onCancel={onCancel} onConfirm={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})
