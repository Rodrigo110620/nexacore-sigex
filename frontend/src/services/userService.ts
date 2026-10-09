import api from './api'
import type { UserListItem } from '../types/user'
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

/** Descarga en CSV los usuarios que cumplen la búsqueda y los filtros actuales del listado. */
export async function exportarUsuarios(params: Pick<UserListParams, 'search' | 'rol' | 'estado'> = {}): Promise<void> {
  const requestParams: Record<string, string> = {}
  const search = params.search?.trim()
  if (search) requestParams.search = search
  if (params.rol) requestParams.rol = params.rol
  if (params.estado) requestParams.estado = params.estado

  const { data } = await api.get<Blob>('/usuarios/exportar.csv', { params: requestParams, responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = 'usuarios.csv'
  link.click()
  URL.revokeObjectURL(url)
}

/** Bloquea (activo=false) o desbloquea (activo=true) a un usuario; desbloquear también levanta el bloqueo temporal. */
export async function cambiarEstadoUsuario(id: number, activo: boolean): Promise<UserListItem> {
  const { data } = await api.patch<UserListItem>(`/usuarios/${id}/estado`, { activo })
  return data
}

export interface ImportarUsuariosResponse {
  insertados: number
  ignorados: number
  errores: string[]
}

/** Registra usuarios desde un CSV; cada uno recibe su contraseña temporal por correo. */
export async function importarUsuarios(file: File): Promise<ImportarUsuariosResponse> {
  const formData = new FormData()
  formData.append('file', file)
  // api usa application/json por defecto; sin esto axios convertiría el FormData a JSON.
  const { data } = await api.post<ImportarUsuariosResponse>('/usuarios/importar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Cada fila se guarda en su propia transacción y envía un correo: tarda más que los 12 s por defecto.
    timeout: 5 * 60 * 1000,
  })
  return data
}

/** Plantilla vacía con las columnas de la importación y una fila de ejemplo. */
export function descargarPlantillaUsuarios(): void {
  const contenido = '\uFEFFnombre;apellidos;ci;email;rol;estado\nAna;Rojas Vidal;6512340;ana.rojas@est.umss.edu;CONTROL;activo\n'
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'plantilla_usuarios.csv'
  link.click()
  URL.revokeObjectURL(url)
}
