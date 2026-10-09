import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ImportarUsuariosModal from '../components/users/ImportarUsuariosModal'
import { importarUsuarios } from '../services/userService'

vi.mock('../services/userService', () => ({
  importarUsuarios: vi.fn(),
  descargarPlantillaUsuarios: vi.fn(),
}))
vi.mock('../hooks/useRoles', () => ({
  useRoles: () => ({ roles: [{ value: 'ADMIN' }, { value: 'DOCENTE' }, { value: 'CONTROL' }], cargando: false }),
}))

const mockedImportar = vi.mocked(importarUsuarios)

function elegirArchivo(nombre: string, contenido = 'nombre,apellidos,ci,email,rol\n') {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [new File([contenido], nombre, { type: 'text/csv' })] } })
}

describe('ImportarUsuariosModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra las columnas requeridas y los roles válidos', () => {
    render(<ImportarUsuariosModal open onClose={vi.fn()} onImported={vi.fn()} />)

    expect(screen.getByText('nombre, apellidos, ci, email, rol')).toBeInTheDocument()
    expect(screen.getByText('ADMIN, DOCENTE, CONTROL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled()
  })

  it('rechaza archivos que no son CSV sin llamar al servidor', () => {
    render(<ImportarUsuariosModal open onClose={vi.fn()} onImported={vi.fn()} />)

    elegirArchivo('usuarios.xlsx')
    expect(screen.getByRole('alert')).toHaveTextContent('formato CSV')
    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled()
  })

  it('importa y muestra registrados, no importados y el motivo de cada fila', async () => {
    mockedImportar.mockResolvedValue({ insertados: 2, ignorados: 1, errores: ['Fila 4: El email ya esta registrado'] })
    const onImported = vi.fn()
    render(<ImportarUsuariosModal open onClose={vi.fn()} onImported={onImported} />)

    elegirArchivo('usuarios.csv')
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }))

    expect(await screen.findByText('Registrados')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Fila 4: El email ya esta registrado')).toBeInTheDocument()
    expect(screen.getByText(/recibió su contraseña temporal por correo/)).toBeInTheDocument()
    expect(onImported).toHaveBeenCalledWith({ insertados: 2, ignorados: 1, errores: ['Fila 4: El email ya esta registrado'] })
  })

  it('muestra el mensaje del servidor si el archivo es rechazado', async () => {
    mockedImportar.mockRejectedValue(
      Object.assign(new Error('400'), { isAxiosError: true, response: { data: { mensaje: 'Faltan columnas en el CSV: rol.' } } }),
    )
    render(<ImportarUsuariosModal open onClose={vi.fn()} onImported={vi.fn()} />)

    elegirArchivo('usuarios.csv')
    fireEvent.click(screen.getByRole('button', { name: 'Importar' }))

    expect(await screen.findByText('Faltan columnas en el CSV: rol.')).toBeInTheDocument()
  })
})
