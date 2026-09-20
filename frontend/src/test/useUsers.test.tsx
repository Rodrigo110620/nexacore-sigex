import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import useUsers from '../hooks/useUsers'
import { getUsers } from '../services/userService'
import type { UserFilterParams } from '../types/user'
import type { UserListPage } from '../types/userApi'

vi.mock('../services/userService')
const mockedGetUsers = vi.mocked(getUsers)

const response = (id: number, page = 0): UserListPage => ({
  contenido: [{
    id,
    nombre: `Ana ${id}`,
    apellidos: 'Martínez',
    email: `ana${id}@universidad.edu`,
    ci: `${id}000`,
    rol: 'ADMIN',
    estado: 'activo',
  }],
  pagina: page,
  tamano: 5,
  totalRegistros: 1,
  totalPaginas: 1,
})

const emptyFilters: UserFilterParams = { search: '', rol: '', estado: '' }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('carga inicialmente con page 0, size 5 y guarda la respuesta', async () => {
    mockedGetUsers.mockResolvedValue(response(1))
    const { result } = renderHook(() => useUsers())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockedGetUsers).toHaveBeenCalledWith({ page: 0, size: 5, ...emptyFilters }, expect.any(AbortSignal))
    expect(result.current.data).toEqual(response(1))
    expect(result.current.users).toEqual(response(1).contenido)
    expect(result.current.error).toBeNull()
  })

  it('actualiza filtros, reinicia página y combina los tres campos', async () => {
    mockedGetUsers.mockResolvedValue(response(1))
    const { result } = renderHook(() => useUsers())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.changePage(3))
    await waitFor(() => expect(result.current.page).toBe(3))
    act(() => result.current.updateFilters({ search: 'Ána', rol: 'DOCENTE', estado: 'activo' }))
    await waitFor(() => expect(result.current.page).toBe(0))

    expect(mockedGetUsers).toHaveBeenLastCalledWith({
      page: 0,
      size: 5,
      search: 'Ána',
      rol: 'DOCENTE',
      estado: 'activo',
    }, expect.any(AbortSignal))
  })

  it('cambia página base 0, normaliza negativos y evita duplicados', async () => {
    mockedGetUsers.mockResolvedValue(response(1))
    const { result } = renderHook(() => useUsers())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.changePage(2))
    await waitFor(() => expect(result.current.page).toBe(2))
    expect(mockedGetUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.any(AbortSignal))
    const callsAfterPageTwo = mockedGetUsers.mock.calls.length

    act(() => result.current.changePage(2))
    await act(async () => {
      await Promise.resolve()
    })
    expect(mockedGetUsers).toHaveBeenCalledTimes(callsAfterPageTwo)

    act(() => result.current.changePage(-4))
    await waitFor(() => expect(mockedGetUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 }), expect.any(AbortSignal)))
  })

  it('aborta la petición anterior y conserva los datos de la segunda', async () => {
    const first = deferred<UserListPage>()
    const second = deferred<UserListPage>()
    mockedGetUsers.mockImplementationOnce((_params, signal) => {
      expect(signal).toBeInstanceOf(AbortSignal)
      return first.promise
    }).mockImplementationOnce((_params, signal) => {
      expect(signal).toBeInstanceOf(AbortSignal)
      return second.promise
    })
    const { result } = renderHook(() => useUsers())
    const firstSignal = mockedGetUsers.mock.calls[0][1] as AbortSignal

    act(() => result.current.updateFilters({ search: 'nuevo', rol: '', estado: '' }))
    await waitFor(() => expect(mockedGetUsers).toHaveBeenCalledTimes(2))
    expect(firstSignal.aborted).toBe(true)
    second.resolve(response(2))
    await waitFor(() => expect(result.current.users[0]?.id).toBe(2))
  })

  it('no permite que una respuesta antigua reemplace la nueva aunque ignore abort', async () => {
    const first = deferred<UserListPage>()
    const second = deferred<UserListPage>()
    mockedGetUsers.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise)
    const { result } = renderHook(() => useUsers())

    act(() => result.current.updateFilters({ search: 'nuevo', rol: '', estado: '' }))
    await waitFor(() => expect(mockedGetUsers).toHaveBeenCalledTimes(2))
    second.resolve(response(2))
    await waitFor(() => expect(result.current.users[0]?.id).toBe(2))
    first.resolve(response(1))
    await new Promise<void>((resolve) => queueMicrotask(resolve))
    expect(result.current.users[0]?.id).toBe(2)
  })

  it('aborta la petición al desmontarse', async () => {
    const pending = deferred<UserListPage>()
    mockedGetUsers.mockReturnValue(pending.promise)
    const { unmount } = renderHook(() => useUsers())
    const signal = mockedGetUsers.mock.calls[0][1] as AbortSignal

    unmount()
    expect(signal.aborted).toBe(true)
  })

  it('clasifica 403 con el mensaje del backend', async () => {
    mockedGetUsers.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { mensaje: 'Acceso restringido' } },
    })
    const { result } = renderHook(() => useUsers())

    await waitFor(() => expect(result.current.error).toEqual({ kind: 'forbidden', message: 'Acceso restringido' }))
  })

  it('clasifica 401 como sesión expirada', async () => {
    mockedGetUsers.mockRejectedValue({ isAxiosError: true, response: { status: 401 } })
    const { result } = renderHook(() => useUsers())

    await waitFor(() => expect(result.current.error).toEqual({
      kind: 'unauthorized',
      message: 'Tu sesión expiró. Ingresa nuevamente para continuar.',
    }))
  })

  it('usa el mensaje alternativo para 403 sin mensaje válido', async () => {
    mockedGetUsers.mockRejectedValue({ isAxiosError: true, response: { status: 403, data: {} } })
    const { result } = renderHook(() => useUsers())

    await waitFor(() => expect(result.current.error).toEqual({
      kind: 'forbidden',
      message: 'No tienes permisos para consultar los usuarios.',
    }))
  })

  it('clasifica un error Axios sin response como network', async () => {
    mockedGetUsers.mockRejectedValue(axios.AxiosError.from(new Error('offline')))
    const { result } = renderHook(() => useUsers())

    await waitFor(() => expect(result.current.error).toEqual({
      kind: 'network',
      message: 'No se pudo conectar con el servidor.',
    }))
  })

  it('clasifica un error normal como unknown', async () => {
    mockedGetUsers.mockRejectedValue(new Error('fallo'))
    const { result } = renderHook(() => useUsers())

    await waitFor(() => expect(result.current.error).toEqual({
      kind: 'unknown',
      message: 'No se pudo cargar la lista de usuarios.',
    }))
  })

  it('reintenta la consulta actual sin modificar filtros ni página', async () => {
    mockedGetUsers.mockRejectedValueOnce(new Error('fallo')).mockResolvedValueOnce(response(2))
    const { result } = renderHook(() => useUsers())
    await waitFor(() => expect(result.current.error?.kind).toBe('unknown'))

    act(() => result.current.retry())
    await waitFor(() => expect(result.current.users[0]?.id).toBe(2))
    expect(mockedGetUsers.mock.calls[1][0]).toEqual({ page: 0, size: 5, ...emptyFilters })
  })

  it('ignora una petición cancelada sin mostrar error', async () => {
    mockedGetUsers.mockRejectedValue(new axios.CanceledError('cancelled'))
    const { result } = renderHook(() => useUsers())

    await act(async () => {
      await new Promise<void>((resolve) => queueMicrotask(resolve))
    })
    expect(result.current.error).toBeNull()
  })
})
