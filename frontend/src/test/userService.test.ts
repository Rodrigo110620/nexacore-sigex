import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cambiarEstadoUsuario, exportarUsuarios, getUsers, importarUsuarios } from '../services/userService'
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

describe('userService — exportar y cambiar estado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exporta pidiendo un blob con solo los filtros que tienen valor', async () => {
    mockedApi.get = vi.fn().mockResolvedValue({ data: new Blob(['id;nombre']) })
    const createObjectURL = vi.fn(() => 'blob:usuarios')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await exportarUsuarios({ search: '  ana ', rol: '', estado: 'activo' })

    expect(mockedApi.get).toHaveBeenCalledWith('/usuarios/exportar.csv', {
      params: { search: 'ana', estado: 'activo' },
      responseType: 'blob',
    })
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:usuarios')
    click.mockRestore()
    vi.unstubAllGlobals()
  })

  it('importa enviando el archivo como multipart con un timeout amplio', async () => {
    mockedApi.post = vi.fn().mockResolvedValue({ data: { insertados: 1, ignorados: 0, errores: [] } })
    const archivo = new File(['nombre,apellidos,ci,email,rol\n'], 'usuarios.csv', { type: 'text/csv' })

    const resultado = await importarUsuarios(archivo)

    const [url, cuerpo, config] = vi.mocked(mockedApi.post).mock.calls[0]
    expect(url).toBe('/usuarios/importar')
    expect((cuerpo as FormData).get('file')).toBe(archivo)
    expect(config).toMatchObject({ headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 })
    expect(resultado.insertados).toBe(1)
  })

  it('cambia el estado con PATCH /usuarios/{id}/estado', async () => {
    mockedApi.patch = vi.fn().mockResolvedValue({ data: { ...responseData.contenido[0], estado: 'inactivo' } })

    const usuario = await cambiarEstadoUsuario(1, false)

    expect(mockedApi.patch).toHaveBeenCalledWith('/usuarios/1/estado', { activo: false })
    expect(usuario.estado).toBe('inactivo')
  })
})
