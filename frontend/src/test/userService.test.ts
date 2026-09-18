import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUsers } from '../services/userService'
import api from '../services/api'
import type { UserListPage } from '../types/userApi'

vi.mock('../services/api')
const mockedApi = vi.mocked(api)

const responseData: UserListPage = {
  contenido: [
    {
      id: 1,
      nombre: 'Ana',
      apellidos: 'Martínez',
      email: 'ana@universidad.edu',
      ci: '1000',
      rol: 'ADMIN',
      estado: 'activo',
    },
  ],
  pagina: 0,
  tamano: 10,
  totalRegistros: 1,
  totalPaginas: 1,
}

describe('userService — getUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envía el contrato completo y devuelve response.data sin transformar', async () => {
    mockedApi.get = vi.fn().mockResolvedValue({ data: responseData })
    const controller = new AbortController()

    const result = await getUsers({
      page: 1,
      size: 20,
      search: 'Ána',
      rol: 'DOCENTE',
      estado: 'activo',
    }, controller.signal)

    expect(result).toBe(responseData)
    expect(mockedApi.get).toHaveBeenCalledWith('/usuarios', {
      params: {
        page: 1,
        size: 20,
        search: 'Ána',
        rol: 'DOCENTE',
        estado: 'activo',
      },
      signal: controller.signal,
    })
  })

  it('envía page y size predeterminados sin filtros', async () => {
    mockedApi.get = vi.fn().mockResolvedValue({ data: responseData })

    await getUsers()

    expect(mockedApi.get).toHaveBeenCalledWith('/usuarios', {
      params: {
        page: 0,
        size: 10,
      },
      signal: undefined,
    })
  })

  it('omite filtros vacíos o compuestos solo por espacios', async () => {
    mockedApi.get = vi.fn().mockResolvedValue({ data: responseData })

    await getUsers({ search: '   ', rol: '', estado: '' })

    expect(mockedApi.get).toHaveBeenCalledWith('/usuarios', {
      params: {
        page: 0,
        size: 10,
      },
      signal: undefined,
    })
  })

  it('aplica trim a search sin normalizar acentos ni mayúsculas', async () => {
    mockedApi.get = vi.fn().mockResolvedValue({ data: responseData })

    await getUsers({ search: '  Ána Pérez  ' })

    expect(mockedApi.get).toHaveBeenCalledWith('/usuarios', {
      params: {
        page: 0,
        size: 10,
        search: 'Ána Pérez',
      },
      signal: undefined,
    })
  })

  it('propaga exactamente el error del cliente API', async () => {
    const error = new Error('fallo de red')
    mockedApi.get = vi.fn().mockRejectedValue(error)

    await expect(getUsers()).rejects.toBe(error)
  })

  it('pasa la misma señal de cancelación a Axios', async () => {
    mockedApi.get = vi.fn().mockResolvedValue({ data: responseData })
    const controller = new AbortController()

    await getUsers(undefined, controller.signal)

    expect(mockedApi.get).toHaveBeenCalledWith('/usuarios', {
      params: {
        page: 0,
        size: 10,
      },
      signal: controller.signal,
    })
  })
})