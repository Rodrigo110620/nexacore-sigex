/**
 * Permisos de SIGEX (los mismos que backend/.../security/Permiso.java). El servidor los manda al iniciar
 * sesión según los roles del usuario; si una sesión vieja no los tiene, se calculan con los roles del
 * sistema, que tienen permisos fijos (igual que Permisos.POR_DEFECTO del backend).
 */
export type Permiso =
  | 'EXAMENES_VER_TODOS' | 'EXAMENES_VER_PROPIOS' | 'EXAMENES_GESTIONAR_TODOS' | 'EXAMENES_GESTIONAR_PROPIOS'
  | 'EXAMENES_CANCELAR' | 'AMBIENTES_GESTIONAR' | 'HABILITACION_VER' | 'HABILITACION_GESTIONAR'
  | 'HABILITACION_GESTIONAR_PROPIOS'
  | 'CONTROL_INGRESO_TODOS' | 'CONTROL_INGRESO_PROPIOS' | 'EXPULSAR_TODOS' | 'EXPULSAR_PROPIOS'
  | 'ESTUDIANTES_VER' | 'ESTUDIANTES_GESTIONAR' | 'FOTOS_REPORTAR' | 'FOTOS_REVISAR'
  | 'REPORTES_VER' | 'NOTIFICACIONES_TODAS' | 'USUARIOS_GESTIONAR' | 'ROLES_GESTIONAR'

export const TODOS_LOS_PERMISOS: Permiso[] = [
  'EXAMENES_VER_TODOS', 'EXAMENES_VER_PROPIOS', 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS',
  'EXAMENES_CANCELAR', 'AMBIENTES_GESTIONAR', 'HABILITACION_VER', 'HABILITACION_GESTIONAR',
  'HABILITACION_GESTIONAR_PROPIOS',
  'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS', 'EXPULSAR_TODOS', 'EXPULSAR_PROPIOS',
  'ESTUDIANTES_VER', 'ESTUDIANTES_GESTIONAR', 'FOTOS_REPORTAR', 'FOTOS_REVISAR',
  'REPORTES_VER', 'NOTIFICACIONES_TODAS', 'USUARIOS_GESTIONAR', 'ROLES_GESTIONAR',
]

const POR_DEFECTO: Record<string, Permiso[]> = {
  DOCENTE: ['EXAMENES_VER_PROPIOS', 'EXAMENES_GESTIONAR_PROPIOS', 'HABILITACION_VER', 'HABILITACION_GESTIONAR_PROPIOS',
    'CONTROL_INGRESO_PROPIOS', 'EXPULSAR_PROPIOS', 'ESTUDIANTES_VER', 'FOTOS_REPORTAR'],
  CONTROL: ['EXAMENES_VER_TODOS', 'HABILITACION_VER', 'CONTROL_INGRESO_TODOS', 'ESTUDIANTES_VER', 'FOTOS_REPORTAR',
    'NOTIFICACIONES_TODAS'],
  ESTUDIANTE: [],
}

export function permisosDeRoles(roles: string[]): Set<string> {
  if (roles.includes('ADMIN')) return new Set(TODOS_LOS_PERMISOS)
  return new Set(roles.flatMap((r) => POR_DEFECTO[r] ?? []))
}

/** Lo que da useAuth(): con los permisos del servidor si los hay; si no, calculados con los roles. */
export interface SesionConPermisos {
  roles?: string[]
  permisos?: string[] | null
}

/** true si tiene al menos uno de los permisos. */
export function tienePermiso(sesion: SesionConPermisos, ...permisos: Permiso[]): boolean {
  const suyos = sesion.permisos ? new Set(sesion.permisos) : permisosDeRoles(sesion.roles ?? [])
  return permisos.some((p) => suyos.has(p))
}

/** Solo sus propios exámenes como docente (no puede ver ni gestionar los de otros). */
export function gestionaSoloPropios(sesion: SesionConPermisos): boolean {
  return tienePermiso(sesion, 'EXAMENES_GESTIONAR_PROPIOS') && !tienePermiso(sesion, 'EXAMENES_GESTIONAR_TODOS')
}
