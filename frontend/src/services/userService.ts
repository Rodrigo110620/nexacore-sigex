import api from './api'
import type { UserListPage, UserListParams } from '../types/userApi'

export async function getUsers(
  params: UserListParams = {},
  signal?: AbortSignal,
): Promise<UserListPage> {
  const requestParams: Record<string, number | string> = {
    page: params.page ?? 0,
    size: params.size ?? 10,
  }

  const search = params.search?.trim()
  if (search) requestParams.search = search
  if (params.rol) requestParams.rol = params.rol
  if (params.estado) requestParams.estado = params.estado

  const response = await api.get<UserListPage>('/usuarios', {
    params: requestParams,
    signal,
  })

  return response.data
}