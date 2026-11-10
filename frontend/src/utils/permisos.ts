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
  | 'REPORTES_VER' | 'REPORTES_EXPORTAR' | 'NOTIFICACIONES_TODAS' | 'USUARIOS_GESTIONAR' | 'ROLES_GESTIONAR'

export const TODOS_LOS_PERMISOS: Permiso[] = [
  'EXAMENES_VER_TODOS', 'EXAMENES_VER_PROPIOS', 'EXAMENES_GESTIONAR_TODOS', 'EXAMENES_GESTIONAR_PROPIOS',
  'EXAMENES_CANCELAR', 'AMBIENTES_GESTIONAR', 'HABILITACION_VER', 'HABILITACION_GESTIONAR',
  'HABILITACION_GESTIONAR_PROPIOS',
  'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS', 'EXPULSAR_TODOS', 'EXPULSAR_PROPIOS',
  'ESTUDIANTES_VER', 'ESTUDIANTES_GESTIONAR', 'FOTOS_REPORTAR', 'FOTOS_REVISAR',
  'REPORTES_VER', 'REPORTES_EXPORTAR', 'NOTIFICACIONES_TODAS', 'USUARIOS_GESTIONAR', 'ROLES_GESTIONAR',
]

const POR_DEFECTO: Record<string, Permiso[]> = {
  // El DOCENTE descarga el acta y la asistencia de sus exámenes (el servidor limita a los suyos).
  DOCENTE: ['EXAMENES_VER_PROPIOS', 'EXAMENES_GESTIONAR_PROPIOS', 'HABILITACION_VER', 'HABILITACION_GESTIONAR_PROPIOS',
    'CONTROL_INGRESO_PROPIOS', 'EXPULSAR_PROPIOS', 'ESTUDIANTES_VER', 'FOTOS_REPORTAR', 'REPORTES_EXPORTAR'],
  // Desde la V53 el CONTROL recibe los avisos solo de los exámenes donde está asignado.
  CONTROL: ['EXAMENES_VER_TODOS', 'HABILITACION_VER', 'CONTROL_INGRESO_TODOS', 'ESTUDIANTES_VER', 'FOTOS_REPORTAR'],
  ESTUDIANTE: [],
}

/**
 * El ADMIN administra: todos los permisos menos programar exámenes (los registra cada DOCENTE) y registrar el
 * control de ingreso (lo hace el CONTROL); el control lo supervisa con REPORTES_VER. Como Permisos.delAdmin.
 */
const NO_DEL_ADMIN: Permiso[] = ['EXAMENES_GESTIONAR_PROPIOS', 'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS']
const DEL_ADMIN: Permiso[] = TODOS_LOS_PERMISOS.filter((p) => !NO_DEL_ADMIN.includes(p))

export function permisosDeRoles(roles: string[]): Set<string> {
  return new Set(roles.flatMap((r) => (r === 'ADMIN' ? DEL_ADMIN : POR_DEFECTO[r] ?? [])))
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

/** Registra el control de ingreso (escanear, autorizar, intentos, excepciones). */
export function registraControl(sesion: SesionConPermisos): boolean {
  return tienePermiso(sesion, 'CONTROL_INGRESO_TODOS', 'CONTROL_INGRESO_PROPIOS')
}

/** Ve el control de un examen (panel, listas, información de ingreso): quien lo registra o quien supervisa (ADMIN). */
export function veControl(sesion: SesionConPermisos): boolean {
  return registraControl(sesion) || tienePermiso(sesion, 'REPORTES_VER')
}

/** Solo sus propios exámenes como docente (no puede ver ni gestionar los de otros). */
export function gestionaSoloPropios(sesion: SesionConPermisos): boolean {
  return tienePermiso(sesion, 'EXAMENES_GESTIONAR_PROPIOS') && !tienePermiso(sesion, 'EXAMENES_GESTIONAR_TODOS')
}
