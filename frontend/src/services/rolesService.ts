import api from './api'

/** Un rol con sus permisos (Configuración → Roles y permisos). */
export interface RolConPermisos {
  id: number
  nombre: string
  descripcion: string | null
  /** ADMIN, DOCENTE y CONTROL: siempre existen, no se borran y sus permisos no se editan. */
  delSistema: boolean
  permisos: string[]
  usuarios: number
}

export interface PermisoCatalogo {
  codigo: string
  modulo: string
  descripcion: string
  /** Solo del ADMIN: no se asigna a un rol extra. */
  soloAdmin: boolean
}

export interface GuardarRol {
  nombre?: string
  descripcion: string
  permisos: string[]
}

export async function listarRolesConPermisos(): Promise<RolConPermisos[]> {
  const { data } = await api.get<RolConPermisos[]>('/roles')
  return data
}

export async function listarPermisos(): Promise<PermisoCatalogo[]> {
  const { data } = await api.get<PermisoCatalogo[]>('/roles/permisos')
  return data
}

export async function crearRolConPermisos(rol: GuardarRol): Promise<RolConPermisos> {
  const { data } = await api.post<RolConPermisos>('/roles', rol)
  return data
}

export async function actualizarRol(id: number, rol: GuardarRol): Promise<RolConPermisos> {
  const { data } = await api.put<RolConPermisos>(`/roles/${id}`, rol)
  return data
}

export async function eliminarRol(id: number): Promise<void> {
  await api.delete(`/roles/${id}`)
}
